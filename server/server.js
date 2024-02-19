require("dotenv").config();
require("./dbConnect");

const express = require("express");
const File = require("./models/File");
const app = express();

const fileRoute = require("./routes/file");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({ message: "root" });
});

app.use("/file", fileRoute);

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
