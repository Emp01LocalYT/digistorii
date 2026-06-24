import { PoolClient } from "pg";

type AddressGroup = {
  line1: string;
  line2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
};

export const REGISTERED_ADDRESS_FIELDS: AddressGroup = {
  line1: "registered_address_line_1",
  line2: "registered_address_line_2",
  country: "registered_country",
  state: "registered_state",
  city: "registered_city",
  pincode: "registered_pincode",
};

export const BILL_ADDRESS_FIELDS: AddressGroup = {
  line1: "bill_address_line_1",
  line2: "bill_address_line_2",
  country: "bill_country",
  state: "bill_state",
  city: "bill_city",
  pincode: "bill_pincode",
};

export const SHIP_ADDRESS_FIELDS: AddressGroup = {
  line1: "ship_address_line_1",
  line2: "ship_address_line_2",
  country: "ship_country",
  state: "ship_state",
  city: "ship_city",
  pincode: "ship_pincode",
};

async function hasColumn(client: PoolClient, schema: string, column: string) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = 'locations'
       AND column_name = $2
     LIMIT 1`,
    [schema, column]
  );

  return Boolean(result.rowCount);
}

async function renameColumnIfNeeded(
  client: PoolClient,
  schema: string,
  currentName: string,
  nextName: string
) {
  const currentExists = await hasColumn(client, schema, currentName);
  const nextExists = await hasColumn(client, schema, nextName);

  if (currentExists && !nextExists) {
    await client.query(`
      ALTER TABLE "${schema}".locations
      RENAME COLUMN ${currentName} TO ${nextName};
    `);
  }
}

export async function ensureLocationTableShape(client: PoolClient, schema: string) {
  await renameColumnIfNeeded(client, schema, "address_line_1", REGISTERED_ADDRESS_FIELDS.line1);
  await renameColumnIfNeeded(client, schema, "address_line_2", REGISTERED_ADDRESS_FIELDS.line2);
  await renameColumnIfNeeded(client, schema, "country", REGISTERED_ADDRESS_FIELDS.country);
  await renameColumnIfNeeded(client, schema, "state", REGISTERED_ADDRESS_FIELDS.state);
  await renameColumnIfNeeded(client, schema, "city", REGISTERED_ADDRESS_FIELDS.city);
  await renameColumnIfNeeded(client, schema, "pincode", REGISTERED_ADDRESS_FIELDS.pincode);

  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.line1} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.line2} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.country} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.state} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.city} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${REGISTERED_ADDRESS_FIELDS.pincode} VARCHAR(20);
  `);

  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.line1} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.line2} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.country} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.state} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.city} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${BILL_ADDRESS_FIELDS.pincode} VARCHAR(20);
  `);

  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.line1} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.line2} TEXT;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.country} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.state} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.city} VARCHAR(120);
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS ${SHIP_ADDRESS_FIELDS.pincode} VARCHAR(20);
  `);

  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS same_as_registered BOOLEAN DEFAULT FALSE;
  `);
  await client.query(`
    ALTER TABLE "${schema}".locations
    ADD COLUMN IF NOT EXISTS same_as_bill_to BOOLEAN DEFAULT FALSE;
  `);

  const hasNumber = await hasColumn(client, schema, "number");
  const hasBuilding = await hasColumn(client, schema, "building");
  const hasStreet = await hasColumn(client, schema, "street");
  const hasLocality = await hasColumn(client, schema, "locality");
  const hasSameAsShipTo = await hasColumn(client, schema, "same_as_ship_to");

  if (hasNumber || hasBuilding || hasStreet || hasLocality || hasSameAsShipTo) {
    const line1Parts: string[] = [];
    if (hasNumber) line1Parts.push(`NULLIF(number, '')`);
    if (hasBuilding) line1Parts.push(`NULLIF(building, '')`);
    if (hasStreet) line1Parts.push(`NULLIF(street, '')`);

    const registeredLine1Expr = line1Parts.length
      ? `NULLIF(CONCAT_WS(', ', ${line1Parts.join(", ")}), '')`
      : "NULL";
    const registeredLine2Expr = hasLocality ? `NULLIF(locality, '')` : "NULL";
    const sameAsBillToExpr = hasSameAsShipTo
      ? `COALESCE(same_as_bill_to, same_as_ship_to, FALSE)`
      : `COALESCE(same_as_bill_to, FALSE)`;

    await client.query(`
      UPDATE "${schema}".locations
      SET
        ${REGISTERED_ADDRESS_FIELDS.line1} = COALESCE(NULLIF(${REGISTERED_ADDRESS_FIELDS.line1}, ''), ${registeredLine1Expr}),
        ${REGISTERED_ADDRESS_FIELDS.line2} = COALESCE(NULLIF(${REGISTERED_ADDRESS_FIELDS.line2}, ''), ${registeredLine2Expr}),
        same_as_bill_to = ${sameAsBillToExpr};
    `);
  }

  await client.query(`
    UPDATE "${schema}".locations
    SET
      ${BILL_ADDRESS_FIELDS.line1} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.line1}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.line1}, '')),
      ${BILL_ADDRESS_FIELDS.line2} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.line2}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.line2}, '')),
      ${BILL_ADDRESS_FIELDS.country} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.country}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.country}, '')),
      ${BILL_ADDRESS_FIELDS.state} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.state}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.state}, '')),
      ${BILL_ADDRESS_FIELDS.city} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.city}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.city}, '')),
      ${BILL_ADDRESS_FIELDS.pincode} = COALESCE(NULLIF(${BILL_ADDRESS_FIELDS.pincode}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.pincode}, '')),
      ${SHIP_ADDRESS_FIELDS.line1} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.line1}, ''), NULLIF(${BILL_ADDRESS_FIELDS.line1}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.line1}, '')),
      ${SHIP_ADDRESS_FIELDS.line2} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.line2}, ''), NULLIF(${BILL_ADDRESS_FIELDS.line2}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.line2}, '')),
      ${SHIP_ADDRESS_FIELDS.country} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.country}, ''), NULLIF(${BILL_ADDRESS_FIELDS.country}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.country}, '')),
      ${SHIP_ADDRESS_FIELDS.state} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.state}, ''), NULLIF(${BILL_ADDRESS_FIELDS.state}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.state}, '')),
      ${SHIP_ADDRESS_FIELDS.city} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.city}, ''), NULLIF(${BILL_ADDRESS_FIELDS.city}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.city}, '')),
      ${SHIP_ADDRESS_FIELDS.pincode} = COALESCE(NULLIF(${SHIP_ADDRESS_FIELDS.pincode}, ''), NULLIF(${BILL_ADDRESS_FIELDS.pincode}, ''), NULLIF(${REGISTERED_ADDRESS_FIELDS.pincode}, '')),
      same_as_registered = COALESCE(same_as_registered, FALSE),
      same_as_bill_to = COALESCE(same_as_bill_to, FALSE);
  `);

  const legacyColumns = [
    "number",
    "building",
    "street",
    "locality",
    "same_as_ship_to",
    "ship_to_location",
    "ship_to_site",
    "receiving_site",
    "office_site",
    "bill_to_site",
    "internal_site",
  ];

  for (const column of legacyColumns) {
    await client.query(`
      ALTER TABLE "${schema}".locations
      DROP COLUMN IF EXISTS ${column};
    `);
  }
}
