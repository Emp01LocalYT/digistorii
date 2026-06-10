export async function ecomTables(client: any, schema: string) {
  // 1. Storefront
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_storefront (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255) NOT NULL,
      tagline VARCHAR(500),
      logo_url TEXT,
      banner_url TEXT,
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      address TEXT,
      meta_title VARCHAR(255),
      meta_description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 2. Customers
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_customers (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash TEXT NOT NULL,
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 3. Customer Addresses
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_customer_addresses (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES "${schema}".ec_customers(id) ON DELETE CASCADE,
      address_line1 VARCHAR(500) NOT NULL,
      address_line2 VARCHAR(500),
      city VARCHAR(120),
      state VARCHAR(120),
      pincode VARCHAR(20),
      country VARCHAR(120),
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 4. Cart
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_cart (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES "${schema}".ec_customers(id) ON DELETE CASCADE,
      session_token VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 5. Cart Items
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INTEGER NOT NULL REFERENCES "${schema}".ec_cart(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES "${schema}".product_variants(id),
      qty NUMERIC(18,3) NOT NULL DEFAULT 1,
      rate_at_add NUMERIC(18,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 6. Orders
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_orders (
      id SERIAL PRIMARY KEY,
      order_no VARCHAR(50) UNIQUE NOT NULL,

      customer_id INTEGER NOT NULL
        REFERENCES "${schema}".ec_customers(id),

      billing_address_id INTEGER
        REFERENCES "${schema}".ec_customer_addresses(id),

      shipping_address_id INTEGER
        REFERENCES "${schema}".ec_customer_addresses(id),

      order_status VARCHAR(30) NOT NULL DEFAULT 'pending',

      payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',

      payment_method VARCHAR(30) NOT NULL,

      subtotal NUMERIC(18,2) DEFAULT 0,
      discount_amount NUMERIC(18,2) DEFAULT 0,
      tax_amount NUMERIC(18,2) DEFAULT 0,
      grand_total NUMERIC(18,2) DEFAULT 0,

      notes TEXT,

      placed_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 7. Order Items
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_order_items (
      id SERIAL PRIMARY KEY,

      order_id INTEGER NOT NULL
        REFERENCES "${schema}".ec_orders(id) ON DELETE CASCADE,

      product_id INTEGER NOT NULL
        REFERENCES "${schema}".product_variants(id),

      uom VARCHAR(50),
      hsn_no VARCHAR(50),

      rate NUMERIC(18,2) NOT NULL DEFAULT 0,
      qty NUMERIC(18,3) NOT NULL DEFAULT 1,

      discount NUMERIC(18,2) DEFAULT 0,

      tax_master_id INTEGER
        REFERENCES "${schema}".tax_master(id),

      tax_amount NUMERIC(18,2) DEFAULT 0,

      line_total NUMERIC(18,2) DEFAULT 0
    );
  `);

  // 8. Payments
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_payments (
      id SERIAL PRIMARY KEY,

      order_id INTEGER NOT NULL
        REFERENCES "${schema}".ec_orders(id) ON DELETE CASCADE,

      gateway VARCHAR(50),
      gateway_txn_id VARCHAR(255),

      amount NUMERIC(18,2) NOT NULL,

      status VARCHAR(30) DEFAULT 'pending',

      paid_at TIMESTAMP,

      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 9. Shipments
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ec_shipments (
      id SERIAL PRIMARY KEY,

      order_id INTEGER NOT NULL
        REFERENCES "${schema}".ec_orders(id) ON DELETE CASCADE,

      courier_name VARCHAR(255),
      tracking_number VARCHAR(255),

      estimated_delivery_date DATE,

      status VARCHAR(30) DEFAULT 'packed',

      shipped_at TIMESTAMP,
      delivered_at TIMESTAMP,

      notes TEXT,

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}