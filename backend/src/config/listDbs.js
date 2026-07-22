const { Client } = require('pg');
require('dotenv').config();

// Connect to default 'postgres' database to list other databases
const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/postgres'
});

async function listDbs() {
  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Available databases:');
    res.rows.forEach(row => console.log(`- ${row.datname}`));
  } catch (err) {
    console.error('Error listing databases:', err.message);
  } finally {
    await client.end();
  }
}

listDbs();
