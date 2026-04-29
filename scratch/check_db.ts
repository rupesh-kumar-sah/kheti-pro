
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT schema_name FROM information_schema.schemata");
    console.log('Schemas:', res.rows.map(r => r.schema_name));
    
    const tables = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'neon_auth'");
    console.log('Neon Auth Tables:', tables.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
