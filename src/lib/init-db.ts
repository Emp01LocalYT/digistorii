import { pool } from "../lib/db";
import { ensureResponsibilitySchema } from "./userResponsibilities";
 
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
    console.log("Running DB initialization / migrations...");
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
        currency VARCHAR(10),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        subdomain_url VARCHAR(200) NOT NULL UNIQUE,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        subscription_plan VARCHAR(50) DEFAULT 'BASIC',
        setup_stage VARCHAR(40) DEFAULT 'ACCOUNT_CREATED',
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
        responsibility_id INT,
        phone_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(company_id, username),
        UNIQUE(company_id, email)
      );
    `);
await client.query(`
  CREATE TABLE IF NOT EXISTS company_subscriptions (
  id                    SERIAL PRIMARY KEY,
  company_id            INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id               INTEGER NOT NULL REFERENCES plans(id),
  plan_code             VARCHAR(50),
  ecommerce_access      BOOLEAN DEFAULT FALSE,
  max_users             INTEGER DEFAULT 5,
  max_warehouses        INTEGER DEFAULT 1,
  max_locations         INTEGER DEFAULT 1,
  billing_interval      VARCHAR(20) DEFAULT 'monthly',
  amount                INTEGER DEFAULT 0,
  payment_status        VARCHAR(20) DEFAULT 'created',
  razorpay_order_id     TEXT,
  subscription_start    TIMESTAMP,
  subscription_end      TIMESTAMP,
  status                VARCHAR(20) DEFAULT 'TRIALING',  -- 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED'
  trial_ends_at         TIMESTAMP,
  current_period_start  TIMESTAMP,
  current_period_end    TIMESTAMP,
  cancelled_at          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);`);
      await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                    SERIAL PRIMARY KEY,
        company_id            INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        subscription_id       INTEGER REFERENCES company_subscriptions(id),
        plan_name             TEXT NOT NULL,
        plan_price            INTEGER NOT NULL,
        billing_interval      VARCHAR(20) DEFAULT 'monthly',
        razorpay_order_id     TEXT,
        razorpay_payment_id   TEXT,
        razorpay_signature    TEXT,
        amount                INTEGER NOT NULL,
        currency              TEXT DEFAULT 'INR',
        status                TEXT DEFAULT 'created',
        payment_status        TEXT DEFAULT 'created',
        subscription_start    TIMESTAMP,
        subscription_end      TIMESTAMP,
        created_at            TIMESTAMP DEFAULT NOW(),
        updated_at            TIMESTAMP DEFAULT NOW()
      );
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS plans (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(50) NOT NULL UNIQUE,  -- 'STARTER', 'GROWTH', 'ENTERPRISE'
  price_monthly  INTEGER NOT NULL DEFAULT 0,   -- in paise (INR smallest unit)
  price_yearly   INTEGER NOT NULL DEFAULT 0,
  billing_period  VARCHAR(50) DEFAULT 'Monthly / Yearly',
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order   INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW()
);
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS onboarding_otps (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    resend_count INTEGER NOT NULL DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
await client.query(`
  CREATE TABLE IF NOT EXISTS plan_features (
  id           SERIAL PRIMARY KEY,
  plan_id      INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key  VARCHAR(100) NOT NULL,   -- 'max_users', 'max_locations', 'max_pos_terminals', 'ecommerce_access'
  value_int    INTEGER,                 -- used for numeric limits
  value_bool   BOOLEAN,                -- used for feature flags
  UNIQUE(plan_id, feature_key)
);`);


await client.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_company_subscriptions_company
  ON company_subscriptions(company_id);
`);


    await client.query(`
      CREATE TABLE IF NOT EXISTS company_user_map (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      username     VARCHAR(100),
      responsibility_id INT,
      location_id  INTEGER,
      warehouse_id INTEGER,
      is_active    BOOLEAN DEFAULT TRUE,
      joined_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, username),
      UNIQUE(user_id, company_id)
);
  `);


        await client.query(`
      INSERT INTO plans (name, price_monthly, price_yearly, billing_period, features, display_order, is_active)
      VALUES
        ('INSTORE', 500, 5500, 'Monthly / Yearly', '["Point-of-sale ready website", "Inventory and order dashboard", "Fast storefront setup"]'::jsonb, 1, TRUE),
        ('BASIC', 1500, 16500, 'Monthly / Yearly', '["Online catalog and checkout", "Business admin workspace", "Customer and order management"]'::jsonb, 2, TRUE),
        ('GROWTH', 6000, 56000, 'Monthly / Yearly', '["Multi-location operations", "Advanced ecommerce controls", "Team roles and approval flows"]'::jsonb, 3, TRUE),
        ('ENTERPRISE', 22500, 247500, 'Monthly / Yearly', '["Scalable rollout for large teams", "Custom operations support", "Priority launch assistance"]'::jsonb, 4, TRUE)
      ON CONFLICT (name) DO UPDATE
      SET
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        billing_period = EXCLUDED.billing_period,
        features = EXCLUDED.features,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active;
    `);

    await client.query(`
    INSERT INTO plan_features (plan_id, feature_key, value_int, value_bool)
SELECT p.id, v.feature_key, v.value_int, v.value_bool
FROM plans p
JOIN (
  VALUES
    -- 1) INSTORE Plan
    ('INSTORE', 'max_users', 5, NULL::BOOLEAN),
    ('INSTORE', 'max_locations', 1, NULL::BOOLEAN),
    ('INSTORE', 'max_warehouses', 1, NULL::BOOLEAN),
    ('INSTORE', 'ecommerce_access', NULL::INTEGER, FALSE),

    -- 3) BASIC Plan (Includes ecommerce)
    ('BASIC', 'max_warehouses', 1, NULL::BOOLEAN),
    ('BASIC', 'ecommerce_access', NULL::INTEGER, TRUE),

    -- 4) GROWTH Plan
    ('GROWTH', 'max_users', 10, NULL::BOOLEAN),

    -- 5) ENTERPRISE Plan (-1 typically denotes 'Unlimited')
    ('ENTERPRISE', 'max_users', -1, NULL::BOOLEAN),
    ('ENTERPRISE', 'max_warehouses', -1, NULL::BOOLEAN),
    ('ENTERPRISE', 'ecommerce_access', NULL::INTEGER, TRUE),

    -- 6) ADVANCED Plan (Customizable / Unlimited / Flexible)
    ('ADVANCED', 'max_users', -1, NULL::BOOLEAN),
    ('ADVANCED', 'max_locations', -1, NULL::BOOLEAN),
    ('ADVANCED', 'max_warehouses', -1, NULL::BOOLEAN),
    ('ADVANCED', 'ecommerce_access', NULL::INTEGER, TRUE)
) AS v(plan_name, feature_key, value_int, value_bool)
  ON v.plan_name = p.name
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET
  value_int = EXCLUDED.value_int,
  value_bool = EXCLUDED.value_bool;
    `);

    await ensureResponsibilitySchema(client);



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

