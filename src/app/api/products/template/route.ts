import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const TEMPLATE_COLUMNS = [
  { header: "Name*", key: "name", width: 28 },
  { header: "Description*", key: "description", width: 36 },
  { header: "Category", key: "category", width: 28 },
  { header: "Material", key: "material", width: 24 },
  { header: "UOM", key: "uom", width: 16 },
  { header: "Source", key: "source", width: 16 },
  { header: "Gender*", key: "gender", width: 16 },
  { header: "Fitting*", key: "fitting", width: 16 },
  { header: "HSN Code*", key: "hsn_code", width: 16 },
  { header: "Weight", key: "weight", width: 14 },
  { header: "Length", key: "length", width: 14 },
  { header: "Width", key: "width", width: 14 },
  { header: "Height", key: "height", width: 14 },
  { header: "Color*", key: "color", width: 16 },
  { header: "Size*", key: "size", width: 16 },
  { header: "Parent SKU (or SKU)", key: "parent_sku", width: 22 },
  { header: "SKU (or Parent SKU)", key: "sku", width: 22 },
  { header: "Low Stock Threshold", key: "low_stock_threshold", width: 22 },
  { header: "Backorders Allowed", key: "backorders_allowed", width: 22 },
  { header: "Barcode", key: "barcode", width: 20 },
];

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const [categoriesRes, materialsRes, uomRes, colorsRes, fittingsRes] = await Promise.all([
      client.query(
        `
          SELECT id, path_string, category_name
          FROM "${schema}".product_categories
          ORDER BY path_string ASC
        `
      ),
      client.query(
        `
          SELECT id, material_code, material_name
          FROM "${schema}".product_materials
          ORDER BY material_name ASC
        `
      ),
      client.query(
        `
          SELECT id, uom_name, uom_code
          FROM "${schema}".uom
          ORDER BY uom_name ASC
        `
      ),
      client.query(
        `
          SELECT id, color_name
          FROM "${schema}".product_colors
          ORDER BY color_name ASC
        `
      ),
      client.query(
        `
          SELECT id, fitting_name
          FROM "${schema}".product_fittings
          ORDER BY fitting_name ASC
        `
      ),

    ]);

    const categories = categoriesRes.rows
      .map((row: { path_string: string | null; category_name: string }) =>
        String(row.path_string || row.category_name || "").trim()
      )
      .filter(Boolean);
    const materials = materialsRes.rows
      .map((row: { material_code: string; material_name: string }) => {
        const code = String(row.material_code || "").trim();
        const name = String(row.material_name || "").trim();
        return code && name ? `${code} - ${name}` : name || code;
      })
      .filter(Boolean);
    const uoms = uomRes.rows
      .map((row: { uom_name: string; uom_code: string | null }) => {
        const name = String(row.uom_name || "").trim();
        const code = String(row.uom_code || "").trim();
        return code && name ? `${name}` : name;
      })
      .filter(Boolean);
    const colors = colorsRes.rows.map((r: any) => r.color_name);
    const fittings = fittingsRes.rows.map((r: any) => r.fitting_name);
    const genders = ["Male", "Female", "Transgender", "Not Specified"]
    const sources = ["own", "vendor"];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");
    worksheet.columns = TEMPLATE_COLUMNS;

    const headerRow = worksheet.getRow(1);
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.eachCell((cell) => {
      const text = String(cell.value || "");
      const isImportant = text.includes("*") || text.includes("(or ");
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isImportant ? "FFFFF1F2" : "FFEFF6FF" },
      };
      cell.font = {
        bold: true,
        color: { argb: text.includes("*") ? "FFB91C1C" : "FF111827" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const listSheet = workbook.addWorksheet("Lists");
    listSheet.getColumn(1).values = ["Category", ...categories];
    listSheet.getColumn(2).values = ["Material", ...materials];
    listSheet.getColumn(3).values = ["UOM", ...uoms];
    listSheet.getColumn(4).values = ["Source", ...sources];
    listSheet.getColumn(5).values = ["Color", ...colors];
    listSheet.getColumn(6).values = ["Fitting", ...fittings];
    listSheet.getColumn(7).values = ["Gender", ...genders];
    listSheet.state = "veryHidden";

    const maxRows = 500;
    const categoryRange = `Lists!$A$2:$A$${Math.max(categories.length + 1, 2)}`;
    const materialRange = `Lists!$B$2:$B$${Math.max(materials.length + 1, 2)}`;
    const uomRange = `Lists!$C$2:$C$${Math.max(uoms.length + 1, 2)}`;
    const sourceRange = `Lists!$D$2:$D$${Math.max(sources.length + 1, 2)}`;
    // ... (Keep your existing range definitions)
    const colorRange = `Lists!$E$2:$E$${Math.max(colors.length + 1, 2)}`;
    const fittingRange = `Lists!$F$2:$F$${Math.max(fittings.length + 1, 2)}`;
    const genderRange = `Lists!$G$2:$G$${Math.max(genders.length + 1, 2)}`;

    // 1. Category (Col C)
    (worksheet as any).dataValidations.add(`C2:C${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid category",
      error: "Choose a category from the list or leave it blank.",
      formulae: [categoryRange],
    });

    // 2. Material (Col D)
    (worksheet as any).dataValidations.add(`D2:D${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid material",
      error: "Choose a material from the list or leave it blank.",
      formulae: [materialRange],
    });

    // 3. UOM (Col E)
    (worksheet as any).dataValidations.add(`E2:E${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid UOM",
      error: "Choose a UOM from the list or leave it blank.",
      formulae: [uomRange],
    });

    // 4. Source (Col F)
    (worksheet as any).dataValidations.add(`F2:F${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid source",
      error: "Choose own/vendor from the list or leave it blank.",
      formulae: [sourceRange],
    });

    // 5. Gender (Col G)
    (worksheet as any).dataValidations.add(`G2:G${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid gender",
      error: "Choose a gender from the list.",
      formulae: [genderRange],
    });

    // 6. Fitting (Col H) - FIXED: Added missing validation block
    (worksheet as any).dataValidations.add(`H2:H${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid fitting",
      error: "Choose a fitting from the list.",
      formulae: [fittingRange],
    });

    // 7. Color (Col N) - FIXED: Added missing validation block
    (worksheet as any).dataValidations.add(`N2:N${maxRows}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid color",
      error: "Choose a color from the list.",
      formulae: [colorRange],
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to generate product template" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
