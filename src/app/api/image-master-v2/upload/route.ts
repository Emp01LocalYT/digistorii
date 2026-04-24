import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import path from "path";
import { writeFile } from "fs/promises";
import { pool } from "@/lib/db";
import {
  ensureDir,
  fileExists,
  getImageMasterDir,
  sanitizeFilename,
  toTenantKey,
} from "@/lib/image-master";
import { getTenantSchema } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const { company, schema } = await getTenantSchema(req);
    const tenant = toTenantKey(company);
    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => file.size > 0);

    if (!files.length) {
      return NextResponse.json({ message: "At least one file is required" }, { status: 400 });
    }

    const dir = getImageMasterDir(tenant);
    await ensureDir(dir);

    const insertedRows: any[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileHash = createHash("sha256").update(buffer).digest("hex");

      const existingRes = await client.query(
        `
          SELECT id, filename, file_path, category_id, material_id, uom_id, source, created_at
          FROM "${schema}".image_master
          WHERE file_hash = $1
          LIMIT 1
        `,
        [fileHash]
      );

      if (existingRes.rows.length) {
        insertedRows.push(existingRes.rows[0]);
        continue;
      }

      const original = sanitizeFilename(file.name);
      let finalName = original;
      if (await fileExists(path.join(dir, finalName))) {
        let unixSeconds = Math.floor(Date.now() / 1000);
        const parsed = path.parse(original);
        finalName = `${parsed.name}_${unixSeconds}${parsed.ext}`;
        while (await fileExists(path.join(dir, finalName))) {
          unixSeconds += 1;
          finalName = `${parsed.name}_${unixSeconds}${parsed.ext}`;
        }
      }

      const targetPath = path.join(dir, finalName);
      await writeFile(targetPath, buffer);

      const filePath = `${tenant}/image-master/${finalName}`;
      const insertRes = await client.query(
        `
          INSERT INTO "${schema}".image_master
            (filename, file_path, file_hash)
          VALUES ($1, $2, $3)
          RETURNING id, filename, file_path, category_id, material_id, uom_id, source, created_at
        `,
        [finalName, filePath, fileHash]
      );
      insertedRows.push(insertRes.rows[0]);
    }

    if (!insertedRows.length) {
      return NextResponse.json({ message: "No files were saved" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: insertedRows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload images" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
