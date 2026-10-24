/**
 * Where uploaded images live.
 *
 * Two drivers behind one interface, chosen by STORAGE_DRIVER:
 *
 *   local (default) — writes under DATA_DIR/uploads and serves them back through
 *     /api/media/uploads/<name>. Exactly what the app did before. Fine for development
 *     and for a tunnelled demo; NOT durable on a cloud host, where the container's disk
 *     is wiped on every restart and deploy.
 *
 *   s3 — any S3-compatible bucket: Cloudflare R2, Supabase Storage, Backblaze B2,
 *     Wasabi, MinIO, AWS S3. They all speak the same API, so the provider is four
 *     environment variables rather than a code change, and switching away later costs
 *     a bucket copy instead of a rewrite.
 *
 * The S3 request is signed with AWS Signature V4 using only node:crypto — no SDK. The
 * official client pulls in a large dependency tree for the one PUT this app makes.
 *
 * Callers never learn which driver is active: put() returns the URL to store on the
 * record, and that is all the rest of the code ever handles.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface PutResult {
  /** The URL to persist on the review / menu item / shop record. */
  url: string;
}

export interface StorageDriver {
  readonly name: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
}

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

class LocalDriver implements StorageDriver {
  readonly name = 'local' as const;
  async put(key: string, body: Buffer): Promise<PutResult> {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, key), body);
    const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
    return { url: `${base}/api/media/uploads/${key}` };
  }
}

const sha256 = (data: crypto.BinaryLike) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: crypto.BinaryLike | crypto.KeyObject, data: string) =>
  crypto.createHmac('sha256', key as any).update(data, 'utf8').digest();

/** Each path segment is encoded, but the slashes between them are not. */
function encodeKeyPath(key: string): string {
  return key.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

export class S3Driver implements StorageDriver {
  readonly name = 's3' as const;
  constructor(
    private readonly cfg: {
      endpoint: string;      // https://<account>.r2.cloudflarestorage.com
      bucket: string;
      region: string;        // 'auto' for R2
      accessKeyId: string;
      secretAccessKey: string;
      /** Public base URL the images are served from (CDN / public bucket domain). */
      publicBase: string;
    }
  ) {}

  /** The exact string AWS SigV4 signs. Split out so it can be tested without a network. */
  buildCanonicalRequest(key: string, body: Buffer, contentType: string, amzDate: string, host: string) {
    const payloadHash = sha256(body);
    const canonicalUri = `/${this.cfg.bucket}/${encodeKeyPath(key)}`;
    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest =
      `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    return { canonicalRequest, signedHeaders, payloadHash, canonicalUri };
  }

  /** Authorization header value for this PUT. Pure — no I/O — so tests can assert it. */
  sign(key: string, body: Buffer, contentType: string, now: Date) {
    const host = new URL(this.cfg.endpoint).host;
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');   // 20260101T000000Z
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;

    const { canonicalRequest, signedHeaders, payloadHash, canonicalUri } =
      this.buildCanonicalRequest(key, body, contentType, amzDate, host);

    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`;
    const kDate = hmac(`AWS4${this.cfg.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, this.cfg.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    return {
      url: `${this.cfg.endpoint.replace(/\/$/, '')}${canonicalUri}`,
      headers: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization:
          `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKeyId}/${scope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`
      },
      amzDate,
      stringToSign
    };
  }

  async put(key: string, body: Buffer, contentType: string): Promise<PutResult> {
    const { url, headers } = this.sign(key, body, contentType, new Date());
    const res = await fetch(url, { method: 'PUT', body: new Uint8Array(body), headers });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Tải ảnh lên kho lưu trữ thất bại (${res.status}) ${detail.slice(0, 200)}`);
    }
    return { url: `${this.cfg.publicBase.replace(/\/$/, '')}/${encodeKeyPath(key)}` };
  }
}

let cached: StorageDriver | null = null;

/**
 * The active driver. Falls back to local — and says so — when STORAGE_DRIVER=s3 but the
 * configuration is incomplete, because silently writing to a disk that a cloud host
 * wipes is how uploads disappear without anyone noticing.
 */
export function storage(): StorageDriver {
  if (cached) return cached;
  if (process.env.STORAGE_DRIVER === 's3') {
    const cfg = {
      endpoint: process.env.S3_ENDPOINT || '',
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'auto',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      publicBase: process.env.S3_PUBLIC_BASE_URL || ''
    };
    const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length === 0) {
      cached = new S3Driver(cfg);
      console.log(`[MOBLER API] uploads → S3 (${cfg.bucket} @ ${cfg.endpoint})`);
      return cached;
    }
    console.warn(
      `[MOBLER API] STORAGE_DRIVER=s3 but missing: ${missing.join(', ')} — falling back to local disk. ` +
      'Uploads will NOT survive a redeploy on a cloud host.'
    );
  }
  cached = new LocalDriver();
  return cached;
}

/** Tests reconfigure the environment between cases. */
export function resetStorageForTests() {
  cached = null;
}

/**
 * Is this a URL our own storage produced?
 *
 * Review images arrive as strings in the request body, so without this a client could
 * store any URL it liked on a public shop page — an off-site tracker, a hotlink, or a
 * `javascript:` URI rendered into an <img>. Only paths this server handed out are kept.
 */
export function isOwnUploadUrl(url: unknown): boolean {
  const u = String(url ?? '').trim();
  if (!u || u.length > 512) return false;
  if (/^\/api\/media\/uploads\/[A-Za-z0-9_.-]+$/.test(u)) return true;
  const base = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const apiBase = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  for (const allowed of [base, apiBase].filter(Boolean)) {
    if (!/^https:\/\//.test(allowed)) continue;
    if (u.startsWith(allowed + '/') && !u.includes('..')) return true;
  }
  return false;
}
