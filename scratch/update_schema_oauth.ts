
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    console.log('Updating schema for OAuth...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email TEXT UNIQUE, 
      ADD COLUMN IF NOT EXISTS neon_id UUID UNIQUE;
    `);
    
    // We can't drop the NOT NULL constraint if it's the primary key easily in some PG versions 
    // without dropping the PK first, but let's try.
    // Wait, 'phone' is the PK. We should keep it as PK but maybe allow it to be something else?
    // Actually, if it's a PK, it CANNOT be null.
    
    // Better: Add a new column 'id' as PK and make phone unique but nullable.
    
    console.log('Adding neon_id and email successful.');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
