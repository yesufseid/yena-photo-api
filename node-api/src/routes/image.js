const express = require("express");

const router = express.Router();

const pool = require("../db");

router.get("/:id", async (req, res) => {
  console.log(req.params.id);
  
  const result = await pool.query(
    `
    SELECT image_data
    FROM photos
    WHERE id = $1
    `,
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).send("Not found");
  }

  res.setHeader("Content-Type", "image/jpeg");

  res.send(result.rows[0].image_data);
});

module.exports = router;