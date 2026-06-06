const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer();

const pool = require("../db");
const { extractFaces } = require("../services/python");

router.post("/", upload.single("image"), async (req, res) => {
  const { id } = req.body;
  try {
    const imageBuffer = req.file.buffer;
    const photoResult = await pool.query(
      `
      INSERT INTO photos(image_data,events_id)
      VALUES($1, $2)
      RETURNING id
      `,
      [imageBuffer,id]
    );

    const photoId = photoResult.rows[0].id;

    const faceData = await extractFaces(imageBuffer);

    for (const face of faceData.faces) {
      await pool.query(
        `
        INSERT INTO faces(
          photo_id,
          embedding,
          bbox
        )
        VALUES(
          $1,
          $2,
          $3
        )
        `,
        [
          photoId,
          JSON.stringify(face.embedding),
          JSON.stringify(face.bbox),
        ]
      );
    }

    res.json({
      success: true,
      photoId,
      faces: faceData.faces.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;