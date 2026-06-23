/**
 * Point d'entrée développement local.
 * Démarre PostgreSQL embarqué, crée la BDD, migrations, puis l'API Express.
 */
require('dotenv').config();
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_PORT     = parseInt(process.env.DB_PORT || '5432');
const DB_NAME     = process.env.DB_NAME     || 'smartstock_guinee';
const DB_USER     = process.env.DB_USER     || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

async function startPostgres() {
  const fs = require('fs');
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  const dataDir = path.join(__dirname, '.postgres-data');
  const alreadyInit = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user:     DB_USER,
    password: DB_PASSWORD,
    port:     DB_PORT,
    persistent: true,
  });

  try {
    if (!alreadyInit) {
      await pg.initialise();
    }
    await pg.start();
    console.log(`✅ PostgreSQL démarré (port ${DB_PORT})`);
  } catch (err) {
    const msg = (err && err.message) || '';
    if (/already running|lock|EADDRINUSE/i.test(msg)) {
      console.log('ℹ️  PostgreSQL déjà actif');
    } else {
      throw err;
    }
  }

  return pg;
}

async function ensureDatabase() {
  // Retry : PostgreSQL peut mettre quelques secondes à accepter des connexions
  let attempts = 0;
  while (attempts < 10) {
    const client = new Client({
      host: DB_HOST, port: DB_PORT,
      user: DB_USER, password: DB_PASSWORD,
      database: 'postgres',
      connectionTimeoutMillis: 3000,
    });
    try {
      await client.connect();
      const { rows } = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
      );
      const isFresh = rows.length === 0;
      if (isFresh) {
        await client.query(`CREATE DATABASE "${DB_NAME}"`);
        console.log(`✅ Base "${DB_NAME}" créée`);
      }
      await client.end();
      return isFresh;
    } catch (err) {
      try { await client.end(); } catch (_) {}
      attempts++;
      if (attempts >= 10) throw err;
      process.stdout.write(`⏳ Attente PostgreSQL... (${attempts}/10)\r`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function runScript(script) {
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname,
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(script)} a échoué (code ${result.status})`);
  }
}

async function main() {
  console.log('\n🚀 SmartStock Guinée — démarrage local\n');
  console.log('⬇️  Première exécution : téléchargement des binaires PostgreSQL (~150 Mo)...');
  console.log('   (les démarrages suivants seront instantanés)\n');

  const pg = await startPostgres();

  const isFresh = await ensureDatabase();
  console.log('');

  if (isFresh) {
    console.log('📦 Migrations initiales...');
    runScript('./src/config/migrate.js');
    runScript('./src/config/migrate2.js');
    console.log('🌱 Création du super admin...');
    runScript('./src/config/seed.js');
  } else {
    console.log('🔄 Mise à jour du schéma...');
    runScript('./src/config/migrate.js');
    runScript('./src/config/migrate2.js');
  }

  console.log('\n🌐 Démarrage du serveur API...\n');
  require('./src/server');

  const stop = async () => {
    console.log('\n⏹  Arrêt propre...');
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT',  stop);
}

main().catch(err => {
  console.error('\n❌ Échec du démarrage:', err.message || err);
  process.exit(1);
});
