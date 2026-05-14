import { pool } from "../lib/db";
 
declare global {
  var dbInitialized: boolean | undefined;
}
 
export async function initializeDatabase() {
  // Skip if already initialized (memory level)
  if (global.dbInitialized) {
    return;
  }
 
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT to_regclass('public.companies') as exists;
    `);
 
    if (result.rows[0].exists) {
      // Already created → skip
      global.dbInitialized = true;
      return;
    }
    console.log("Running DB initialization (first time only)...");
    await client.query("BEGIN");
 
    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
 
    // ===============================
    // COMPANIES TABLE
    // ===============================
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL UNIQUE,
        gst_number VARCHAR(20),
        pan_number VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        subdomain_url VARCHAR(200) NOT NULL UNIQUE,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        subscription_plan VARCHAR(50) DEFAULT 'FREE',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
 
    // ===============================
    // USERS TABLE
    // ===============================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL
          REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        username VARCHAR(100),
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'ADMIN',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(company_id, username),
        UNIQUE(company_id, email)
      );
    `);
 
    await client.query("COMMIT");
    console.log("DB initialized successfully");
    global.dbInitialized = true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error initializing DB:", err);
  } finally {
    client.release();
  }
}
