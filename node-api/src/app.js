require("dotenv").config();
const express = require("express");
const cors = require("cors");
const photoRoute = require("./routes/photo");
const searchRoute = require("./routes/search");
const imageRoute = require("./routes/image");
const { startBot } = require("./bot");

const app = express();
app.use(cors());
app.use(express.json());


app.use("/photo", photoRoute);
app.use("/search", searchRoute);
app.use("/image", imageRoute);
const port=process.env.PORT || 3001;
app.listen(port, () => {
  console.log(
    `Server running on port ${port}`
  );
  startBot();
});