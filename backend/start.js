/**
 * Script de démarrage production (Railway / cloud).
 * Exécute les migrations puis démarre l'API Express.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const { Client } = require('pg');

async function waitForDb(maxAttempts = 20) {
  for (let i = 1; i <= maxAttempts; i++) {
    const client = new Client({ connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      await client.end();
      return;
    } catch (_) {
      try { await client.end(); } catch (__) {}
      if (i === maxAttempts) throw new Error('Impossible de joindre PostgreSQL');
      process.stdout.write(`⏳ Attente DB... (${i}/${maxAttempts})\r`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function run(script) {
  const r = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname,
  });
  if (r.status !== 0) process.exit(r.status);
}

async function main() {
  console.log('⏳ Vérification de la base de données...');
  await waitForDb();
  console.log('✅ DB connectée');

  console.log('📦 Migrations...');
  run('./src/config/migrate.js');
  run('./src/config/migrate2.js');

  // Seed super admin uniquement si première fois
  const client = new Client({ connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT 1 FROM users WHERE role='super_admin' LIMIT 1`
    );
    await client.end();
    if (rows.length === 0) {
      console.log('🌱 Création du super admin...');
      run('./src/config/seed.js');
    }
  } catch (_) {
    try { await client.end(); } catch (__) {}
  }

  console.log('🚀 Démarrage du serveur...');
  require('./src/server');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
