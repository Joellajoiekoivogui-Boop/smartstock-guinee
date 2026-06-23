const { Pool } = require('pg');
require('dotenv').config();

// Support Railway (DATABASE_URL) et variables individuelles
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host:     process.env.DB_HOST     || process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
      database: process.env.DB_NAME     || process.env.PGDATABASE || 'smartstock_guinee',
      user:     process.env.DB_USER     || process.env.PGUSER     || 'postgres',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    };

const pool = new Pool({ ...poolConfig, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });

pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
