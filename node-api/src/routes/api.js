const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const pool = require("../db");
const { extractFaces } = require("../services/python");
const { bot } = require("../bot");
const { searchResults, nextId } = require("../services/search-store");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function validateWebApp(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const checkStr = sorted.map(([k, v]) => `${k}=${v}`).join("\n");

    const secret = crypto.createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN).digest();
    const computed = crypto.createHmac("sha256", secret).update(checkStr).digest("hex");

    return computed === hash;
  } catch {
    return false;
  }
}

function getUserFromInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));
    return user;
  } catch {
    return null;
  }
}

router.post("/selfie", upload.single("selfie"), async (req, res) => {
  try {
    const buffer = req.file.buffer;
    const faceData = await extractFaces(buffer);

    if (!faceData.faces || faceData.faces.length === 0) {
      return res.json({ success: false, error: "No face detected. Try a clearer photo." });
    }

    res.json({
      success: true,
      face: faceData.faces[0],
      facesCount: faceData.faces.length,
    });
  } catch (e) {
    console.error("Selfie upload error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/search", upload.single("selfie"), async (req, res) => {
  try {
    const telegramId = parseInt(req.body.telegram_id);
    const eventCode = req.body.event_code || null;
    const initData = req.headers["x-telegram-init-data"];

    if (initData && !validateWebApp(initData)) {
      return res.status(401).json({ error: "Invalid request origin" });
    }

    let eventId = null;
    let eventName = null;
    if (eventCode) {
      const event = await pool.query(`SELECT * FROM events WHERE code = $1`, [eventCode.toUpperCase()]);
      if (!event.rows.length) {
        return res.json({ success: false, error: "Event not found. Check the code." });
      }
      eventId = event.rows[0].id;
      eventName = event.rows[0].name;
    }

    const buffer = req.file.buffer;
    const faceData = await extractFaces(buffer);

    if (!faceData.faces || faceData.faces.length === 0) {
      return res.json({ success: false, error: "No face detected. Try a clearer photo." });
    }

    const embedding = faceData.faces[0].embedding;
    const svc = require("../bot/services");
    const results = await svc.searchPhotos(embedding, eventId, 500);

    const count = results.length;

    if (count === 0) {
      return res.json({ success: true, count: 0, token: null, events: [] });
    }

    const token = `sr_${nextId()}`;
    searchResults.set(token, {
      results,
      telegramId,
      eventId,
      createdAt: Date.now(),
    });
    setTimeout(() => searchResults.delete(token), 10 * 60 * 1000);

    const eventIds = [...new Set(results.map((r) => r.event_id))];
    const eventRows = await pool.query(
      `SELECT id, name, code FROM events WHERE id = ANY($1)`,
      [eventIds]
    );
    const events = eventRows.rows.map((e) => ({
      id: e.id,
      name: e.name,
      code: e.code,
      count: results.filter((r) => r.event_id === e.id).length,
    }));

    res.json({
      success: true,
      count,
      token,
      events,
      eventName,
    });
  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/results/send", async (req, res) => {
  try {
    const { token } = req.body;

    const entry = searchResults.get(token);
    if (!entry) {
      return res.status(404).json({ error: "Search results expired. Search again." });
    }

    const { results, telegramId } = entry;
    const chatId = telegramId;

    searchResults.delete(token);

    const photoIds = results.map((p) => p.id);
    const svc = require("../bot/services");

    const grouped = {};
    for (const r of results) {
      if (!grouped[r.event_id]) grouped[r.event_id] = { name: "", photos: [] };
      grouped[r.event_id].photos.push(r);
    }
    const eventIds = Object.keys(grouped);
    const eventRows = await pool.query(
      `SELECT id, name FROM events WHERE id = ANY($1)`,
      [eventIds]
    );
    for (const e of eventRows.rows) {
      if (grouped[e.id]) grouped[e.id].name = e.name;
    }

    const eventSummary = Object.entries(grouped)
      .map(([, g]) => `• ${g.name || "Unknown"} (${g.photos.length} photos)`)
      .join("\n");

    const total = results.length;

    if (total > 20) {
      await bot.telegram.sendMessage(
        chatId,
        `🎉 We found ${total} photos of you!\n\n${eventSummary}\n\nTap below to receive them.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `📨 Receive ${total} Photos`, callback_data: `deliver_${token}` }],
            ],
          },
        }
      );

      searchResults.set(token, { results, telegramId, delivered: false, createdAt: Date.now() });
      setTimeout(() => {
        const e = searchResults.get(token);
        if (e && !e.delivered) searchResults.delete(token);
      }, 30 * 60 * 1000);

      return res.json({ success: true, sent: false, count: total, message: "Confirm in Telegram." });
    }

    await bot.telegram.sendMessage(chatId, `🎉 We found ${total} photos of you!\n\n${eventSummary}`);

    for (const photo of results.slice(0, 10)) {
      try {
        if (photo.telegram_file_id.startsWith("local::")) {
          const filename = photo.telegram_file_id.slice(7);
          const filepath = require("path").join(__dirname, "..", "..", "uploads", filename);
          await bot.telegram.sendPhoto(chatId, { source: filepath });
        } else {
          await bot.telegram.sendPhoto(chatId, photo.telegram_file_id);
        }
      } catch (e) {
        console.error("Failed to send photo:", e.message);
      }
    }

    if (total > 10) {
      await bot.telegram.sendMessage(chatId, `Showing 10 of ${total} photos.`);
    }

    await svc.markPhotosAsSeen(telegramId, photoIds);

    res.json({ success: true, sent: true, count: total });
  } catch (e) {
    console.error("Send results error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get("/events/:code", async (req, res) => {
  try {
    const event = await pool.query(
      `SELECT e.*, COUNT(p.id) AS photo_count
       FROM events e
       LEFT JOIN photos p ON p.event_id = e.id
       WHERE e.code = $1
       GROUP BY e.id`,
      [req.params.code.toUpperCase()]
    );
    if (!event.rows.length) return res.status(404).json({ error: "Event not found" });
    res.json(event.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/events", async (req, res) => {
  try {
    const telegramId = parseInt(req.query.telegram_id);
    if (!telegramId) return res.status(400).json({ error: "telegram_id required" });

    const events = await pool.query(
      `SELECT e.*, COUNT(p.id) AS photo_count
       FROM events e
       LEFT JOIN photos p ON p.event_id = e.id
       WHERE e.created_by = $1
       GROUP BY e.id ORDER BY e.created_at DESC`,
      [telegramId]
    );
    res.json(events.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/events/public/search", async (req, res) => {
  try {
    const search = req.query.q || "";
    const events = await pool.query(
      `SELECT e.*, COUNT(p.id) AS photo_count
       FROM events e
       LEFT JOIN photos p ON p.event_id = e.id
       WHERE e.visibility = 'public' AND (e.name ILIKE $1 OR e.code ILIKE $1)
       GROUP BY e.id ORDER BY e.created_at DESC LIMIT 20`,
      [`%${search}%`]
    );
    res.json(events.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const telegramId = parseInt(req.query.telegram_id);
    if (!telegramId) return res.status(400).json({ error: "telegram_id required" });

    const user = await pool.query(`SELECT * FROM users WHERE telegram_id = $1`, [telegramId]);
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(user.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/face/register", upload.single("selfie"), async (req, res) => {
  try {
    const telegramId = parseInt(req.body.telegram_id);
    const buffer = req.file.buffer;
    const faceData = await extractFaces(buffer);

    if (!faceData.faces || faceData.faces.length === 0) {
      return res.json({ success: false, error: "No face detected." });
    }

    const svc = require("../bot/services");
    await svc.registerFace(telegramId, faceData.faces[0].embedding);

    res.json({ success: true });
  } catch (e) {
    console.error("Face register error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
