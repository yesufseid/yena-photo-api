const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const pool = require("../db");
const { extractFaces } = require("../services/python");
const { bot } = require("../bot");
const { searchResults, nextId } = require("../services/search-store");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getUserFromInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));
    return user;
  } catch {
    return null;
  }
}

router.post("/search", upload.single("selfie"), async (req, res) => {
  try {
    const telegramId = parseInt(req.body.telegram_id);
    const initData = req.headers["x-telegram-init-data"];

    let userId = telegramId;
    if (!userId && initData) {
      const tgUser = getUserFromInitData(initData);
      if (tgUser) userId = tgUser.id;
    }

    if (!userId) {
      return res.status(400).json({ error: "telegram_id required" });
    }

    const buffer = req.file.buffer;
    const faceData = await extractFaces(buffer);

    if (!faceData.faces || faceData.faces.length === 0) {
      return res.json({ success: false, error: "No face detected. Try a clearer photo." });
    }

    const embedding = faceData.faces[0].embedding;
    const svc = require("../bot/services");
    const results = await svc.searchPhotos(embedding, null, 500);

    const count = results.length;

    if (count === 0) {
      return res.json({ success: true, count: 0, token: null, groups: [] });
    }

    const groups = {};
    for (const r of results) {
      const d = new Date(r.created_at);
      const dateKey = d.toISOString().split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = { date: dateKey, count: 0, results: [] };
      groups[dateKey].count++;
      groups[dateKey].results.push(r);
    }

    const groupsArr = Object.values(groups).map((g) => ({
      date: g.date,
      count: g.count,
    }));

    const token = `sr_${nextId()}`;
    searchResults.set(token, {
      results,
      groups: groupsArr,
      groupData: groups,
      telegramId: userId,
      createdAt: Date.now(),
    });
    setTimeout(() => searchResults.delete(token), 10 * 60 * 1000);

    res.json({
      success: true,
      count,
      token,
      groups: groupsArr,
    });
  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/results/send", async (req, res) => {
  try {
    const { token, date } = req.body;

    const entry = searchResults.get(token);
    if (!entry) {
      return res.status(404).json({ error: "Search results expired. Search again." });
    }

    const { groupData, telegramId } = entry;

    let photosToSend;
    if (date && groupData[date]) {
      photosToSend = groupData[date].results;
    } else {
      photosToSend = entry.results;
    }

    const total = photosToSend.length;
    const chatId = telegramId;

    const dateLabel = date || "all";
    const eventSummary = date
      ? `📅 ${date} (${total} photos)`
      : `📸 ${total} photos found`;

    await bot.telegram.sendMessage(
      chatId,
      `🎉 Here are your photos!\n\n${eventSummary}`
    );

    let sent = 0;
    for (const photo of photosToSend.slice(0, 10)) {
      try {
        if (photo.telegram_file_id.startsWith("local::")) {
          const filename = photo.telegram_file_id.slice(7);
          const filepath = require("path").join(__dirname, "..", "..", "uploads", filename);
          await bot.telegram.sendPhoto(chatId, { source: filepath });
        } else {
          await bot.telegram.sendPhoto(chatId, photo.telegram_file_id);
        }
        sent++;
      } catch (e) {
        console.error("Failed to send photo:", e.message);
      }
    }

    if (total > 10) {
      await bot.telegram.sendMessage(chatId, `Showing ${sent} of ${total} photos.`);
    }

    const svc = require("../bot/services");
    await svc.markPhotosAsSeen(telegramId, photosToSend.map((p) => p.id));

    res.json({ success: true, sent, count: total });
  } catch (e) {
    console.error("Send results error:", e);
    res.status(500).json({ error: e.message });
  }
});

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

module.exports = router;
