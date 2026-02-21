const ENCRYPTION_KEY = Deno.env.get("BYOK_ENCRYPTION_KEY")!;

export async function encryptKey(plaintext: string): Promise<string> {
  const keyBytes = hexToBytes(ENCRYPTION_KEY);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer, "AES-GCM", false, ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return bytesToHex(iv) + ":" + bytesToHex(new Uint8Array(ciphertext));
}

export async function decryptKey(encrypted: string): Promise<string> {
  const [ivHex, ctHex] = encrypted.split(":");
  if (!ivHex || !ctHex) return encrypted;
  const keyBytes = hexToBytes(ENCRYPTION_KEY);
  const key = await crypto.subtle.importKey(
    "raw", keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer, "AES-GCM", false, ["decrypt"]
  );
  const iv = hexToBytes(ivHex);
  const ct = hexToBytes(ctHex);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) }, key, new Uint8Array(ct)
  );
  return new TextDecoder().decode(decrypted);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}