import { NextRequest, NextResponse } from "next/server";
import { saveImageMasterFiles, toTenantKey } from "@/lib/image-master";
import { getTenantSchema } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { company } = await getTenantSchema(req);
    const tenant = toTenantKey(company);
    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => file.size > 0);

    if (!files.length) {
      return NextResponse.json({ message: "At least one file is required" }, { status: 400 });
    }

    const saved = await saveImageMasterFiles(tenant, files);
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to upload images" }, { status: 400 });
  }
}
