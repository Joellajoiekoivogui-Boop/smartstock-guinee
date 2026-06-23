const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { generateAccessToken, generateRefreshToken, revokeRefreshToken } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/register — Inscription d'une nouvelle entreprise
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { companyName, email, password, phone, address, city, businessType, ownerFirstName, ownerLastName } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    // Fix #1 — transaction pour éviter une company orpheline si l'INSERT user échoue
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const companyResult = await client.query(
        `INSERT INTO companies (name, email, phone, address, city, business_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
        [companyName, email, phone, address, city, businessType]
      );
      const companyId = companyResult.rows[0].id;

      await client.query(
        `INSERT INTO users (company_id, first_name, last_name, email, password_hash, role, email_verification_token)
         VALUES ($1, $2, $3, $4, $5, 'company_owner', $6)`,
        [companyId, ownerFirstName, ownerLastName, email, passwordHash, verificationToken]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Email d'accusé de réception : confirme que la demande a bien été prise en compte
    const ownerName = `${ownerFirstName} ${ownerLastName}`;
    const tpl = emailTemplates.registrationReceived(companyName, ownerName);
    await sendEmail({ to: email, ...tpl });

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès. En attente de validation par l'administrateur.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const result = await query(
      `SELECT u.*, c.status AS company_status, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    if (!result.rows.length) {
      await logLogin(null, ip, req.headers['user-agent'], 'failed');
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await logLogin(user.id, ip, req.headers['user-agent'], 'failed');
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Compte désactivé. Contactez l'administrateur." });
    }

    if (user.role !== 'super_admin' && user.company_status !== 'active') {
      const messages = {
        pending: 'Votre compte est en attente de validation.',
        suspended: "Votre compte est suspendu. Contactez l'administrateur.",
        rejected: 'Votre demande a été refusée.',
      };
      return res.status(403).json({ success: false, message: messages[user.company_status] || 'Compte non actif' });
    }

    const accessToken = generateAccessToken(user.id, user.role, user.company_id);
    const refreshToken = await generateRefreshToken(user.id);

    // Fix #7 — refresh token en cookie HttpOnly (non accessible par JS)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    await query(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
      [ip, user.id]
    );
    await logLogin(user.id, ip, req.headers['user-agent'], 'success');

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        companyName: user.company_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.clearCookie('refreshToken', COOKIE_OPTS);
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    // Fix #7 — lire depuis le cookie, pas le body
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token manquant' });
    }

    // Fix #3 — vérifier aussi le statut de l'entreprise
    const result = await query(
      `SELECT rt.*, u.id AS user_id, u.role, u.company_id, u.is_active,
              c.status AS company_status
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE rt.token = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Refresh token invalide ou expiré' });
    }

    const { user_id, role, company_id, is_active, company_status } = result.rows[0];

    if (!is_active) {
      return res.status(403).json({ success: false, message: 'Compte désactivé' });
    }

    if (role !== 'super_admin' && company_status !== 'active') {
      const messages = {
        pending: 'Votre compte est en attente de validation.',
        suspended: 'Votre compte est suspendu.',
        rejected: 'Votre demande a été refusée.',
      };
      return res.status(403).json({ success: false, message: messages[company_status] || 'Compte non actif' });
    }

    // Fix #4 — rotation : révoquer l'ancien token, émettre un nouveau
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await generateRefreshToken(user_id);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);

    const accessToken = generateAccessToken(user_id, role, company_id);
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
// Fix #5 — ajout du paramètre next pour propager les erreurs DB
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.avatar_url, u.phone,
              u.last_login_at, c.id AS company_id, c.name AS company_name, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        lastLoginAt: user.last_login_at,
        company: user.company_id ? {
          id: user.company_id,
          name: user.company_name,
          status: user.company_status,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

async function logLogin(userId, ip, userAgent, status) {
  try {
    await query(
      'INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
      [userId, ip, userAgent, status]
    );
  } catch (err) {
    console.error('[login-history] Échec enregistrement:', err.message);
  }
}

module.exports = { register, login, logout, refresh, getMe };
