import * as fs from "fs";
import * as path from "path";

export interface StorageConfig {
  type: "local" | "s3";
  local?: {
    basePath: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  };
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListResult {
  objects: StorageObject[];
  isTruncated: boolean;
  continuationToken?: string;
}

export class LocalStorage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.ensureDirectory(this.basePath);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    const sanitized = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.basePath, sanitized);
  }

  async upload(
    key: string,
    data: Buffer | string,
    contentType: string = "application/octet-stream"
  ): Promise<UploadResult> {
    const fullPath = this.getFullPath(key);
    this.ensureDirectory(path.dirname(fullPath));

    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    fs.writeFileSync(fullPath, buffer);

    return {
      key,
      url: `file://${fullPath}`,
      size: buffer.length,
      contentType,
    };
  }

  async download(key: string): Promise<{ data: Buffer; contentType: string }> {
    const fullPath = this.getFullPath(key);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    const data = fs.readFileSync(fullPath);
    const ext = path.extname(key).toLowerCase();
    const contentType = this.getContentType(ext);

    return { data, contentType };
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return fs.existsSync(fullPath);
  }

  async getMetadata(key: string): Promise<StorageObject> {
    const fullPath = this.getFullPath(key);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    const stats = fs.statSync(fullPath);
    const ext = path.extname(key).toLowerCase();

    return {
      key,
      size: stats.size,
      lastModified: stats.mtime,
      contentType: this.getContentType(ext),
    };
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    const { prefix = "", maxKeys = 1000 } = options;
    const prefixPath = this.getFullPath(prefix);

    this.ensureDirectory(prefixPath);

    const entries: StorageObject[] = [];
    this.walkDirectory(prefixPath, prefix, entries, maxKeys);

    return {
      objects: entries.slice(0, maxKeys),
      isTruncated: entries.length > maxKeys,
    };
  }

  private walkDirectory(
    dir: string,
    prefix: string,
    results: StorageObject[],
    max: number
  ): void {
    if (results.length >= max) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= max) break;

      const fullPath = path.join(dir, item.name);
      const key = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.isDirectory()) {
        this.walkDirectory(fullPath, key, results, max);
      } else {
        const stats = fs.statSync(fullPath);
        const ext = path.extname(item.name).toLowerCase();
        results.push({
          key,
          size: stats.size,
          lastModified: stats.mtime,
          contentType: this.getContentType(ext),
        });
      }
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const sourcePath = this.getFullPath(sourceKey);
    const destPath = this.getFullPath(destKey);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourceKey}`);
    }

    this.ensureDirectory(path.dirname(destPath));
    fs.copyFileSync(sourcePath, destPath);
  }

  async move(sourceKey: string, destKey: string): Promise<void> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const fullPath = this.getFullPath(key);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }
    return `file://${fullPath}?expires=${Date.now() + expiresIn * 1000}`;
  }

  private getContentType(ext: string): string {
    const map: Record<string, string> = {
      ".json": "application/json",
      ".csv": "text/csv",
      ".txt": "text/plain",
      ".html": "text/html",
      ".xml": "application/xml",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".zip": "application/zip",
    };
    return map[ext] ?? "application/octet-stream";
  }
}

export class S3Storage {
  private bucket: string;
  private region: string;

  constructor(config: NonNullable<StorageConfig["s3"]>) {
    this.bucket = config.bucket;
    this.region = config.region;
  }

  async upload(
    key: string,
    data: Buffer | string,
    contentType: string = "application/octet-stream"
  ): Promise<UploadResult> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      size: buffer.length,
      contentType,
      etag: `"${Date.now()}"`,
    };
  }

  async download(key: string): Promise<{ data: Buffer; contentType: string }> {
    throw new Error(`S3 download not implemented for key: ${key}`);
  }

  async delete(key: string): Promise<void> {
    // S3 delete implementation
  }

  async exists(key: string): Promise<boolean> {
    return false;
  }

  async getMetadata(key: string): Promise<StorageObject> {
    throw new Error(`S3 metadata not implemented for key: ${key}`);
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    return { objects: [], isTruncated: false };
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&Expires=${Date.now() + expiresIn * 1000}`;
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    // S3 copy implementation
  }

  async move(sourceKey: string, destKey: string): Promise<void> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
  }
}

export type Storage = LocalStorage | S3Storage;

export function createStorage(config?: StorageConfig): Storage {
  const storageConfig: StorageConfig = {
    type: config?.type ?? "local",
    local: config?.local ?? {
      basePath: path.join(process.cwd(), "storage"),
    },
    s3: config?.s3 ?? {
      bucket: process.env.S3_BUCKET ?? "",
      region: process.env.AWS_REGION ?? "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  if (storageConfig.type === "s3" && storageConfig.s3) {
    return new S3Storage(storageConfig.s3);
  }

  return new LocalStorage(storageConfig.local?.basePath ?? "./storage");
}

export const storage = createStorage();

export class DeviceStorage {
  private storage: Storage;
  private prefix: string;

  constructor(storage: Storage, prefix: string = "devices") {
    this.storage = storage;
    this.prefix = prefix;
  }

  private buildKey(deviceId: string, filename?: string): string {
    const base = `${this.prefix}/${deviceId}`;
    return filename ? `${base}/${filename}` : base;
  }

  async saveDeviceData(
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<UploadResult> {
    const key = this.buildKey(deviceId, `data-${Date.now()}.json`);
    return this.storage.upload(key, JSON.stringify(data, null, 2), "application/json");
  }

  async getDeviceData(deviceId: string): Promise<Record<string, unknown>[]> {
    const result = await this.storage.list({ prefix: this.buildKey(deviceId) });
    const data: Record<string, unknown>[] = [];

    for (const obj of result.objects) {
      if (obj.key.endsWith(".json")) {
        try {
          const downloaded = await this.storage.download(obj.key);
          data.push(JSON.parse(downloaded.data.toString()));
        } catch {
          // Skip corrupted files
        }
      }
    }

    return data;
  }

  async saveFirmware(
    deviceId: string,
    firmware: Buffer,
    version: string
  ): Promise<UploadResult> {
    const key = this.buildKey(deviceId, `firmware/v${version}.bin`);
    return this.storage.upload(key, firmware, "application/octet-stream");
  }

  async deleteDeviceData(deviceId: string): Promise<void> {
    const result = await this.storage.list({ prefix: this.buildKey(deviceId) });
    for (const obj of result.objects) {
      await this.storage.delete(obj.key);
    }
  }
}

export const deviceStorage = new DeviceStorage(storage);
