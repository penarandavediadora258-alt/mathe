module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Usuario conectado");

    socket.on("updateLocation", (data) => {
      socket.broadcast.emit("driverLocation", data);
    });

    socket.on("requestRide", (ride) => {
      socket.broadcast.emit("newRide", ride);
    });
  });
};