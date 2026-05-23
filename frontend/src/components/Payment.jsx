import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Payment.css';

const PaymentComponent = ({ rideId, amount, onPaymentSuccess, onPaymentError }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { api } = useAuth();

  const handleCardChange = (e) => {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length > 16) value = value.slice(0, 16);

    // Agregar espacios cada 4 dígitos
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(value);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    setExpiry(value);
  };

  const handleCvcChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCvc(value);
  };

  const validatePaymentData = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Número de tarjeta inválido');
      return false;
    }
    if (!expiry || expiry.length !== 5) {
      setError('Fecha de vencimiento inválida');
      return false;
    }
    if (!cvc || cvc.length !== 3) {
      setError('CVC inválido');
      return false;
    }
    return true;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePaymentData()) {
      return;
    }

    setLoading(true);

    try {
      // Crear payment intent
      const intentResponse = await api.post('/payments/create-payment-intent', {
        rideId,
        amount
      });

      const { clientSecret, paymentIntentId } = intentResponse.data;

      // Simular procesamiento de pago (en producción usarías Stripe.js)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirmar pago
      const confirmResponse = await api.post('/payments/confirm-payment', {
        rideId,
        paymentIntentId
      });

      if (confirmResponse.data.success) {
        setSuccess(true);
        if (onPaymentSuccess) {
          onPaymentSuccess({
            rideId,
            amount,
            receipt: confirmResponse.data.receipt
          });
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error al procesar el pago';
      setError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="payment-success">
        <div className="success-icon">✓</div>
        <h2>¡Pago Completado!</h2>
        <p>Tu viaje ha sido pagado exitosamente.</p>
        <div className="payment-details">
          <p><strong>Monto:</strong> ${amount.toFixed(2)}</p>
          <p><strong>ID de Viaje:</strong> {rideId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <h2>Pagar Viaje</h2>
      <p className="amount">Total: <strong>${amount.toFixed(2)}</strong></p>

      <form onSubmit={handlePayment}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Número de Tarjeta</label>
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={handleCardChange}
            disabled={loading}
            maxLength="19"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Vencimiento (MM/YY)</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiry}
              onChange={handleExpiryChange}
              disabled={loading}
              maxLength="5"
              required
            />
          </div>
          <div className="form-group">
            <label>CVC</label>
            <input
              type="text"
              placeholder="123"
              value={cvc}
              onChange={handleCvcChange}
              disabled={loading}
              maxLength="3"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="pay-button"
          disabled={loading}
        >
          {loading ? 'Procesando...' : `Pagar $${amount.toFixed(2)}`}
        </button>
      </form>

      <div className="security-info">
        <p>🔒 Tu información de pago es segura y encriptada.</p>
      </div>
    </div>
  );
};

export default PaymentComponent;