const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import database connection
const db = require('./config/database');

// Import routes
const classRoutes = require('./routes/classRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header) and configured frontends.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(`${apiPrefix}/classes`, classRoutes);
app.use(`${apiPrefix}/devices`, deviceRoutes);
app.use(`${apiPrefix}/consumption`, consumptionRoutes);
app.use(`${apiPrefix}/alerts`, alertRoutes);
app.use(`${apiPrefix}/settings`, settingsRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Smart Energy Dashboard API is running'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Energy Dashboard API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
