import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

const schemaValidator = /^[a-z][a-z0-9_]{0,62}$/;

export async function POST(
  req: NextRequest,
  context : { params: Promise<{ id: string }> } // Next 16 requires Promise
) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);

    if (!schemaValidator.test(schema)) {
      return NextResponse.json({
        success: false,
        error: "Invalid schema",
      });
    }

    // Await params (Next 16 fix)
    const { id: taxId } = await context.params;

    const components = await req.json();

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json({
        success: false,
        error: "At least one component required",
      });
    }

    await client.query("BEGIN");

    // Calculate total safely
    let total = 0;
    for (const comp of components) {
      const percentage = Number(comp.component_percentage);

      if (isNaN(percentage)) {
        throw new Error("Invalid component percentage");
      }

      total += percentage;
    }

    // Fetch master total
    const masterRes = await client.query(
      `SELECT total_percentage FROM "${schema}".tax_master WHERE id = $1`,
      [taxId]
    );

    if (!masterRes.rows.length) {
      throw new Error("Tax master not found");
    }

    const masterTotal = Number(masterRes.rows[0].total_percentage);

    // console.log("Master total:", masterTotal);
    // console.log("Component total:", total);

    // Professional tolerance comparison (financial-safe)
    if (Math.abs(total - masterTotal) > 0.001) {
      throw new Error(
        `Component total (${total}) must equal master total (${masterTotal})`
      );
    }


     /* ================= FETCH EXISTING ================= */
    const existingRes = await client.query(
      `SELECT id, component_name, component_percentage
       FROM "${schema}".tax_component
       WHERE tax_master_id = $1`,
      [taxId]
    );

    const existing = existingRes.rows;

    /* ================= CHECK IF NO CHANGE ================= */
    const formattedNew = components.map((c: any) => ({
      component_name: c.component_name.trim(),
      component_percentage: Number(c.component_percentage),
    }));

    const formattedExisting = existing.map((c: any) => ({
      component_name: c.component_name.trim(),
      component_percentage: Number(c.component_percentage),
    }));

    if (
      JSON.stringify(formattedNew.sort((a,b)=>a.component_name.localeCompare(b.component_name))) ===
      JSON.stringify(formattedExisting.sort((a,b)=>a.component_name.localeCompare(b.component_name)))
    ) {
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "No changes detected",
      });
    }

    /* ================= UPDATE / INSERT / DELETE LOGIC ================= */

    const existingMap = new Map(
      existing.map((e: any) => [e.id, e])
    );

    const newIds = new Set(
      components.filter((c: any) => c.id).map((c: any) => c.id)
    );

    // Update existing rows
    for (const comp of components) {
      if (comp.id && existingMap.has(comp.id)) {
        await client.query(
          `UPDATE "${schema}".tax_component
           SET component_name = $1,
               component_percentage = $2
           WHERE id = $3`,
          [
            comp.component_name.trim(),
            Number(comp.component_percentage),
            comp.id,
          ]
        );
      }
    }

    // Insert new rows
    for (const comp of components) {
      if (!comp.id) {
        await client.query(
          `INSERT INTO "${schema}".tax_component
           (tax_master_id, component_name, component_percentage)
           VALUES ($1, $2, $3)`,
          [
            taxId,
            comp.component_name.trim(),
            Number(comp.component_percentage),
          ]
        );
      }
    }

    // Delete removed rows
    for (const e of existing) {
      if (!newIds.has(e.id)) {
        await client.query(
          `DELETE FROM "${schema}".tax_component WHERE id = $1`,
          [e.id]
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Components updated successfully",
    });

  } catch (error: any) {
    console.error("FULL ERROR:", error); //  Real error logging

    await client.query("ROLLBACK");

    return NextResponse.json({
      success: false,
      error: error.message || "Something went wrong",
    });
  } finally {
    client.release();
  }
}