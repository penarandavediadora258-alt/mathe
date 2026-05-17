import Map from "./Map";
import Login from "./Login";
import Register from "./Register";
import DriverDashboard from "./Driver/DriverDashboard";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { LoadScript } from "@react-google-maps/api";

function App() {
  const { user, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8f9fa' }}>
        <h1>Mi mapa con Google Maps</h1>
        <div>
          <span>Bienvenido, {user.email} ({user.role})</span>
          <button onClick={logout} style={{ marginLeft: '10px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {user.role === 'driver' && <DriverDashboard />}
      <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY" libraries={["places"]}>
        <Map />
      </LoadScript>
    </div>
  );
}

export default App;