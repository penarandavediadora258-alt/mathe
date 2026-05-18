const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Configuración de seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://maps.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Configuración CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // límite de 5 intentos de login/registro por ventana
  message: {
    error: 'Demasiados intentos de autenticación. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para API de rides
const ridesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // límite de 30 requests por minuto
  message: {
    error: 'Demasiadas solicitudes a la API de rides.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' })); // Limitar tamaño del body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de seguridad adicionales
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => {
    console.error("❌ Error MongoDB:", err.message);
    process.exit(1);
  });

// Inicialización de Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
  console.error("❌ ERROR: Stripe secret key inválida. Usa una clave secreta 'sk_test_' en .env.");
  process.exit(1);
}

const stripe = require("stripe")(stripeSecretKey);
console.log("✅ Stripe initialized");

// Rutas con rate limiting
app.use("/api/auth", authLimiter);
app.use("/api/rides", ridesLimiter);

// Rutas
app.use("/api/auth", require("./routes/auth"));
const { router: ridesRouter, initMatchingService } = require("./routes/rides");
app.use("/api/rides", ridesRouter);
app.use("/api/payments", require("./routes/payments"));

// Inicializar servicio de matching
initMatchingService(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido',
      details: err.message
    });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// SOCKET.IO con autenticación
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    // Aquí podrías verificar el token JWT
    // Por simplicidad, permitimos la conexión
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

require("./sockets/socket")(io);

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ ERROR: El puerto ${PORT} ya está en uso. Cambia PORT en .env o detén el proceso que lo usa.`);
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});

module.exports = { io };
      amount: 1000,
      currency: "usd"
    });

    res.send(payment.client_secret);
  } catch (error) {
    console.error("Stripe payment error:", error.message);
    res.status(500).json({ error: "Error al crear el pago" });
  }
});

// Conexión MongoDB
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("ERROR: MONGO_URI no está definido en .env");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Rutas
app.use("/api/auth", require("./routes/auth"));
const { router: ridesRouter, initMatchingService } = require("./routes/rides");
app.use("/api/rides", ridesRouter);

// Inicializar servicio de matching
initMatchingService(io);

// SOCKET.IO
require("./sockets/socket")(io);

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`ERROR: El puerto ${PORT} ya está en uso. Cambia PORT en .env o detén el proceso que lo usa.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

module.exports = { io };