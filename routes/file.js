const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const serviceAccount = require("../serviceAccount");
const File = require("../models/File");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.GOOGLE_BUCKET_NAME,
});

const storage = new Storage();
const bucket = storage.bucket(admin.storage().bucket().name);

// endpoint to generate a signed URL for direct file upload
router.get("/generate-upload-url", (req, res) => {
  const fileID = uuidv4();
  const file = bucket.file(fileID);

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
      .json({ message: "something went wrong", error: error.message });
  }
});

// Function to retrieve a file from Firebase Storage
async function retrieveFile(destinationPath) {
  try {
    const file = bucket.file(destinationPath);
    const fileStream = await file.createReadStream();

    return fileStream;
  } catch (error) {
    console.error("Error retrieving file:", error);
    throw error;
  }
}

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

    //if password is correct download the file
    const destinationPath = `${fileID}`;
    const fileStream = await retrieveFile(destinationPath);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${file.filename}`
    );

    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Error downloading file.");
  }
});

module.exports = router;
