import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const categorySchema = z.object({
  category_name: z.string().trim().min(1, "Category name is required"),
  parent_id: z.union([z.number(), z.string()]).optional().nullable(),
});

type CategoryInput = z.infer<typeof categorySchema>;

function parseId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function getParentLevel(client: any, schema: string, parentId: number) {
  const result = await client.query(
    `SELECT id, level FROM "${schema}".product_categories WHERE id = $1`,
    [parentId]
  );
  return result.rowCount ? result.rows[0] : null;
}

function buildTree(rows: any[]) {
  const map = new Map<number, any>();
  const roots: any[] = [];

  rows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      name: row.category_name,
      parent_id: row.parent_id,
      level: row.level,
      inactive_date: row.inactive_date,
      children: [],
    });
  });

  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const format = String(req.nextUrl.searchParams.get("format") || "").toLowerCase();
    const result = await client.query(
      `
        SELECT id, category_name, parent_id, level, path_string, path_ids, inactive_date, created_at
        FROM "${schema}".product_categories
        ORDER BY path_string ASC
      `
    );

    if (format === "tree") {
      const tree = buildTree(result.rows);
      return NextResponse.json({ success: true, data: tree });
    }

    const flat = result.rows.map((row: any) => ({
      id: row.id,
      path_string: row.path_string || row.category_name,
      level: row.level,
    }));
    return NextResponse.json({ success: true, data: flat });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Fetch failed" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = categorySchema.parse(body);
    const parentId = parseId(parsed.parent_id ?? null);

    let level = 1;
    if (parentId) {
      const parent = await getParentLevel(client, schema, parentId);
      if (!parent) {
        return NextResponse.json({ success: false, error: "Parent category not found" }, { status: 400 });
      }
      level = Number(parent.level) + 1;
    }

    const name = parsed.category_name.trim();

    await client.query("BEGIN");
    const insertResult = await client.query(
      `
        INSERT INTO "${schema}".product_categories
          (category_name, parent_id, level, inactive_date, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, category_name, parent_id, level
      `,
      [name, parentId, level, null]
    );

    const newId = insertResult.rows[0].id as number;
    let pathString = name;
    let pathIds = String(newId);

    if (parentId) {
      const parentResult = await client.query(
        `
          SELECT path_string, path_ids, category_name
          FROM "${schema}".product_categories
          WHERE id = $1
        `,
        [parentId]
      );
      const parent = parentResult.rows[0];
      if (!parent) {
        throw new Error("Parent category not found");
      }
      const parentPath = parent.path_string || parent.category_name;
      pathString = `${parentPath} > ${name}`;
      pathIds = `${parent.path_ids}.${String(newId)}`;
    }

    await client.query(
      `
        UPDATE "${schema}".product_categories
        SET path_string = $1, path_ids = $2
        WHERE id = $3
      `,
      [pathString, pathIds, newId]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      data: { id: newId, category_name: name, parent_id: parentId, level },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Insert failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
