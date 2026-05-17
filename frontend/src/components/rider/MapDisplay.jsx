import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import AddressAutocomplete from '../AddressAutocomplete';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const centerDefault = {
  lat: -17.7833,
  lng: -63.1821
};

const MapDisplay = () => {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [directions, setDirections] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Conectar a Socket.IO
    const newSocket = io('http://localhost:5002');
    setSocket(newSocket);

    // Identificar usuario
    if (user.id) {
      newSocket.emit('identify', user.id);
    }

    // Escuchar ubicación del conductor
    newSocket.on('driverLocation', (data) => {
      setDriverPosition(data);
    });

    return () => newSocket.close();
  }, [user]);

  // Obtener ubicación actual
  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      setOrigin(coords);

      // Obtener dirección usando Google Maps
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: coords }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setOriginAddress(results[0].formatted_address);
          } else {
            setOriginAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
          }
        });
      }
    });
  };

  // Manejar selección de dirección de origen
  const handleOriginSelect = (addressData) => {
    setOrigin(addressData.coordinates);
    setOriginAddress(addressData.address);
  };

  // Manejar selección de dirección de destino
  const handleDestinationSelect = (addressData) => {
    setDestination(addressData.coordinates);
    setDestinationAddress(addressData.address);
  };

  // Calcular ruta
  const calculateRoute = () => {
    if (!origin || !destination || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        }
      }
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Mapa del Viaje</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Dirección de Origen:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <AddressAutocomplete
              value={originAddress}
              onChange={setOriginAddress}
              onSelect={handleOriginSelect}
              placeholder="Ingresa la dirección de origen"
            />
          </div>
          <button
            onClick={getCurrentLocation}
            style={{
              padding: '12px 15px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📍 Mi ubicación
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Dirección de Destino:
        </label>
        <AddressAutocomplete
          value={destinationAddress}
          onChange={setDestinationAddress}
          onSelect={handleDestinationSelect}
          placeholder="Ingresa la dirección de destino"
        />
      </div>

      <button
        onClick={calculateRoute}
        disabled={!origin || !destination}
        style={{
          padding: '10px 15px',
          marginBottom: '15px',
          background: (origin && destination) ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (origin && destination) ? 'pointer' : 'not-allowed'
        }}
      >
        Calcular Ruta
      </button>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={origin || centerDefault}
        zoom={14}
      >
        {origin && <Marker position={origin} label="Origen" />}
        {destination && <Marker position={destination} label="Destino" />}
        {driverPosition && (
          <Marker
            position={driverPosition}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#28a745" stroke="white" stroke-width="3"/>
                  <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🚗</text>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            label="Conductor"
          />
        )}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default MapDisplay;