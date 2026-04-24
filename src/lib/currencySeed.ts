//C:\Users\yanna\template_tailwind\src\lib\currencySeed.ts
import currencyCodes from "currency-codes";
import { PoolClient } from "pg";

export async function ensureCurrenciesSeeded(client: PoolClient, schema: string) {
  // Check if already seeded
  const existing = await client.query(
    `SELECT 1 FROM "${schema}".currencies LIMIT 1`
  );

  if (existing.rowCount) {
    return { seeded: false, count: 0 };
  }

  // Get all currency data
  const entries = currencyCodes.data
    .map((c) => ({
      code: c.code,
      name: c.currency,
    }))
    .filter((c) => c.code && c.name)
    .sort((a, b) => a.code.localeCompare(b.code));

  const chunkSize = 200;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);

    const values = chunk
      .map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
      .join(", ");

    const params = chunk.flatMap((row) => [row.code, row.name]);

    const result = await client.query(
      `
      INSERT INTO "${schema}".currencies (currency_code, currency_name)
      VALUES ${values}
      ON CONFLICT (currency_code) DO NOTHING
      `,
      params
    );

    inserted += result.rowCount ?? 0;
  }

  return { seeded: true, count: inserted };
}