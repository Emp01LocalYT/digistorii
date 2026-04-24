import { NextRequest, NextResponse } from "next/server";
import { getTenantSchema } from "@/lib/tenant";
import { toTenantKey } from "@/lib/image-master";
import { savePoAttachment } from "@/lib/po-attachments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { company } = await getTenantSchema(req);
    const tenant = toTenantKey(company);
    const form = await req.formData();

    const file =
      (form.get("file") as File | null) ||
      (form.getAll("files").find((entry) => entry instanceof File) as File | undefined);

    if (!file || file.size === 0) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }

    const filename = await savePoAttachment(tenant, file);
    return NextResponse.json({ message: "Attachment uploaded", file: filename });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to upload attachment" }, { status: 400 });
  }
}
