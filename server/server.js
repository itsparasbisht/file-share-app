require("dotenv").config();
const multer = require("multer");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

const express = require("express");
const File = require("./models/File");
const app = express();

const PORT = process.env.PORT;

const upload = multer({ dest: "uploads" });

mongoose.connection.on("open", function () {
  console.log("Connected to mongoDB");
});

mongoose.connection.on("error", function () {
  console.log("Could not connect to mongoDB");
});

mongoose.connect(process.env.DATABASE_URL);

app.get("/", (req, res) => {
  res.json({ message: "root" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  };

  if (req.body.password !== null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData);

  res.json({ filename: file.originalName });
});

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
