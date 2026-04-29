
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'");
    console.log('Public Users Columns:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
