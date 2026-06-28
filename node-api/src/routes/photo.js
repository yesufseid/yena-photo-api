const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer();

const pool = require("../db");
const { extractFaces } = require("../services/python");

router.post("/", upload.single("image"), async (req, res) => {
  const { event_id } = req.body;
  try {
    const imageBuffer = req.file.buffer;
    const faceData = await extractFaces(imageBuffer);

    const photoResult = await pool.query(
      `INSERT INTO photos (event_id, telegram_file_id, faces_count, processed)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [event_id, "api_upload_" + Date.now(), faceData.faces.length]
    );

    const photoId = photoResult.rows[0].id;

    for (const face of faceData.faces) {
      await pool.query(
        `INSERT INTO face_embeddings (photo_id, embedding, bbox) VALUES ($1, $2::vector, $3)`,
        [photoId, JSON.stringify(face.embedding), JSON.stringify(face.bbox)]
      );
    }

    res.json({
      success: true,
      photoId,
      faces: faceData.faces.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;