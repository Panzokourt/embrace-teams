// AES-GCM 256 encrypt/decrypt for IMAP/SMTP passwords.
// Stored format: base64(iv) + ":" + base64(ciphertext_with_tag)

function getKeyBytes(): Uint8Array {
  const raw = Deno.env.get("EMAIL_CREDENTIALS_KEY");
  if (!raw) throw new Error("EMAIL_CREDENTIALS_KEY not configured");
  let bytes: Uint8Array;
  try {
    const bin = atob(raw);
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    bytes = new TextEncoder().encode(raw);
  }
  if (bytes.length !== 32) {
    throw new Error(`EMAIL_CREDENTIALS_KEY must decode to 32 bytes, got ${bytes.length}`);
  }
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    getKeyBytes(),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encryptPassword(plain: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
  );
  return `${b64(iv)}:${b64(ct)}`;
}

export async function decryptPassword(stored: string): Promise<string> {
  const [ivB64, ctB64] = stored.split(":");
  if (!ivB64 || !ctB64) throw new Error("Invalid encrypted password format");
  const key = await importKey();
  const iv = unb64(ivB64);
  const ct = unb64(ctB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
