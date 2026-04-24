import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export const runtime = "nodejs";

type TagPayload = {
  image_ids?: number[];
  image_id?: number;
  category_id?: number | null;
  material_id?: number | null;
  uom_id?: number | null;
  source?: "own" | "vendor" | null;
};

export async function PATCH(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { schema } = await getTenantSchema(req);
    const payload = (await req.json()) as TagPayload;

    const ids = Array.isArray(payload.image_ids)
      ? payload.image_ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : payload.image_id
      ? [Number(payload.image_id)].filter((id) => Number.isFinite(id) && id > 0)
      : [];

    console.log("Updating tags for image IDs:", ids);

    if (!ids.length) {
      return NextResponse.json({ message: "image_ids is required" }, { status: 400 });
    }

    const setParts: string[] = [];
    const params: Array<string | number | null> = [];
    let index = 1;

    if (Object.prototype.hasOwnProperty.call(payload, "category_id")) {
      setParts.push(`category_id = $${index}`);
      params.push(payload.category_id ?? null);
      index += 1;
      console.log("Updating category_id to:", payload.category_id);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "material_id")) {
      setParts.push(`material_id = $${index}`);
      params.push(payload.material_id ?? null);
      index += 1;
        console.log("Updating material_id to:", payload.material_id);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "uom_id")) {
      setParts.push(`uom_id = $${index}`);
      params.push(payload.uom_id ?? null);
      index += 1;
      console.log("Updating uom_id to:", payload.uom_id);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "source")) {
      const sourceValue =
        payload.source === "own" || payload.source === "vendor" ? payload.source : null;
      setParts.push(`source = $${index}`);
      params.push(sourceValue);
      index += 1;
    }

    if (!setParts.length) {
      return NextResponse.json({ message: "No tag fields provided" }, { status: 400 });
    }

    params.push(ids);
    const updateRes = await client.query(
      `
        UPDATE "${schema}".image_master
        SET ${setParts.join(", ")}
        WHERE id = ANY($${index}::bigint[])
        RETURNING id
      `,
      params
    );

    return NextResponse.json({ success: true, updated: updateRes.rowCount || 0 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update tags" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
