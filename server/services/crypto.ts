import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY = process.env.AES_MASTER_KEY || "default-key-for-development-only";

export function encryptFile(buffer: Buffer): { 
  encrypted: Buffer; 
  iv: Buffer; 
  authTag: Buffer; 
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, MASTER_KEY);
  cipher.setAutoPadding(false);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return { encrypted, iv, authTag };
}

export function decryptFile(
  encrypted: Buffer, 
  iv: Buffer, 
  authTag: Buffer
): Buffer {
  const decipher = crypto.createDecipher(ALGORITHM, MASTER_KEY);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

export function generateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function generateHMAC(buffer: Buffer, key: string): string {
  return crypto.createHmac('sha256', key).update(buffer).digest('hex');
}
