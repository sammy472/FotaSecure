import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = process.env.FIRMWARE_STORAGE_DIR || "./storage/firmwares";

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function saveFile(filename: string, buffer: Buffer): Promise<string> {
  await ensureStorageDir();
  
  const filePath = path.join(STORAGE_DIR, filename);
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

export async function getFile(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}