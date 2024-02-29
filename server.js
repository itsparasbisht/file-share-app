require("dotenv").config();
require("./dbConnect");
const cors = require("cors");

const allowedOrigins = [
  "http://localhost:3000",
  "https://share-it-quick.netlify.app",
];

const express = require("express");
const app = express();

const fileRoute = require("./routes/file");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT;

// cors setup
app.use(
  cors({
    origin:
      process.env.INSTANCE === "local"
        ? "*"
        : function (origin, callback) {
            if (allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          },
  })
);

app.get("/", (req, res) => {
  res.json({ message: "root" });
});

app.use("/file", fileRoute);

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
