import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

const categorySchema = z.object({
  category_name: z.string().trim().min(1, "Category name is required"),
  parent_id: z.union([z.number(), z.string()]).optional().nullable(),
});

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

async function hasChildren(client: any, schema: string, id: number) {
  const result = await client.query(
    `SELECT 1 FROM "${schema}".product_categories WHERE parent_id = $1 LIMIT 1`,
    [id]
  );
  return result.rowCount > 0;
}

async function isParentInSubtree(client: any, schema: string, id: number, parentId: number) {
  const result = await client.query(
    `
      WITH RECURSIVE subtree AS (
        SELECT id, parent_id
        FROM "${schema}".product_categories
        WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_id
        FROM "${schema}".product_categories c
        INNER JOIN subtree s ON c.parent_id = s.id
      )
      SELECT id FROM subtree WHERE id = $2
    `,
    [id, parentId]
  );
  return result.rowCount > 0;
}
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    const { schema } = await getTenantSchema(req);
    const {id}=await params;
    const recordId = parseId(id);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid category id" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = categorySchema.parse(body);
    const parentId = parseId(parsed.parent_id ?? null);

    if (parentId === recordId) {
      return NextResponse.json({ success: false, error: "Category cannot be its own parent" }, { status: 400 });
    }

    if (parentId) {
      const parent = await getParentLevel(client, schema, parentId);
      if (!parent) {
        return NextResponse.json({ success: false, error: "Parent category not found" }, { status: 400 });
      }
      const isCycle = await isParentInSubtree(client, schema, recordId, parentId);
      if (isCycle) {
        return NextResponse.json({ success: false, error: "Parent category cannot be a child" }, { status: 400 });
      }
    }

    let level = 1;
    if (parentId) {
      const parent = await getParentLevel(client, schema, parentId);
      level = Number(parent.level) + 1;
    }

    await client.query("BEGIN");
    inTransaction = true;

    await client.query(
      `
        UPDATE "${schema}".product_categories
        SET category_name = $1, parent_id = $2, level = $3
        WHERE id = $4
      `,
      [parsed.category_name.trim(), parentId, level, recordId]
    );

    await client.query(
      `
        WITH RECURSIVE tree AS (
          SELECT id, parent_id, 1 AS depth
          FROM "${schema}".product_categories
          WHERE id = $1
          UNION ALL
          SELECT c.id, c.parent_id, tree.depth + 1
          FROM "${schema}".product_categories c
          INNER JOIN tree ON c.parent_id = tree.id
        )
        UPDATE "${schema}".product_categories AS c
        SET level = $2 + tree.depth - 1
        FROM tree
        WHERE c.id = tree.id
      `,
      [recordId, level]
    );

    await client.query("COMMIT");
    inTransaction = false;

    const result = await client.query(
      `SELECT id, category_name, parent_id, level, inactive_date, created_at FROM "${schema}".product_categories WHERE id = $1`,
      [recordId]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || "Update failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    if (!schema || !schemaValidator.test(schema)) {
      return NextResponse.json({ success: false, error: "Invalid schema" }, { status: 400 });
    }

    const {id} = await params;
    const recordId = parseId(id);
    if (!recordId) {
      return NextResponse.json({ success: false, error: "Invalid category id" }, { status: 400 });
    }

    const childrenExist = await hasChildren(client, schema, recordId);
    if (childrenExist) {
      return NextResponse.json(
        { success: false, error: "Cannot delete category with children" },
        { status: 409 }
      );
    }

    await client.query(`DELETE FROM "${schema}".product_categories WHERE id = $1`, [recordId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
