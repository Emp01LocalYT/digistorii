import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const body = await req.json();
    const variantIdsRaw = Array.isArray(body?.variant_ids)
      ? body.variant_ids
      : body?.variant_id != null
        ? [body.variant_id]
        : [];

    const variantIds = variantIdsRaw
      .map((id: unknown) => toNumber(id))
      .filter((id: number | null): id is number => id !== null);

    if (!variantIds.length) {
      return NextResponse.json(
        { success: false, error: "variant_ids are required" },
        { status: 400 }
      );
    }

    await client.query(
      `
        UPDATE "${schema}".product_pricing
        SET is_active = FALSE, updated_at = NOW()
        WHERE tenant_id = $1
          AND is_active = TRUE
          AND expires_at IS NOT NULL
          AND CURRENT_DATE > expires_at::date
      `,
      [company]
    );

    const result = await client.query(
      `
        SELECT
          pp.variant_id::int,
          pp.unit_price,
          pp.tax_percent,
          tm.id::int AS tax_id,
          tm.tax_name
        FROM "${schema}".product_pricing pp
        LEFT JOIN "${schema}".tax_master tm
          ON tm.total_percentage = pp.tax_percent
          AND tm.is_active = TRUE
        WHERE pp.tenant_id = $1
          AND pp.is_active = TRUE
          AND CURRENT_DATE >= pp.active_from::date
          AND (pp.expires_at IS NULL OR CURRENT_DATE <= pp.expires_at::date)
          AND pp.variant_id = ANY($2::bigint[])
      `,
      [company, variantIds]
    );

    const data: Record<
      string,
      {
        variant_id: number;
        unit_price: number;
        tax_percent: number;
        tax_id?: number | null;
        tax_name?: string | null;
      }
    > = {};

    result.rows.forEach((row) => {
      const key = String(row.variant_id);
      data[key] = {
        variant_id: Number(row.variant_id),
        unit_price: Number(row.unit_price || 0),
        tax_percent: Number(row.tax_percent || 0),
        tax_id: row.tax_id != null ? Number(row.tax_id) : null,
        tax_name: row.tax_name ? String(row.tax_name) : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pricing" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
