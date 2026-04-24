import { PoolClient } from "pg";

export async function createMasterTables(client: PoolClient, schema: string) {
  /* =========================================================
     LOCATION MASTER
     ========================================================= */
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'local')),
      inactive_date DATE,
      same_as_ship_to BOOLEAN DEFAULT FALSE,
      description TEXT,
      number VARCHAR(50),
      building VARCHAR(120),
      street VARCHAR(120),
      locality VARCHAR(120),
      country VARCHAR(120),
      state VARCHAR(120),
      city VARCHAR(120),
      pincode VARCHAR(20),
      landline VARCHAR(30),
      mobile VARCHAR(30),
      fax VARCHAR(30),
      email VARCHAR(150),
      contact_person VARCHAR(150),
      ship_to_location VARCHAR(150),
      ship_to_site BOOLEAN DEFAULT FALSE,
      receiving_site BOOLEAN DEFAULT FALSE,
      office_site BOOLEAN DEFAULT FALSE,
      bill_to_site BOOLEAN DEFAULT FALSE,
      internal_site BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  /* =========================================================
     WAREHOUSE MASTER
     ========================================================= */
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".warehouses (
      id SERIAL PRIMARY KEY,
      code VARCHAR(30) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      location_id INT NOT NULL REFERENCES "${schema}".locations(id) ON DELETE RESTRICT,
      type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'local')),
      effective_from DATE,
      effective_to DATE,
      description TEXT,
      landline VARCHAR(30),
      mobile_no VARCHAR(30),
      fax VARCHAR(30),
      email VARCHAR(150),
      contact_person_name VARCHAR(150),
      contact_person_mobile VARCHAR(30),
      contact_person_email VARCHAR(150),
      pan VARCHAR(30),
      gstin VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  /* =========================================================
     LOCATOR MASTER
     ========================================================= */
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".locators (
      id SERIAL PRIMARY KEY,
      locator_name VARCHAR(120) NOT NULL,
      row VARCHAR(20) NOT NULL,
      rack VARCHAR(20) NOT NULL,
      bin VARCHAR(20) NOT NULL,
      effective_from DATE,
      effective_to DATE,
      warehouse_id INT NOT NULL REFERENCES "${schema}".warehouses(id) ON DELETE RESTRICT,
      type VARCHAR(30) NOT NULL CHECK (type IN (
        'receiving',
        'main_storage',
        'bulk_storage',
        'despatch',
        'return_area',
        'scrap'
      )),
      max_qty NUMERIC(12,2) DEFAULT 0,
      current_qty NUMERIC(12,2) DEFAULT 0,
      suggested_qty NUMERIC(12,2) DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
