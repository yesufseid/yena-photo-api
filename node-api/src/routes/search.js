const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer();
const pool = require("../db");
const { extractFaces } = require("../services/python");

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;
    const faceData = await extractFaces(imageBuffer);

    if (faceData.faces.length === 0) {
      return res.status(400).json({ error: "No face found" });
    }

    const embedding = faceData.faces[0].embedding;
    const result = await pool.query(
      `SELECT DISTINCT ON (p.id) p.id, p.telegram_file_id, p.event_id,
              1 - (fe.embedding <=> $1::vector) AS similarity
       FROM face_embeddings fe
       JOIN photos p ON p.id = fe.photo_id
       WHERE (1 - (fe.embedding <=> $1::vector)) > 0.5
       ORDER BY p.id, similarity DESC
       LIMIT 20`,
      [JSON.stringify(embedding)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
