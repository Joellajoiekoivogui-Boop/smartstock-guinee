const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Cette valeur existe déjà (doublon)' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Référence invalide' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} introuvable` });
};

module.exports = { errorHandler, notFound };
