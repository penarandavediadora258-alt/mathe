import {
  GoogleMap,
  Marker,
  DirectionsRenderer
} from "@react-google-maps/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import io from "socket.io-client";
import Payment from "./Payment";
import AddressAutocomplete from "./AddressAutocomplete";

const containerStyle = {
  width: "100%",
  height: "500px"
};

const centerDefault = {
  lat: -17.7833,
  lng: -63.1821
};

export default function Map() {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [directions, setDirections] = useState(null);
  const [rides, setRides] = useState([]);
  const { user, api, isAuth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState(null); // 'searching', 'matched', 'no_drivers'
  const [rideOffers, setRideOffers] = useState([]); // Para conductores

  useEffect(() => {
    if (!isAuth()) return;

    // Conectar a Socket.IO con autenticación
    const token = localStorage.getItem('accessToken');
    const newSocket = io('http://localhost:5002', {
      auth: {
        token: token
      }
    });
    setSocket(newSocket);

    // Identificar usuario
    if (user && user.id) {
      newSocket.emit('identify', user.id);
    }

    // Escuchar actualizaciones de rides
    newSocket.on('rideUpdate', (updatedRide) => {
      setRides(prev => prev.map(ride => ride._id === updatedRide._id ? updatedRide : ride));

      // Si es el ride actual del usuario, actualizar estado
      if (currentRide && currentRide._id === updatedRide._id) {
        setCurrentRide(updatedRide);

        if (updatedRide.status === 'accepted') {
          setMatchingStatus('matched');
        } else if (updatedRide.status === 'cancelled') {
          setMatchingStatus('cancelled');
        }
      }
    });

    // Escuchar cuando se crea un ride
    newSocket.on('rideCreated', (ride) => {
      setCurrentRide(ride);
      setMatchingStatus('searching');
      setRides(prev => [...prev, ride]);
    });

    // Escuchar cuando no hay conductores disponibles
    newSocket.on('noDriversAvailable', (ride) => {
      setMatchingStatus('no_drivers');
      alert('No hay conductores disponibles en este momento. Inténtalo más tarde.');
    });

    // Escuchar ofertas de ride (para conductores)
    newSocket.on('rideOffer', (offerData) => {
      if (user && user.role === 'driver') {
        setRideOffers(prev => [...prev, offerData]);
      }
    });

    // Escuchar cuando un ride es aceptado
    newSocket.on('rideAccepted', (data) => {
      if (user && user.role === 'rider') {
        setMatchingStatus('matched');
        alert('¡Conductor encontrado! Tu viaje ha sido aceptado.');
      }
    });

    // Cargar rides existentes
    fetchRides();

    return () => newSocket.close();
  }, [user]);

  const fetchRides = async () => {
    try {
      const res = await api.get('/rides');
      setRides(res.data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  // Obtener ubicación actual y dirección
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      setOrigin(coords);

      // Obtener dirección de las coordenadas usando Google Maps Geocoding
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: coords }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setOriginAddress(results[0].formatted_address);
          } else {
            setOriginAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
          }
        });
      } else {
        setOriginAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
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
        if (status === "OK") {
          setDirections(result);
        }
      }
    );
  };

  // Crear ride con matching automático
  const createRide = async () => {
    if (!origin || !destination || !user) return;

    try {
      setMatchingStatus('searching');

      const rideData = {
        origin: {
          address: originAddress || "Origen no especificado",
          coordinates: {
            type: "Point",
            coordinates: [origin.lng, origin.lat] // [lng, lat] para MongoDB
          }
        },
        destination: {
          address: destinationAddress || "Destino no especificado",
          coordinates: {
            type: "Point",
            coordinates: [destination.lng, destination.lat]
          }
        },
        fare: {
          estimated: 15.50 // Cálculo básico, puedes mejorarlo
        },
        preferences: {
          maxWaitTime: 300,
          vehicleType: "standard",
          maxDrivers: 3
        }
      };

      const response = await api.post('/rides', rideData);
      const newRide = response.data;

      setCurrentRide(newRide);
      console.log('Ride creado:', newRide);

      // Escuchar actualizaciones del ride
      socket.on('rideUpdate', (updatedRide) => {
        if (updatedRide._id === newRide._id) {
          setCurrentRide(updatedRide);

          if (updatedRide.status === 'accepted') {
            setMatchingStatus('matched');
          } else if (updatedRide.status === 'cancelled') {
            setMatchingStatus('no_drivers');
          }
        }
      });

    } catch (error) {
      console.error('Error al solicitar el viaje:', error);
      setMatchingStatus(null);
      alert('Error al solicitar el viaje: ' + (error.response?.data?.error || error.message));
    }
  };

  // Conductor responde a oferta de ride
  const respondToRideOffer = async (rideId, accepted) => {
    if (!socket || !user) return;

    socket.emit('rideResponse', {
      rideId: rideId,
      driverId: user.id,
      accepted: accepted
    });

    // Remover oferta de la lista
    setRideOffers(prev => prev.filter(offer => offer.ride._id !== rideId));

    if (accepted) {
      alert('Viaje aceptado exitosamente');
    }
  };

  // Cancelar ride actual
  const cancelRide = async () => {
    if (!currentRide || !socket) return;

    socket.emit('cancelRide', currentRide._id);
    setCurrentRide(null);
    setMatchingStatus(null);
  };

  // Completar ride
  const completeRide = async () => {
    if (!currentRide || !socket) return;

    socket.emit('completeRide', currentRide._id);
    setCurrentRide(null);
    setMatchingStatus(null);
  };

  return (
    <div>
      <div style={{ padding: '20px', background: '#f8f9fa', marginBottom: '10px' }}>
        <h3 style={{ marginBottom: '15px' }}>Solicitar Viaje</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dirección de Origen:</label>
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
              onClick={getLocation}
              style={{ padding: '12px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📍 Mi ubicación
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dirección de Destino:</label>
          <AddressAutocomplete
            value={destinationAddress}
            onChange={setDestinationAddress}
            onSelect={handleDestinationSelect}
            placeholder="Ingresa la dirección de destino"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={calculateRoute}
            disabled={!origin || !destination}
            style={{
              padding: '10px 15px',
              background: (origin && destination) ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (origin && destination) ? 'pointer' : 'not-allowed'
            }}
          >
            Calcular Ruta
          </button>

          {user && user.role === 'rider' && origin && destination && !currentRide && (
            <button
              onClick={createRide}
              style={{ padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🚗 Solicitar Viaje
            </button>
          )}
        </div>

        {/* Estado del matching para riders */}
        {user && user.role === 'rider' && matchingStatus && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
            {matchingStatus === 'searching' && (
              <div>
                <span>🔍 Buscando conductor...</span>
                <button onClick={cancelRide} style={{ marginLeft: '10px', background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>
                  Cancelar
                </button>
              </div>
            )}
            {matchingStatus === 'matched' && currentRide && (
              <div>
                <span>✅ Conductor encontrado - Viaje en progreso</span>
                {currentRide.status === 'accepted' && (
                  <button onClick={completeRide} style={{ marginLeft: '10px', background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>
                    Completar Viaje
                  </button>
                )}
              </div>
            )}
            {matchingStatus === 'no_drivers' && (
              <div>
                <span>❌ No hay conductores disponibles</span>
                <button onClick={() => setMatchingStatus(null)} style={{ marginLeft: '10px', background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ofertas de rides para conductores */}
        {user && user.role === 'driver' && rideOffers.length > 0 && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#d4edda', borderRadius: '4px' }}>
            <h4>Nuevas solicitudes de viaje:</h4>
            {rideOffers.map((offer, index) => (
              <div key={index} style={{ border: '1px solid #c3e6cb', padding: '10px', margin: '5px 0', background: 'white' }}>
                <p><strong>Distancia:</strong> {offer.distance?.toFixed(2)} km</p>
                <p><strong>Tarifa estimada:</strong> ${offer.estimatedFare}</p>
                <button
                  onClick={() => respondToRideOffer(offer.ride._id, true)}
                  style={{ marginRight: '10px', background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
                >
                  Aceptar
                </button>
                <button
                  onClick={() => respondToRideOffer(offer.ride._id, false)}
                  style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
                >
                  Rechazar
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '10px' }}>
          <h3>Viajes activos:</h3>
          {rides.filter(ride => ride.status !== 'completed').map(ride => (
            <div key={ride._id} style={{ border: '1px solid #ccc', padding: '5px', margin: '5px 0' }}>
              De {ride.origin?.coordinates?.[1]?.toFixed(4)}, {ride.origin?.coordinates?.[0]?.toFixed(4)} a {ride.destination?.coordinates?.[1]?.toFixed(4)}, {ride.destination?.coordinates?.[0]?.toFixed(4)} - Estado: {ride.status}
              {ride.status === 'completed' && user && user.role === 'rider' && ride.rider === user._id && (
                <Payment rideId={ride._id} onPaymentSuccess={() => alert('Pago completado')} />
              )}
            </div>
          ))}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={origin || centerDefault}
        zoom={14}
      >
        {origin && <Marker position={origin} />}
        {destination && <Marker position={destination} />}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
}