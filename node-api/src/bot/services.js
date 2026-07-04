const pool = require("../db");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

async function getOrCreateUser(telegramId, username, firstName) {
  const existing = await pool.query(
    `SELECT * FROM users WHERE telegram_id = $1`,
    [telegramId]
  );
  if (existing.rows.length) return existing.rows[0];
  const r = await pool.query(
    `INSERT INTO users (telegram_id, username, first_name) VALUES ($1, $2, $3) RETURNING *`,
    [telegramId, username, firstName]
  );
  return r.rows[0];
}

async function generateEventCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
    const exist = await pool.query(`SELECT id FROM events WHERE code = $1`, [code]);
    if (!exist.rows.length) return code;
  }
  return Date.now().toString(36).toUpperCase().slice(0, 5);
}

async function createEvent(name, code, createdBy, visibility = "public") {
  const r = await pool.query(
    `INSERT INTO events (name, code, created_by, visibility) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, code, createdBy, visibility]
  );
  return r.rows[0];
}

async function savePhoto(eventId, fileId, fileUniqueId) {
  const r = await pool.query(
    `INSERT INTO photos (event_id, telegram_file_id, telegram_file_unique_id) VALUES ($1, $2, $3) RETURNING id`,
    [eventId, fileId, fileUniqueId]
  );
  return r.rows[0];
}

async function saveFaceEmbedding(photoId, embedding, bbox) {
  await pool.query(
    `INSERT INTO face_embeddings (photo_id, embedding, bbox) VALUES ($1, $2::vector, $3)`,
    [photoId, JSON.stringify(embedding), JSON.stringify(bbox)]
  );
}

async function downloadFromTelegram(fileId) {
  const token = process.env.BOT_TOKEN;
  const fileRes = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const filePath = fileRes.data.result.file_path;
  const dl = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    responseType: "arraybuffer",
  });
  return Buffer.from(dl.data);
}

async function extractFaces(buffer) {
  const form = new FormData();
  form.append("file", buffer, { filename: "image.jpg" });
  const res = await axios.post(`${process.env.PYTHON_API}/extract`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });
  return res.data;
}

async function processPhoto(fileId, eventId) {
  const buffer = await downloadFromTelegram(fileId);
  const faceData = await extractFaces(buffer);
  const photo = await savePhoto(eventId, fileId, null);
  if (faceData.faces && faceData.faces.length > 0) {
    for (const face of faceData.faces) {
      await saveFaceEmbedding(photo.id, face.embedding, face.bbox);
    }
    await pool.query(`UPDATE photos SET faces_count = $1 WHERE id = $2`, [
      faceData.faces.length,
      photo.id,
    ]);
  }
  await pool.query(`UPDATE photos SET processed = true WHERE id = $1`, [photo.id]);
  return { photoId: photo.id, facesCount: faceData.faces?.length || 0 };
}

async function searchPhotos(embedding, eventId = null, limit = 10) {
  let query = `
    SELECT DISTINCT ON (p.id) p.id, p.telegram_file_id, p.event_id, p.created_at,
      1 - (fe.embedding <=> $1::vector) AS similarity
    FROM face_embeddings fe
    JOIN photos p ON p.id = fe.photo_id
  `;
  const params = [JSON.stringify(embedding)];
  if (eventId) {
    query += ` WHERE p.event_id = $2`;
    params.push(eventId);
  } else {
    query += ` JOIN events e ON e.id = p.event_id WHERE e.visibility = 'public'`;
  }
  query += ` AND (1 - (fe.embedding <=> $1::vector)) > 0.5`;
  query += ` ORDER BY p.id, similarity DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  const r = await pool.query(query, params);
  return r.rows;
}

async function searchByRegisteredFace(telegramId, limit = 10) {
  const reg = await pool.query(
    `SELECT embedding FROM face_registrations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [telegramId]
  );
  if (!reg.rows.length) return null;
  return searchPhotos(reg.rows[0].embedding, null, limit);
}

async function registerFace(telegramId, embedding) {
  await pool.query(`DELETE FROM face_registrations WHERE user_id = $1`, [telegramId]);
  await pool.query(
    `INSERT INTO face_registrations (user_id, embedding) VALUES ($1, $2::vector)`,
    [telegramId, JSON.stringify(embedding)]
  );
  await pool.query(`UPDATE users SET registered_face = true WHERE telegram_id = $1`, [telegramId]);
}

async function getUserEvents(telegramId) {
  const r = await pool.query(
    `SELECT e.id, e.name, e.code, COUNT(p.id) AS photo_count
     FROM events e
     JOIN photos p ON p.event_id = e.id
     WHERE e.created_by = $1
     GROUP BY e.id ORDER BY e.created_at DESC`,
    [telegramId]
  );
  return r.rows;
}

async function markPhotosAsSeen(telegramId, photoIds) {
  if (!photoIds.length) return;
  const values = photoIds.map((pid, i) => `($1, $${i + 2})`).join(", ");
  const params = [telegramId, ...photoIds];
  await pool.query(
    `INSERT INTO user_photo_views (user_id, photo_id) VALUES ${values} ON CONFLICT DO NOTHING`,
    params
  );
}

async function getNewPhotos(telegramId, embedding, eventId = null) {
  const all = await searchPhotos(embedding, eventId, 50);
  if (!all.length) return { photos: [], newCount: 0 };
  const photoIds = all.map((p) => p.id);
  const viewed = await pool.query(
    `SELECT photo_id FROM user_photo_views WHERE user_id = $1 AND photo_id = ANY($2::uuid[])`,
    [telegramId, photoIds]
  );
  const viewedSet = new Set(viewed.rows.map((v) => v.photo_id));
  const newPhotos = all.filter((p) => !viewedSet.has(p.id));
  return { photos: all, newPhotos, newCount: newPhotos.length };
}

async function getEventByCode(code) {
  const r = await pool.query(`SELECT * FROM events WHERE code = $1`, [code]);
  return r.rows[0] || null;
}

async function getEventById(id) {
  const r = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

async function notifyRegisteredUsersOfNewPhotos(eventId, newPhotoIds) {
  if (!newPhotoIds || !newPhotoIds.length) return;

  const matches = await pool.query(`
    SELECT DISTINCT fr.user_id, COUNT(*)::int AS match_count
    FROM face_embeddings fe
    JOIN face_registrations fr ON 1 - (fe.embedding <=> fr.embedding) > 0.5
    WHERE fe.photo_id = ANY($1::uuid[])
    GROUP BY fr.user_id
  `, [newPhotoIds]);

  if (!matches.rows.length) return;

  const event = await getEventById(eventId);
  const eventName = event ? event.name : "an event";

  const { bot } = require("../bot");

  for (const row of matches.rows) {
    try {
      const msg = `🔔 New photos in "${eventName}"!\n\nYou appear in ${row.match_count} new photos.\n\nOpen Yena Photo to find them.`;
      const base = process.env.BASE_URL;
      if (base) {
        await bot.telegram.sendMessage(row.user_id, msg, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Open Yena Photo", url: base + "/app" }],
            ],
          },
        });
      } else {
        await bot.telegram.sendMessage(row.user_id, msg);
      }
    } catch (e) {
      console.error("Notify error for user", row.user_id, e.message);
    }
  }
}

module.exports = {
  getOrCreateUser,
  generateEventCode,
  createEvent,
  savePhoto,
  saveFaceEmbedding,
  downloadFromTelegram,
  extractFaces,
  processPhoto,
  searchPhotos,
  searchByRegisteredFace,
  registerFace,
  getUserEvents,
  markPhotosAsSeen,
  getNewPhotos,
  getEventByCode,
  getEventById,
  notifyRegisteredUsersOfNewPhotos,
};
