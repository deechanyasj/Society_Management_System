const pool = require('./database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDb() {
  try {
    console.log('🔄 Initializing database...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split SQL by semicolon to run individually or just run the whole thing if it's safe
    // Since we have CREATE TABLE IF NOT EXISTS, it's safe.
    await pool.query(sql);
    
    console.log('👤 Seeding users with verified passwords...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      ['Grand Oaks Admin', 'admin@grandoaks.com', hashedPassword, 'admin', '+91-9800000001', 'ADMIN'],
      ['Riya Sharma', 'staff@grandoaks.com', hashedPassword, 'staff', '+91-9800000002', 'STAFF'],
      ['Arjun Mehta', 'resident@grandoaks.com', hashedPassword, 'resident', '+91-9800000003', 'A-101']
    ];

    for (const user of users) {
      await pool.query(
        `INSERT INTO users (name, email, password, role, phone, flat_number) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (email) DO UPDATE SET password = $3`,
        user
      );
    }

    console.log('✅ Database initialized and seeded successfully!');
    console.log('\n📋 Verified Login Credentials:');
    console.log('  Admin:    admin@grandoaks.com / password123');
    console.log('  Staff:    staff@grandoaks.com / password123');
    console.log('  Resident: resident@grandoaks.com / password123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initDb();
