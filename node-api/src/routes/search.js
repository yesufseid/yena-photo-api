const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer();

const pool = require("../db");
const { extractFaces } = require("../services/python");

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;

    const faceData = await extractFaces(imageBuffer)
      
    if (faceData.faces.length === 0) {
      console.log("no face found");
      
      return res.status(400).json({
        error: "No face found",
      });
    }

    const embedding = faceData.faces[0].embedding;
const result = await pool.query(
  `
  SELECT
      photo_id,
      1 - (embedding <=> $1::vector) AS similarity
  FROM faces
  WHERE (1 - (embedding <=> $1::vector)) > 0.5
  ORDER BY embedding <=> $1::vector
  LIMIT 20
  `,
  [JSON.stringify(embedding)]
);

console.log(result.rows);
res.json(result.rows);
  } catch (error) {
    console.error(error);
    
    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;