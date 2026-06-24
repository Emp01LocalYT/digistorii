import { PoolClient } from "pg";
import { ensureLocationTableShape } from "./locationSchema";

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
      same_as_registered BOOLEAN DEFAULT FALSE,
      same_as_bill_to BOOLEAN DEFAULT FALSE,
      description TEXT,
      registered_address_line_1 TEXT,
      registered_address_line_2 TEXT,
      registered_country VARCHAR(120),
      registered_state VARCHAR(120),
      registered_city VARCHAR(120),
      registered_pincode VARCHAR(20),
      bill_address_line_1 TEXT,
      bill_address_line_2 TEXT,
      bill_country VARCHAR(120),
      bill_state VARCHAR(120),
      bill_city VARCHAR(120),
      bill_pincode VARCHAR(20),
      ship_address_line_1 TEXT,
      ship_address_line_2 TEXT,
      ship_country VARCHAR(120),
      ship_state VARCHAR(120),
      ship_city VARCHAR(120),
      ship_pincode VARCHAR(20),
      landline VARCHAR(30),
      mobile VARCHAR(30),
      fax VARCHAR(30),
      email VARCHAR(150),
      contact_person VARCHAR(150),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await ensureLocationTableShape(client, schema);

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
