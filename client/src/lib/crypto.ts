// Browser-side AES-256-GCM encryption using Web Crypto API
export async function encryptFile(file: File): Promise<{
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  authTag: Uint8Array;
}> {
  // Generate a random key (in production, this should be derived from a master key)
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Convert file to ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Encrypt the file
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    fileBuffer
  );

  // Extract auth tag (last 16 bytes)
  const encryptedArray = new Uint8Array(encryptedData);
  const authTag = encryptedArray.slice(-16);
  const ciphertext = encryptedArray.slice(0, -16);

  return {
    encryptedData: ciphertext.buffer,
    iv,
    authTag,
  };
}

export async function generateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
