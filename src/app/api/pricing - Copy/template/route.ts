import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";
import { calculatePricing } from "@/lib/pricing";

type PricingFilter = "priced" | "unpriced" | "both";

type TemplateRow = {
  sku: string;
  product_code: string;
  product_name: string;
  base_cost: string | number | null;
  operational_cost: string | number | null;
  margin_percent: string | number | null;
  active_from: string | Date | null;
  expires_at: string | Date | null;
};

function yyyyMmDdToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function parsePricingFilter(raw: string): PricingFilter {
  const value = raw.trim().toLowerCase();
  if (value === "priced" || value === "unpriced" || value === "both") return value;
  return "unpriced";
}

function asNumber(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asDateText(value: string | Date | null | undefined): string {
  if (!value) return "";
  const iso = new Date(value).toISOString();
  return iso.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const pricingFilter = parsePricingFilter(
      String(req.nextUrl.searchParams.get("pricingFilter") || "unpriced")
    );

    const includePriced = pricingFilter === "priced" || pricingFilter === "both";
    const includeUnpriced = pricingFilter === "unpriced" || pricingFilter === "both";

    const skuResult = await client.query<TemplateRow>(
      `
        SELECT
          pv.sku,
            pv.barcode,
          p.product_code,
          p.name AS product_name,
          pp.base_cost,
          pp.operational_cost,
          pp.margin_percent,
          pp.active_from,
          pp.expires_at
        FROM "${schema}".product_variants pv
        INNER JOIN "${schema}".products p
          ON p.id = pv.product_id
        LEFT JOIN "${schema}".product_pricing pp
          ON pp.tenant_id = $1
          AND pp.sku = pv.sku
          AND pp.is_active = TRUE
        WHERE pv.status IN ('draft', 'active', 'out_of_stock')
          AND p.status = 1
          AND (
            ($2::boolean = TRUE AND pp.id IS NOT NULL)
            OR
            ($3::boolean = TRUE AND pp.id IS NULL)
          )
        ORDER BY pv.sku ASC
      `,
      [company, includePriced, includeUnpriced]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pricing Template");
    worksheet.columns = [
      { header: "SKU", key: "sku", width: 24 },
      { header: "Product Code", key: "product_code", width: 24 },
      { header: "Product Name", key: "product_name", width: 32 },
      { header: "Base Cost", key: "base_cost", width: 16 },
      { header: "Operational Cost", key: "operational_cost", width: 18 },
      { header: "Margin", key: "margin", width: 14 },
      { header: "Landed Price", key: "landed_price", width: 16 },
      { header: "Selling Price", key: "selling_price", width: 16 },
      { header: "Effective Date", key: "effective_date", width: 16 },
      { header: "Expires At", key: "expires_at", width: 16 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const today = yyyyMmDdToday();
    for (const row of skuResult.rows) {
      const baseCost = asNumber(row.base_cost);
      const operationalCost = asNumber(row.operational_cost);
      const margin = asNumber(row.margin_percent);
      let landedPrice: number | string = "";
      let sellingPrice: number | string = "";
      try {
        const calc = calculatePricing({
          baseCost,
          operationalCost,
          marginPercent: margin,
        });
        landedPrice = calc.landedPrice;
        sellingPrice = calc.sellingPrice;
      } catch {
        landedPrice = "";
        sellingPrice = "";
      }

      worksheet.addRow({
        sku: row.sku,
        product_code: row.product_code,
        product_name: row.product_name,
        base_cost: row.base_cost ?? "",
        operational_cost: row.operational_cost ?? 0,
        margin: row.margin_percent ?? "",
        landed_price: landedPrice,
        selling_price: sellingPrice,
        effective_date: asDateText(row.active_from) || today,
        expires_at: asDateText(row.expires_at) || "",
      });
    }

    worksheet.getColumn("landed_price").protection = { locked: true };
    worksheet.getColumn("selling_price").protection = { locked: true };
    worksheet.getColumn("effective_date").numFmt = "yyyy-mm-dd";
    worksheet.getColumn("expires_at").numFmt = "yyyy-mm-dd";

    for (let i = 2; i <= worksheet.rowCount; i += 1) {
      const row = worksheet.getRow(i);
      row.getCell(1).protection = { locked: true }; // SKU
      row.getCell(2).protection = { locked: true }; // Product Code
      row.getCell(3).protection = { locked: true }; // Product Name
      row.getCell(4).protection = { locked: false }; // Base Cost
      row.getCell(5).protection = { locked: false }; // Operational Cost
      row.getCell(6).protection = { locked: false }; // Margin
      row.getCell(7).protection = { locked: true }; // Landed Price
      row.getCell(8).protection = { locked: true }; // Selling Price
      row.getCell(9).protection = { locked: false }; // Effective Date
      row.getCell(10).protection = { locked: false }; // Expires At
    }
    await worksheet.protect("pricing-template", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      insertRows: false,
      deleteRows: false,
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="pricing-update-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to generate pricing template" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}



