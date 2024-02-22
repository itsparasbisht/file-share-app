const mongoose = require("mongoose");

const File = new mongoose.Schema({
  fileID: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  password: String,
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", File);
