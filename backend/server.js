const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ===============================
// SOCKET.IO
// ===============================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ===============================
// HELMET SECURITY
// ===============================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "https://maps.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "ws:",
          "wss:",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ===============================
// CORS
// ===============================
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

app.use(cors(corsOptions));

// ===============================
// RATE LIMITERS
// ===============================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error:
      "Demasiadas solicitudes desde esta IP, intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Demasiados intentos de autenticación. Intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rides limiter
const ridesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error:
      "Demasiadas solicitudes a la API de rides.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===============================
// BODY PARSER
// ===============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "10mb",
}));

// ===============================
// EXTRA SECURITY HEADERS
// ===============================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
});

// ===============================
// MONGODB CONNECTION
// ===============================
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ ERROR: MONGO_URI no está definido en .env");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ MongoDB conectado");
  })
  .catch((err) => {
    console.error("❌ Error MongoDB:", err.message);
    process.exit(1);
  });

// ===============================
// STRIPE
// ===============================
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
  console.error(
    "❌ ERROR: Usa una Stripe Secret Key válida (sk_test_)"
  );
  process.exit(1);
}

const stripe = require("stripe")(stripeSecretKey);

console.log("✅ Stripe initialized");

// ===============================
// RATE LIMIT ROUTES
// ===============================
app.use("/api/auth", authLimiter);
app.use("/api/rides", ridesLimiter);

// ===============================
// ROUTES
// ===============================
app.use("/api/auth", require("./routes/auth"));

const {
  router: ridesRouter,
  initMatchingService,
} = require("./routes/rides");

app.use("/api/rides", ridesRouter);

app.use(
  "/api/payments",
  require("./routes/payments")
);

// ===============================
// INIT MATCHING SERVICE
// ===============================
initMatchingService(io);

// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment:
      process.env.NODE_ENV || "development",
  });
});

// ===============================
// SOCKET AUTH
// ===============================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(
        new Error("Authentication error")
      );
    }

    // Aquí puedes verificar JWT

    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// ===============================
// SOCKET EVENTS
// ===============================
require("./sockets/socket")(io);

// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Datos inválidos",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "ID inválido",
      details: err.message,
    });
  }

  res.status(500).json({
    error: "Error interno del servidor",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Algo salió mal",
  });
});

// ===============================
// 404
// ===============================
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(
    `🚀 Servidor corriendo en puerto ${PORT}`
  );

  console.log(
    `🌍 Ambiente: ${
      process.env.NODE_ENV || "development"
    }`
  );

  console.log(
    `🔒 CORS habilitado para: ${
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    }`
  );
});

// ===============================
// SERVER ERRORS
// ===============================
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ ERROR: El puerto ${PORT} ya está en uso.`
    );
  } else {
    console.error("❌ Server error:", err);
  }

  process.exit(1);
});

// ===============================
// EXPORTS
// ===============================
module.exports = { io };