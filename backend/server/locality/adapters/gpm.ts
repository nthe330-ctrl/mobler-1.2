import { SourceAdapter } from './types';
import { rightsFor } from '../rights';

/**
 * Direct GPM Login / GPM Automate connector — intentionally LOCKED.
 *
 * Why: no verified GPM API documentation is available to this project, and the
 * target website GPM would automate has no verified data rights (Google Maps is
 * explicitly prohibited by the Google Maps Platform ToS §3.2.3(a)). Endpoints are
 * NOT guessed here.
 *
 * To enable it, all of the following are required:
 *  1. Vendor API documentation for starting/stopping profiles and running Automate
 *     scripts, implemented in fetch() below.
 *  2. GPM_CONNECTOR_ENABLED=true plus GPM_API_URL / GPM_API_KEY set on the worker host
 *     (never in a client app, never logged).
 *  3. source-rights.json → sources.gpm with business_data/photos/reviews = "granted",
 *     signed off (verified_by, verified_at, basis) for the specific origin website.
 * Until then use the file_import adapter: GPM Automate writes export files, the
 * worker reads them, and rights are checked per declared origin.
 */
export const gpmAdapter: SourceAdapter = {
  id: 'gpm',
  label: 'GPM Login + Automate (trực tiếp)',
  status() {
    if (process.env.GPM_CONNECTOR_ENABLED !== 'true') return { enabled: false, reason: 'Bị khóa: chưa có tài liệu API GPM và quyền dữ liệu đã xác minh' };
    if (!process.env.GPM_API_URL || !process.env.GPM_API_KEY) return { enabled: false, reason: 'Thiếu GPM_API_URL / GPM_API_KEY trên server' };
    if (rightsFor('gpm').business_data !== 'granted') return { enabled: false, reason: 'source-rights.json: quyền cho nguồn gpm chưa được cấp' };
    return { enabled: false, reason: 'Connector chưa được hiện thực theo tài liệu của nhà cung cấp' };
  },
  async fetch() {
    throw new Error('GPM connector is not implemented (no verified vendor API documentation)');
  }
};
