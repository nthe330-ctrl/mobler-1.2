import fs from 'fs';
import path from 'path';

export type ComplianceReviewStatus = 'approved' | 'pending' | 'rejected';

export interface ComplianceReviewEntry {
  id: string; // compliance_review_ref
  status: ComplianceReviewStatus;
  approved_by?: string;
  approved_at?: string;
  scope?: string | string[];
  notes?: string;
}

export interface ComplianceRegistry {
  getReview(ref: string): ComplianceReviewEntry | undefined;
}

const DEFAULT_REGISTRY_FILE = path.join(process.cwd(), 'docs', 'compliance', 'reviews.json');

/**
 * File-backed compliance review registry that reads docs/compliance/reviews.json (read-only)
 */
export class FileComplianceRegistry implements ComplianceRegistry {
  private filePath: string;
  private cache: Map<string, ComplianceReviewEntry> = new Map();
  private lastMtime: number = 0;

  constructor(customPath?: string) {
    this.filePath = customPath || DEFAULT_REGISTRY_FILE;
    this.reload();
  }

  private reload(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const stats = fs.statSync(this.filePath);
        if (stats.mtimeMs > this.lastMtime) {
          const raw = fs.readFileSync(this.filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          this.cache.clear();
          if (Array.isArray(parsed)) {
            parsed.forEach((entry: ComplianceReviewEntry) => {
              if (entry && entry.id) {
                this.cache.set(entry.id, entry);
              }
            });
          }
          this.lastMtime = stats.mtimeMs;
        }
      }
    } catch {
      // Safe fallback if file unreadable or invalid JSON
    }
  }

  public getReview(ref: string): ComplianceReviewEntry | undefined {
    this.reload();
    return this.cache.get(ref);
  }
}

/**
 * In-memory compliance registry for testing without touching docs/compliance/reviews.json
 */
export class InMemoryComplianceRegistry implements ComplianceRegistry {
  private reviews: Map<string, ComplianceReviewEntry> = new Map();

  constructor(entries?: ComplianceReviewEntry[]) {
    if (entries) {
      entries.forEach(e => this.reviews.set(e.id, e));
    }
  }

  public register(entry: ComplianceReviewEntry): void {
    this.reviews.set(entry.id, entry);
  }

  public getReview(ref: string): ComplianceReviewEntry | undefined {
    return this.reviews.get(ref);
  }
}

export const defaultComplianceRegistry = new FileComplianceRegistry();
