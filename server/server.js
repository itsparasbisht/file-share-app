require("dotenv").config();
const multer = require("multer");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

const express = require("express");
const File = require("./models/File");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT;

const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://file-share-app-107b6.appspot.com",
});

const storage = new Storage();
const bucket = storage.bucket(admin.storage().bucket().name);

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

  if (req.body.password !== undefined && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData);
  console.log(req.headers);
  res.json({
    filename: file.originalName,
    link: `${req.headers.host}/file/${file.id}`,
  });
});

app.post("/file/:id", async (req, res) => {
  const id = req.params.id;
  const file = await File.findById(id);

  if (file.password) {
    if (req.body?.password === undefined) {
      res.status(403).json({ message: "the file is password protected" });
      return;
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      file.password
    );
    if (!passwordMatch) {
      res.status(401).json({ message: "invalid password" });
      return;
    }
  }

  file.downloadCount++;
  await file.save();
  res.download(file.path, file.originalName);
});

// Endpoint to generate a signed URL for direct upload
app.get("/generate-upload-url", (req, res) => {
  const fileName = req.query.fileName; // File name sent by the client

  const file = bucket.file(fileName);

  // Generate a signed URL for direct upload
  file.getSignedUrl(
    {
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      contentType: "image/jpeg", // Change to the appropriate content type
    },
    (err, url) => {
      if (err) {
        console.error("Error generating upload URL:", err);
        return res.status(500).send("Error generating upload URL");
      }

      res.status(200).json({ uploadUrl: url });
    }
  );
});

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
