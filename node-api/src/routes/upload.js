const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { extractFaces } = require("../services/python");
const { bot } = require("../bot");
const { getUploadPage, getErrorPage } = require("./upload-html");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const uploadSessions = new Map();

function createSession(chatId, userId, eventId, eventName) {
  const token = uuidv4().slice(0, 8);
  uploadSessions.set(token, {
    chatId,
    userId,
    eventId,
    eventName,
    fileIds: [],
    createdAt: Date.now(),
  });
  setTimeout(() => uploadSessions.delete(token), 30 * 60 * 1000);
  return token;
}

router.get("/:token", (req, res) => {
  const session = uploadSessions.get(req.params.token);
  if (!session) {
    return res.status(404).send(getErrorPage());
  }
  res.send(getUploadPage(session.eventName, req.params.token));
});

router.post("/:token", upload.single("image"), async (req, res) => {
  const session = uploadSessions.get(req.params.token);
  if (!session) {
    return res.status(404).json({ error: "Session expired" });
  }

  try {
    const imageBuffer = req.file.buffer;
    const filename = "web_" + Date.now() + "_" + uuidv4().slice(0, 8) + ".jpg";
    const filepath = path.join(__dirname, "..", "..", "uploads", filename);

    fs.writeFileSync(filepath, imageBuffer);

    const faceData = await extractFaces(imageBuffer);

    const photoResult = await pool.query(
      `INSERT INTO photos (event_id, telegram_file_id, faces_count, processed)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [session.eventId, "local::" + filename, faceData.faces.length]
    );

    const photoId = photoResult.rows[0].id;

    for (const face of faceData.faces) {
      await pool.query(
        `INSERT INTO face_embeddings (photo_id, embedding, bbox) VALUES ($1, $2::vector, $3)`,
        [photoId, JSON.stringify(face.embedding), JSON.stringify(face.bbox)]
      );
    }

    session.fileIds.push(photoId);
    res.json({ success: true, photoId, faces: faceData.faces.length });
  } catch (error) {
    console.error("Web upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:token/done", async (req, res) => {
  const session = uploadSessions.get(req.params.token);
  if (!session) {
    return res.status(404).json({ error: "Session expired" });
  }

  try {
    const count = session.fileIds.length;
    await bot.telegram.sendMessage(
      session.chatId,
      `✅ Upload complete! ${count} photos added to "${session.eventName}".`
    );

    const svc = require("../bot/services");
    svc.notifyRegisteredUsersOfNewPhotos(session.eventId, session.fileIds).catch(e =>
      console.error("Upload notification error:", e)
    );

    uploadSessions.delete(req.params.token);
    res.json({ success: true, count });
  } catch (error) {
    console.error("Done notification error:", error);
    uploadSessions.delete(req.params.token);
    res.json({ success: true, count: session.fileIds.length });
  }
});

module.exports = { router, createSession };
