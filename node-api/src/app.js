require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const photoRoute = require("./routes/photo");
const searchRoute = require("./routes/search");
const imageRoute = require("./routes/image");
const apiRoute = require("./routes/api");
const { startBot } = require("./bot");
const { router: uploadRoute } = require("./routes/upload");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/photo", photoRoute);
app.use("/search", searchRoute);
app.use("/image", imageRoute);
app.use("/upload", uploadRoute);
app.use("/api", apiRoute);

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  startBot();
});
