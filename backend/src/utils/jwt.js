const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const generateAccessToken = (userId, role, companyId) => {
  return jwt.sign(
    { userId, role, companyId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateRefreshToken = async (userId) => {
  const token = uuidv4() + '-' + uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
};

const revokeRefreshToken = async (token) => {
  await query('UPDATE refresh_tokens SET is_revoked = true WHERE token = $1', [token]);
};

module.exports = { generateAccessToken, generateRefreshToken, revokeRefreshToken };
