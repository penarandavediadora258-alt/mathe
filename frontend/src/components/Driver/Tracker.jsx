navigator.geolocation.watchPosition((pos) => {
  socket.emit("updateLocation", {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  });
});