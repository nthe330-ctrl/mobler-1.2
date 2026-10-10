import { Express, NextFunction, Request, Response } from 'express';
import { parseCellId } from '../../../shared/locality';
import { AuthRequest, authenticateToken, comparePassword, generateToken, isAdmin, optionalAuthenticateToken, rateLimit } from '../auth';
import { db } from '../db';
import { localityConfig } from './config';
import { onLocalityChanged } from './events';
import { REASON_LABEL_VI } from './quality';
import { enqueueCell } from './queue';
import { rightsRegistry } from './rights';
import {
  AdminActor, adminPlaceView, approvePlace, editPlace, getPlace, manualRefresh, overview, requesterId,
  runRetention, search, setStatusByAdmin, startRetentionSchedule, toDTO
} from './service';
import { localityStore } from './store';
import { recordUsage, usageSummary } from './usage';
import { setPaused, startWorker, tick, workerStatus } from './worker';

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Chỉ quản trị viên được truy cập', code: 'ADMIN_ONLY' });
  next();
}

const actor = (req: AuthRequest): AdminActor => ({ id: req.user!.userId, name: req.user!.name });

function paginate<T>(items: T[], req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(100, Math.max(1, Number(req.query.page_size) || 25));
  return { items: items.slice((page - 1) * size, page * size), page, page_size: size, total: items.length };
}

export function registerLocalityRoutes(app: Express) {
  const searchLimiter = rateLimit(120, 60_000);

  // ==================== PUBLIC (customer app) ====================

  /**
   * GET /api/locality/search?cell=c1077_10670&q=&page=1&page_size=20
   * The client sends a coarse grid cell (computed on the device), never raw GPS.
   */
  app.get('/api/locality/search', searchLimiter, optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    const result = search({
      cell: String(req.query.cell || ''),
      q: typeof req.query.q === 'string' ? req.query.q : '',
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.page_size) || undefined,
      requester: requesterId(req.user?.userId, req.ip, req.get('user-agent')),
      enqueue: req.query.enqueue !== 'false'
    });
    if ('error' in result) return res.status(400).json(result);
    res.set('Cache-Control', 'private, max-age=30');
    res.json(result);
  });

  app.post('/api/locality/refresh', rateLimit(10, 60_000), optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    const r = manualRefresh(String(req.body?.cell || ''), requesterId(req.user?.userId, req.ip, req.get('user-agent')));
    res.status(r.status).json(r);
  });

  app.get('/api/locality/places/:id', (req: Request, res: Response) => {
    const p = getPlace(req.params.id);
    if (!p || p.status !== 'published') return res.status(404).json({ error: 'Không tìm thấy địa điểm' });
    res.json({ place: toDTO(p) });
  });

  /** Lets the customer app report a paid Google search it still had to make (for savings stats). */
  app.post('/api/locality/usage/google-fallback', rateLimit(60, 60_000), (_req: Request, res: Response) => {
    recordUsage('locality.client_google_fallback');
    res.status(204).end();
  });

  // ==================== ADMIN AUTH ====================

  app.post('/api/admin/auth/login', rateLimit(10, 60_000), async (req: Request, res: Response) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'Nhập tài khoản và mật khẩu' });
    const user = db.getRawDb().users.find(
      u => u.roles.includes('admin') && (u.phone === String(identifier).trim() || u.email.toLowerCase() === String(identifier).trim().toLowerCase())
    );
    const ok = user ? await comparePassword(String(password), user.password_hash) : false;
    if (!user || !ok) return res.status(401).json({ error: 'Sai thông tin hoặc tài khoản không có quyền quản trị' });
    const { password_hash: _x, ...safe } = user;
    res.json({ token: generateToken(user), user: safe });
  });

  // ==================== ADMIN: LOCALITY DATA ====================
  const admin = [authenticateToken, requireAdmin] as const;

  app.get('/api/admin/locality/overview', ...admin, (_req: AuthRequest, res: Response) => {
    res.json({
      ...overview(),
      worker: workerStatus(),
      usage: usageSummary(14),
      reason_labels: REASON_LABEL_VI,
      config: {
        min_photos: localityConfig.minPhotos,
        min_reviews: localityConfig.minReviews,
        cell_fresh_days: localityConfig.cellFreshDays,
        cooldown_hours: localityConfig.requestCooldownHours,
        media_refresh_days: localityConfig.mediaRefreshDays,
        allow_google_fallback: localityConfig.allowGoogleFallback,
        sources: localityConfig.sources,
        google_calls_per_search_estimate: localityConfig.googleCallsPerAreaSearch
      }
    });
  });

  app.get('/api/admin/locality/rights', ...admin, (_req, res) => res.json(rightsRegistry()));

  app.get('/api/admin/locality/places', ...admin, (req: AuthRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';
    const items = localityStore.data.places
      .filter(p => (!status || p.status === status) && (!q || `${p.name} ${p.address} ${p.cell_id}`.toLowerCase().includes(q)))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        cell_id: p.cell_id,
        status: p.status,
        categories: p.categories,
        quality: p.quality,
        photo_count: p.photos.length,
        review_count: p.reviews.length,
        cover: p.photos.find(ph => ph.rights_status === 'granted' && !ph.removed_by_admin)?.url,
        sources: p.sources.map(s => s.source),
        updated_at: p.updated_at
      }));
    res.json(paginate(items, req));
  });

  app.get('/api/admin/locality/places/:id', ...admin, (req: AuthRequest, res: Response) => {
    const p = getPlace(req.params.id);
    if (!p) return res.status(404).json({ error: 'Không tìm thấy địa điểm' });
    res.json({ place: adminPlaceView(p) });
  });

  app.patch('/api/admin/locality/places/:id', ...admin, (req: AuthRequest, res: Response) => {
    const r = editPlace(req.params.id, req.body, actor(req));
    if (!r.ok) return res.status(r.status!).json(r);
    res.json({ ...r, place: adminPlaceView(r.place!) });
  });

  app.post('/api/admin/locality/places/:id/approve', ...admin, (req: AuthRequest, res: Response) => {
    const r = approvePlace(req.params.id, actor(req), req.body?.note);
    if (!r.ok) return res.status(r.status!).json(r);
    res.json({ ok: true, place: adminPlaceView(r.place!) });
  });

  app.post('/api/admin/locality/places/:id/reject', ...admin, (req: AuthRequest, res: Response) => {
    const r = setStatusByAdmin(req.params.id, 'reject', actor(req), req.body?.note);
    if (!r.ok) return res.status(r.status!).json(r);
    res.json({ ok: true, place: adminPlaceView(r.place!) });
  });

  app.post('/api/admin/locality/places/:id/unpublish', ...admin, (req: AuthRequest, res: Response) => {
    const r = setStatusByAdmin(req.params.id, 'unpublish', actor(req), req.body?.note);
    if (!r.ok) return res.status(r.status!).json(r);
    res.json({ ok: true, place: adminPlaceView(r.place!) });
  });

  app.post('/api/admin/locality/places/bulk', ...admin, (req: AuthRequest, res: Response) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 200) : [];
    const action = req.body?.action;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action phải là approve hoặc reject' });
    if (action === 'reject' && !req.body?.note) return res.status(400).json({ error: 'Cần ghi lý do từ chối' });
    const results = ids.map(id => {
      const r = action === 'approve' ? approvePlace(id, actor(req), req.body?.note) : setStatusByAdmin(id, 'reject', actor(req), req.body?.note);
      return { id, ok: r.ok, error: r.ok ? undefined : (r as any).error, reasons: (r as any).reasons };
    });
    res.json({ results, ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length });
  });

  app.get('/api/admin/locality/requests', ...admin, (req: AuthRequest, res: Response) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const items = localityStore.data.requests
      .filter(r => !state || r.state === state)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(r => ({ ...r, requesters: undefined, unique_requesters: r.requesters.length }));
    res.json(paginate(items, req));
  });

  app.post('/api/admin/locality/requests/:id/retry', ...admin, (req: AuthRequest, res: Response) => {
    const r = localityStore.data.requests.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (r.state !== 'failed' && r.state !== 'cancelled') return res.status(409).json({ error: 'Chỉ chạy lại được yêu cầu đã lỗi/hủy' });
    r.state = 'queued';
    r.attempts = 0;
    r.next_attempt_at = new Date().toISOString();
    r.updated_at = r.next_attempt_at;
    localityStore.save();
    res.json({ ok: true, request: r });
  });

  app.post('/api/admin/locality/requests/:id/cancel', ...admin, (req: AuthRequest, res: Response) => {
    const r = localityStore.data.requests.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (r.state !== 'queued') return res.status(409).json({ error: 'Chỉ hủy được yêu cầu đang chờ' });
    r.state = 'cancelled';
    r.updated_at = new Date().toISOString();
    r.finished_at = r.updated_at;
    localityStore.save();
    onLocalityChanged();
    res.json({ ok: true, request: r });
  });

  /** Admin-initiated scan (bypasses freshness/cooldown, still idempotent). */
  app.post('/api/admin/locality/scan', ...admin, (req: AuthRequest, res: Response) => {
    const cell = parseCellId(String(req.body?.cell || ''));
    if (!cell) return res.status(400).json({ error: 'Mã ô không hợp lệ (vd c1077_10670)' });
    const r = enqueueCell({ cellId: cell.id, requester: `admin:${req.user!.userId}`, trigger: 'admin', force: true });
    res.json(r);
  });

  app.post('/api/admin/locality/worker', ...admin, async (req: AuthRequest, res: Response) => {
    const action = req.body?.action;
    if (action === 'pause') setPaused(true);
    else if (action === 'resume') setPaused(false);
    else if (action === 'run_once') await tick();
    else return res.status(400).json({ error: 'action: pause | resume | run_once' });
    res.json(workerStatus());
  });

  app.get('/api/admin/locality/moderation', ...admin, (req: AuthRequest, res: Response) => {
    const placeId = typeof req.query.place_id === 'string' ? req.query.place_id : '';
    const items = localityStore.data.moderation.filter(m => !placeId || m.place_id === placeId).slice().reverse();
    res.json(paginate(items, req));
  });

  app.post('/api/admin/locality/retention/run', ...admin, (req: AuthRequest, res: Response) => {
    res.json(runRetention(actor(req)));
  });

  startWorker();
  startRetentionSchedule();
}
