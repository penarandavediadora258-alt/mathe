const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hash,
    role
  });

  res.json(user);
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(400).send("No existe");

  const valid = await bcrypt.compare(req.body.password, user.password);

  if (!valid) return res.status(400).send("Error");

  const token = jwt.sign({ id: user._id }, "secret");

  res.json({ token });
};