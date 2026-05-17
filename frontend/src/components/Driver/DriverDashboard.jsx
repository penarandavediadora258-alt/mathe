import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import io from "socket.io-client";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Conectar a Socket.IO
    const newSocket = io('http://localhost:5002');
    setSocket(newSocket);

    // Identificar usuario
    if (user && user._id) {
      newSocket.emit('identify', user._id);
    }

    // Obtener ubicación actual
    getCurrentLocation();

    return () => newSocket.close();
  }, [user]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(coords);

          // Actualizar ubicación en el servidor
          if (socket && user) {
            socket.emit('updateDriverLocation', {
              userId: user._id,
              coordinates: [coords.lng, coords.lat] // [lng, lat] para MongoDB
            });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const toggleAvailability = () => {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);

    if (socket && user) {
      socket.emit('setDriverAvailability', {
        userId: user._id,
        available: newAvailability
      });
    }
  };

  const updateLocation = () => {
    getCurrentLocation();
  };

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', margin: '10px 0' }}>
      <h3>Panel de Conductor</h3>

      <div style={{ marginBottom: '15px' }}>
        <strong>Estado:</strong>
        <span style={{
          color: isAvailable ? '#28a745' : '#dc3545',
          marginLeft: '10px',
          fontWeight: 'bold'
        }}>
          {isAvailable ? '🟢 Disponible' : '🔴 No disponible'}
        </span>
        <button
          onClick={toggleAvailability}
          style={{
            marginLeft: '15px',
            background: isAvailable ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isAvailable ? 'Ponerme no disponible' : 'Ponerme disponible'}
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Ubicación actual:</strong>
        {currentLocation ? (
          <span style={{ marginLeft: '10px' }}>
            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </span>
        ) : (
          <span style={{ marginLeft: '10px', color: '#6c757d' }}>No disponible</span>
        )}
        <button
          onClick={updateLocation}
          style={{
            marginLeft: '15px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Actualizar ubicación
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Información del vehículo:</strong>
        {user?.driverInfo?.vehicle ? (
          <div style={{ marginLeft: '10px', marginTop: '5px' }}>
            <p>Marca: {user.driverInfo.vehicle.make}</p>
            <p>Modelo: {user.driverInfo.vehicle.model}</p>
            <p>Año: {user.driverInfo.vehicle.year}</p>
            <p>Color: {user.driverInfo.vehicle.color}</p>
            <p>Placa: {user.driverInfo.vehicle.licensePlate}</p>
          </div>
        ) : (
          <span style={{ marginLeft: '10px', color: '#6c757d' }}>
            Información del vehículo no registrada
          </span>
        )}
      </div>

      <div>
        <strong>Estadísticas:</strong>
        <div style={{ marginLeft: '10px', marginTop: '5px' }}>
          <p>Rating: ⭐ {user?.driverInfo?.rating?.toFixed(1) || '5.0'}</p>
          <p>Total de viajes: {user?.driverInfo?.totalRides || 0}</p>
        </div>
      </div>
    </div>
  );
}