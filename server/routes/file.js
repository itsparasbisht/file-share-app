const express = require("express");
const router = express.Router();

const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const serviceAccount = require("../serviceAccount");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.GOOGLE_BUCKET_NAME,
});

const storage = new Storage();
const bucket = storage.bucket(admin.storage().bucket().name);

// Endpoint to generate a signed URL for direct file upload
router.get("/generate-upload-url", (req, res) => {
  const filename = req.query.filename;
  const file = bucket.file(filename);

  file.getSignedUrl(
    {
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      contentType: "image/jpeg",
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

router.post("/post-upload", async (req, res) => {
  const fileData = {
    fileID: req.body.id,
    filename: req.body.filename,
  };

  if (req.body.password !== undefined && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData);

  res.json({
    filename: file.originalName,
    link: `${req.headers.host}/file/${file.id}`,
  });
});

module.exports = router;
