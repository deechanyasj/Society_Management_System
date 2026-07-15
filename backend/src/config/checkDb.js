const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkConnection() {
  console.log('Testing connection to:', process.env.DATABASE_URL);
  try {
    const client = await pool.connect();
    console.log('✅ DATABASE CONNECTION SUCCESSFUL');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Existing tables:', tables.rows.map(r => r.table_name).join(', '));
    
    if (tables.rows.length === 0) {
      console.log('⚠️ Warning: Database is empty. You need to run the initialization script.');
    }
    
    client.release();
  } catch (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    if (err.message.includes('does not exist')) {
      console.log('💡 Tip: You may need to create the database manually or update your .env with the correct name.');
    }
  } finally {
    process.exit();
  }
}

checkConnection();
