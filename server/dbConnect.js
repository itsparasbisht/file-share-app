module.exports = (function () {
  const mongoose = require("mongoose");

  mongoose.connection.on("open", function () {
    console.log("Connected to mongoDB");
  });

  mongoose.connection.on("error", function () {
    console.log("Could not connect to mongoDB");
  });

  mongoose.connect(process.env.DATABASE_URL);
})();
