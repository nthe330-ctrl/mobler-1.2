import fs from 'fs';
import path from 'path';
import { LocalityData } from './types';

/**
 * File-backed store for locality data (kept separate from the booking database).
 * Writes are atomic (temp file + rename) and coalesced.
 *
 * Limitation: a JSON file must only be written by ONE process. The worker therefore
 * runs inside the API process (see worker.ts). Moving the worker to its own process
 * requires a real database first.
 */
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'locality.json');
const VERSION = 1;

function empty(): LocalityData {
  return { version: VERSION, places: [], requests: [], coverage: [], moderation: [], usage: [] };
}

class LocalityStore {
  data: LocalityData;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
    process.once('exit', () => this.flush());
  }

  private load(): LocalityData {
    try {
      if (fs.existsSync(FILE)) {
        const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
        return { ...empty(), ...parsed };
      }
    } catch (e) {
      console.warn('[locality] could not read store, starting empty:', (e as Error).message);
    }
    return empty();
  }

  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 150);
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data), 'utf-8');
      fs.renameSync(tmp, FILE);
    } catch (e) {
      console.warn('[locality] could not save store:', (e as Error).message);
    }
  }

  /** Test helper. */
  reset() {
    this.data = empty();
    this.flush();
  }
}

export const localityStore = new LocalityStore();
