const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const axios = require("axios");

router.get("/:id", async (req, res) => {
  const result = await pool.query(
    `SELECT telegram_file_id FROM photos WHERE id = $1`,
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).send("Not found");
  }

  const fileId = result.rows[0].telegram_file_id;

  if (fileId && fileId.startsWith("local::")) {
    const filename = fileId.slice(7);
    const filepath = path.join(__dirname, "..", "..", "uploads", filename);
    if (fs.existsSync(filepath)) {
      return res.sendFile(filepath);
    }
    return res.status(404).send("Image not found");
  }

  if (fileId && !fileId.startsWith("api_upload_")) {
    try {
      const token = process.env.BOT_TOKEN;
      const fileRes = await axios.get(
        `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
      );
      const filePath = fileRes.data.result.file_path;
      const dl = await axios.get(
        `https://api.telegram.org/file/bot${token}/${filePath}`,
        { responseType: "arraybuffer" }
      );
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(Buffer.from(dl.data));
    } catch (e) {
      return res.status(500).send("Failed to fetch image");
    }
  }

  res.status(404).send("Image not available");
});

module.exports = router;
