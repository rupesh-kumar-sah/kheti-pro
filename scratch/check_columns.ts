
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = 'user'");
    console.log('Neon Auth User Columns:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
