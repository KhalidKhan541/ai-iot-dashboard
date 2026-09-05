const BCRYPT_SALT_ROUNDS = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256(message: string): Promise<string> {
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return base64UrlEncode(hashArray);
}

async function hmacSign(
  key: string,
  message: string,
  algorithm: string = "SHA-256"
): Promise<string> {
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );
  const messageData = encoder.encode(message);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return base64UrlEncode(new Uint8Array(signature));
}

async function hmacVerify(
  key: string,
  message: string,
  signature: string,
  algorithm: string = "SHA-256"
): Promise<boolean> {
  const expectedSignature = await hmacSign(key, message, algorithm);
  return timingSafeEqual(
    encoder.encode(expectedSignature),
    encoder.encode(signature)
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

export interface JWTSignOptions {
  expiresIn?: number;
  issuer?: string;
  audience?: string;
  secret?: string;
}

export class JWT {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? process.env.JWT_SECRET ?? "";
    if (!this.secret) {
      throw new Error("JWT secret is required");
    }
  }

  async sign(
    payload: Omit<JWTPayload, "iat" | "exp">,
    options: JWTSignOptions = {}
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresIn ?? 3600;

    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
      iss: options.issuer,
      aud: options.audience,
    };

    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));

    const signature = await hmacSign(this.secret, `${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  async verify(token: string): Promise<JWTPayload> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    const isValid = await hmacVerify(
      this.secret,
      `${encodedHeader}.${encodedPayload}`,
      signature
    );

    if (!isValid) {
      throw new Error("Invalid JWT signature");
    }

    const payload: JWTPayload = JSON.parse(
      decoder.decode(base64UrlDecode(encodedPayload))
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("JWT has expired");
    }

    return payload;
  }

  async refresh(token: string, extendSeconds: number = 3600): Promise<string> {
    const payload = await this.verify(token);
    const { iat, exp, ...rest } = payload;
    return this.sign(rest, { expiresIn: extendSeconds });
  }

  decode(token: string): { header: Record<string, unknown>; payload: JWTPayload } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const header = JSON.parse(
        decoder.decode(base64UrlDecode(parts[0]))
      );
      const payload: JWTPayload = JSON.parse(
        decoder.decode(base64UrlDecode(parts[1]))
      );

      return { header, payload };
    } catch {
      return null;
    }
  }
}

export class PasswordHasher {
  private rounds: number;

  constructor(rounds: number = BCRYPT_SALT_ROUNDS) {
    this.rounds = rounds;
  }

  private async hashWithSalt(password: string, salt: string): Promise<string> {
    const data = encoder.encode(password + salt);
    let hash = data;

    for (let i = 0; i < this.rounds; i++) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", hash);
      hash = new Uint8Array(hashBuffer);
    }

    return `${salt}:${base64UrlEncode(hash)}`;
  }

  async hash(password: string): Promise<string> {
    const saltArray = new Uint8Array(16);
    crypto.getRandomValues(saltArray);
    const salt = base64UrlEncode(saltArray);
    return this.hashWithSalt(password, salt);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    const [salt] = hashedPassword.split(":");
    const hash = await this.hashWithSalt(password, salt);
    return timingSafeEqual(encoder.encode(hash), encoder.encode(hashedPassword));
  }
}

export class APIKeyManager {
  private prefix: string;

  constructor(prefix: string = "ak") {
    this.prefix = prefix;
  }

  generate(): { key: string; hashed: string } {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawKey = base64UrlEncode(randomBytes);
    const key = `${this.prefix}_${rawKey}`;

    return {
      key,
      hashed: this.hashKey(key),
    };
  }

  hashKey(key: string): string {
    const data = encoder.encode(key);
    return `${this.prefix}_hashed_${base64UrlEncode(new Uint8Array(data))}`;
  }

  validate(key: string, hashedKey: string): boolean {
    const computedHash = this.hashKey(key);
    return timingSafeEqual(
      encoder.encode(computedHash),
      encoder.encode(hashedKey)
    );
  }

  extractPrefix(key: string): string | null {
    const parts = key.split("_");
    return parts.length >= 2 ? parts[0] : null;
  }

  mask(key: string): string {
    if (key.length <= 8) return "****";
    const prefix = key.substring(0, 4);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${"*".repeat(Math.min(16, key.length - 8))}${suffix}`;
  }
}

export class EncryptionUtil {
  private algorithm = "AES-GCM";
  private keyLength = 256;

  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", key);
    return base64UrlEncode(new Uint8Array(raw));
  }

  async importKey(keyStr: string): Promise<CryptoKey> {
    const raw = base64UrlDecode(keyStr);
    return crypto.subtle.importKey(
      "raw",
      raw,
      { name: this.algorithm, length: this.keyLength },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(
    data: string,
    key: CryptoKey
  ): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encodedData
    );

    return {
      ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
      iv: base64UrlEncode(iv),
    };
  }

  async decrypt(
    ciphertext: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> {
    const ciphertextData = base64UrlDecode(ciphertext);
    const ivData = base64UrlDecode(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: ivData },
      key,
      ciphertextData
    );

    return decoder.decode(decrypted);
  }
}

export class OAuthState {
  generate(): string {
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    return base64UrlEncode(stateBytes);
  }

  async sign(state: string, secret: string): Promise<string> {
    const signature = await hmacSign(secret, state);
    return `${state}.${signature}`;
  }

  async verify(signedState: string, secret: string): Promise<string> {
    const lastDot = signedState.lastIndexOf(".");
    if (lastDot === -1) throw new Error("Invalid state format");

    const state = signedState.substring(0, lastDot);
    const signature = signedState.substring(lastDot + 1);

    const isValid = await hmacVerify(secret, state, signature);
    if (!isValid) throw new Error("Invalid state signature");

    return state;
  }
}

export const jwt = new JWT();
export const password = new PasswordHasher();
export const apiKeys = new APIKeyManager();
export const encryption = new EncryptionUtil();
export const oauth = new OAuthState();
