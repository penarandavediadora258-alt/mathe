const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: { origin: "*" }
});

app.get("/", (req, res) => {
  res.send("API de Mathe");
});

app.use(cors());
app.use(express.json());

// Conexión MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));


// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/rides", require("./routes/rides"));

// SOCKET.IO
require("./sockets/socket")(io);

server.listen(process.env.PORT || 5000, () => console.log("Servidor en puerto 5000"));