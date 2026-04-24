import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const [categoriesRes, materialsRes, uomRes] = await Promise.all([
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
          SELECT id, uom_name
          FROM "${schema}".uom
          ORDER BY uom_name ASC
        `
      ),
    ]);

    const categories = categoriesRes.rows
      .map((row: { id: number; path_string: string | null; category_name: string }) => {
        const label = (row.path_string || row.category_name || "").trim();
        return label ? { id: row.id, label } : null;
      })
      .filter(Boolean) as { id: number; label: string }[];

    const materials = materialsRes.rows
      .map((row: { id: number; material_code: string; material_name: string }) => {
        const code = String(row.material_code || "").trim();
        const name = String(row.material_name || "").trim();
        const label = code && name ? `${code} - ${name}` : "";
        return label ? { id: row.id, label } : null;
      })
      .filter(Boolean) as { id: number; label: string }[];

    const uoms = uomRes.rows
      .map((row: { id: number; uom_name: string }) => {
        const label = String(row.uom_name || "").trim();
        return label ? { id: row.id, label } : null;
      })
      .filter(Boolean) as { id: number; label: string }[];

    const categoryLabels = new Map(categories.map((c) => [String(c.id), c.label]));
    const materialLabels = new Map(materials.map((m) => [String(m.id), m.label]));
    const uomLabels = new Map(uoms.map((u) => [String(u.id), u.label]));

    const parseNumericFilters = (values: string[]) =>
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);

    const filterCategories = parseNumericFilters(req.nextUrl.searchParams.getAll("category"));
    const filterMaterials = parseNumericFilters(req.nextUrl.searchParams.getAll("material"));
    const filterUoms = parseNumericFilters(req.nextUrl.searchParams.getAll("uom"));
    const filterSources = req.nextUrl.searchParams
      .getAll("source")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value === "own" || value === "vendor");

    const where: string[] = [];
    const params: Array<string[] | number[]> = [];
    let index = 1;

    if (filterCategories.length) {
      where.push(`im.category_id = ANY($${index}::bigint[])`);
      params.push(filterCategories);
      index += 1;
    }
    if (filterMaterials.length) {
      where.push(`im.material_id = ANY($${index}::int[])`);
      params.push(filterMaterials);
      index += 1;
    }
    if (filterUoms.length) {
      where.push(`im.uom_id = ANY($${index}::int[])`);
      params.push(filterUoms);
      index += 1;
    }
    if (filterSources.length) {
      where.push(`im.source = ANY($${index}::text[])`);
      params.push(filterSources);
    }

    const imagesRes = await client.query(
      `
        SELECT filename, category_id, material_id, uom_id, source
        FROM "${schema}".image_master im
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY im.category_id, im.material_id, im.uom_id, im.source, im.filename
      `,
      params
    );

    const grouped = new Map<
      string,
      { category_id: number | null; material_id: number | null; uom_id: number | null; source: string | null; filenames: string[] }
    >();

    imagesRes.rows.forEach(
      (row: { filename: string; category_id: number | null; material_id: number | null; uom_id: number | null; source: string | null }) => {
        const key = `${row.category_id ?? ""}|${row.material_id ?? ""}|${row.uom_id ?? ""}|${row.source ?? ""}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            category_id: row.category_id,
            material_id: row.material_id,
            uom_id: row.uom_id,
            source: row.source,
            filenames: [],
          });
        }
        grouped.get(key)?.filenames.push(row.filename);
      }
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");
    worksheet.columns = [
      { header: "SKU", key: "sku", width: 20 },
      { header: "Name", key: "name", width: 28 },
      { header: "Category", key: "category", width: 30 },
      { header: "Material", key: "material", width: 26 },
      { header: "UOM", key: "uom", width: 14 },
      { header: "Source", key: "source", width: 12 },
      { header: "HSN Code", key: "hsn_code", width: 16 },
      { header: "Description", key: "description", width: 36 },
      { header: "Low stock amount", key: "low_stock_amount", width: 18 },
      { header: "Backorders allowed", key: "backorders_allowed", width: 20 },
      { header: "Weight (kg)", key: "weight", width: 14 },
      { header: "Length (cm)", key: "length", width: 14 },
      { header: "Width (cm)", key: "width", width: 14 },
      { header: "Height (cm)", key: "height", width: 14 },
      { header: "Images", key: "images", width: 28 },
      { header: "Parent SKU", key: "parent_sku", width: 20 },
      { header: "Color", key: "color", width: 14 },
      { header: "Size", key: "size", width: 14 },
      { header: "Fitting", key: "fitting", width: 14 },
      { header: "Gender", key: "gender", width: 12 },
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

    const listSheet = workbook.addWorksheet("Lists");
    listSheet.getColumn(1).values = ["Category", ...categories.map((c) => c.label)];
    listSheet.getColumn(2).values = ["Category ID", ...categories.map((c) => c.id)];
    listSheet.getColumn(3).values = ["Material", ...materials.map((m) => m.label)];
    listSheet.getColumn(4).values = ["Material ID", ...materials.map((m) => m.id)];
    listSheet.getColumn(5).values = ["UOM", ...uoms.map((u) => u.label)];
    listSheet.getColumn(6).values = ["UOM ID", ...uoms.map((u) => u.id)];
    listSheet.state = "veryHidden";

    const categoryRange = categories.length
      ? `Lists!$A$2:$A$${categories.length + 1}`
      : `Lists!$A$2:$A$2`;
    const materialRange = materials.length
      ? `Lists!$C$2:$C$${materials.length + 1}`
      : `Lists!$C$2:$C$2`;
    const uomRange = uoms.length ? `Lists!$E$2:$E$${uoms.length + 1}` : `Lists!$E$2:$E$2`;

    const maxRows = 500;
    // worksheet.dataValidations.add(`C2:C${maxRows}`, {
    //   type: "list",
    //   allowBlank: true,
    //   showErrorMessage: true,
    //   errorStyle: "error",
    //   errorTitle: "Invalid category",
    //   error: "Invalid category. Please use dropdown values only.",
    //   formulae: [categoryRange],
    // });
    // worksheet.dataValidations.add(`D2:D${maxRows}`, {
    //   type: "list",
    //   allowBlank: true,
    //   showErrorMessage: true,
    //   errorStyle: "error",
    //   errorTitle: "Invalid material",
    //   error: "Invalid material. Please use dropdown values only.",
    //   formulae: [materialRange],
    // });
    // worksheet.dataValidations.add(`E2:E${maxRows}`, {
    //   type: "list",
    //   allowBlank: true,
    //   showErrorMessage: true,
    //   errorStyle: "error",
    //   errorTitle: "Invalid UOM",
    //   error: "Invalid UOM. Please use dropdown values only.",
    //   formulae: [uomRange],
    // });

    grouped.forEach((group) => {
      const baseRow = {
        sku: "",
        name: "",
        category: group.category_id ? categoryLabels.get(String(group.category_id)) || "" : "",
        material: group.material_id ? materialLabels.get(String(group.material_id)) || "" : "",
        uom: group.uom_id ? uomLabels.get(String(group.uom_id)) || "" : "",
        source: group.source || "",
        hsn_code: "",
        description: "",
        low_stock_amount: "",
        backorders_allowed: "",
        weight: "",
        length: "",
        width: "",
        height: "",
        parent_sku: "",
        color: "",
        size: "",
        fitting: "",
        gender: "",
      };

      if (!group.filenames.length) {
        worksheet.addRow({ ...baseRow, images: "" });
        return;
      }

      group.filenames.forEach((filename) => {
        worksheet.addRow({ ...baseRow, images: filename });
      });
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
