const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ["rider", "driver"] },
  location: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model("User", userSchema);