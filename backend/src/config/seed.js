require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./database');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Création du super administrateur...');

    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@smartstock.gn';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'AdminSmartStock2024!';
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('ℹ️  Super admin déjà existant. Rien à faire.');
      return;
    }

    await client.query(
      `INSERT INTO users (id, company_id, first_name, last_name, email, password_hash, role, is_active, email_verified)
       VALUES ($1, NULL, $2, $3, $4, $5, 'super_admin', true, true)`,
      [uuidv4(), 'Super', 'Admin', email, passwordHash]
    );

    console.log(`✅ Super admin créé : ${email}`);
    console.log(`🔑 Mot de passe : ${password}`);
    console.log('⚠️  Changez ce mot de passe après la première connexion !');
  } catch (err) {
    console.error('❌ Erreur seed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
