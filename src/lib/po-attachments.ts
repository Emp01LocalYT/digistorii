import path from "path";
import { access, mkdir, writeFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import { randomUUID } from "crypto";
import { getTenantUploadsRoot, sanitizeFilename } from "@/lib/image-master";

export function getPoAttachmentsDir(tenant: string): string {
  return path.join(getTenantUploadsRoot(tenant), "po-attachments");
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function savePoAttachment(
  tenant: string,
  file: File
): Promise<string> {
  const dir = getPoAttachmentsDir(tenant);
  await ensureDir(dir);

  const original = sanitizeFilename(file.name);
  const ext = path.extname(original);
  const base = path.basename(original, ext);
  let finalName = original;

  if (await fileExists(path.join(dir, finalName))) {
    finalName = `${base}-${randomUUID()}${ext}`;
  }

  const targetPath = path.join(dir, finalName);
  const content = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, content);

  return finalName;
}
