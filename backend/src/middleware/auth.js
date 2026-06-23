const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Token d'authentification manquant" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fix #2 — JOIN companies pour vérifier le statut de l'entreprise à chaque requête
    const result = await query(
      `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email, u.role, u.is_active,
              c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou désactivé' });
    }

    const user = result.rows[0];

    if (user.role !== 'super_admin' && user.company_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Compte entreprise non actif' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré' });
    }
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé : permissions insuffisantes' });
    }
    next();
  };
};

const isSuperAdmin = authorize('super_admin');
const isCompanyAdmin = authorize('super_admin', 'company_owner', 'manager');

module.exports = { authenticate, authorize, isSuperAdmin, isCompanyAdmin };
