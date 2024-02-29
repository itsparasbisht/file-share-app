const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const File = require("../models/File");
const serviceAccount = require("../serviceAccount");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET_NAME,
});

const storage = new Storage();
const bucket = storage.bucket(admin.storage().bucket().name);

// storage bucket metadata setup
const cors = [
  {
    origin: ["*"],
    method: ["*"],
    responseHeader: [
      "Content-Type",
      "Cache-Control",
      "Expires",
      "Last-Modified",
      "Content-Disposition",
    ],
    maxAgeSeconds: 3600,
  },
];
const metadata = { cors };
bucket.setMetadata(metadata);
// ------------------------

// endpoint to generate a signed URL for direct file upload
router.get("/generate-upload-url", (req, res) => {
  const fileID = uuidv4();
  const file = bucket.file(fileID);
  const fileType = req.query.fileType;

  const allowedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/markdown",
    "application/json",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "text/plain",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/ogg",
  ];

  let mimeType = "";

  if (allowedFileTypes.includes(fileType)) {
    mimeType = fileType;
  } else {
    return res.status(403).json({ message: "Selected file type not allowed" });
  }

  file.getSignedUrl(
    {
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      contentType: mimeType,
    },
    (err, url) => {
      if (err) {
        console.error("Error generating upload URL:", err);
        return res
          .status(500)
          .json({ message: "Error in generating the upload URL" });
      }

      res.status(200).json({ uploadUrl: url, fileID });
    }
  );
});

// endpoint to make a db entry for uploaded file
router.post("/post-upload", async (req, res) => {
  try {
    const fileData = {
      fileID: req.body.fileID,
      filename: req.body.filename,
    };

    if (req.body.password !== undefined && req.body.password !== "") {
      fileData.password = await bcrypt.hash(req.body.password.toString(), 10);
    }

    const file = await File.create(fileData);

    res.json({
      filename: file.filename,
      fileID: file.fileID,
      url: `${req.headers.origin}/${file.fileID}`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
});

// endpoint to download a file
router.post("/:fileID", async (req, res) => {
  try {
    const fileID = req.params.fileID;

    //get file details
    const file = await File.findOne({ fileID });

    // if file is password protected, compare the passwords
    if (file.password) {
      if (req.body?.password === undefined) {
        res.status(403).json({ message: "the file is password protected" });
        return;
      }

      const passwordMatch = await bcrypt.compare(
        req.body.password.toString(),
        file.password
      );

      if (!passwordMatch) {
        res.status(401).json({ message: "invalid password" });
        return;
      }
    }

    // if password is correct generate download url for the file
    const destinationPath = `${fileID}`;

    // Reference to the file you want to generate a download URL for
    // const fileRef = storage.bucket().file(destinationPath);
    const fileRef = bucket.file(destinationPath);

    // Generate the download URL
    fileRef.getSignedUrl(
      {
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // URL expires in 15 minutes
      },
      (err, url) => {
        if (err) {
          console.error("Error generating download URL:", err);
          return res
            .status(500)
            .json({ message: "Error in generating the download URL" });
        }

        res.status(200).json({ url, fileName: file.filename });
      }
    );
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Error in downloading the file" });
  }
});

module.exports = router;
