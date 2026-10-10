// Loaded first so every module sees the environment (JWT_SECRET, API keys...).
// Looks for .env in the backend folder and in the repository root.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as any);
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env'), quiet: true } as any);
