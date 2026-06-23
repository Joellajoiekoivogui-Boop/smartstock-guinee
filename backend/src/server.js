require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const productsRoutes = require('./routes/productsRoutes');
const salesRoutes = require('./routes/salesRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// Sécurité
app.use(helmet({
  contentSecurityPolicy: false, // géré côté frontend
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: isProd ? process.env.FRONTEND_URL || true : 'http://localhost:3001',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

app.use(limiter);
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SmartStock Guinée API opérationnelle', version: '1.0.0' });
});

// Frontend statique en production
if (isProd && fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  // Gestion des erreurs 404 en dev uniquement
  app.use(notFound);
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 SmartStock Guinée API démarrée`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
