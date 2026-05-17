import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Register = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('rider');
  const { register, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(email, password, role);
    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Registrarse</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="rider">Pasajero</option>
            <option value="driver">Conductor</option>
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '10px' }}>
        ¿Ya tienes cuenta? <button onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>Inicia sesión</button>
      </p>
    </div>
  );
};

export default Register;