import { HttpClient } from '@shared/api/http';

/** Admin session — stored separately from the customer and shop apps. */
export const http = new HttpClient('mobler_admin_token');

export type PlaceStatus = 'pending_review' | 'disqualified' | 'published' | 'rejected' | 'unpublished';

export const STATUS_LABEL: Record<PlaceStatus, string> = {
  pending_review: 'Chờ duyệt',
  disqualified: 'Không đạt',
  published: 'Đã xuất bản',
  rejected: 'Đã từ chối',
  unpublished: 'Đã gỡ'
};

export const STATUS_STYLE: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800 border-amber-200',
  disqualified: 'bg-gray-100 text-gray-600 border-gray-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  unpublished: 'bg-slate-100 text-slate-600 border-slate-200',
  queued: 'bg-sky-100 text-sky-800 border-sky-200',
  running: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  awaiting_review: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
};

export const REQUEST_STATE_LABEL: Record<string, string> = {
  queued: 'Đang chờ',
  running: 'Đang chạy',
  awaiting_review: 'Chờ duyệt kết quả',
  completed: 'Hoàn tất',
  failed: 'Lỗi',
  cancelled: 'Đã hủy'
};

export const RIGHTS_LABEL: Record<string, string> = {
  granted: 'Được phép',
  unverified: 'Chưa xác minh',
  denied: 'Không được phép'
};

export const RIGHTS_STYLE: Record<string, string> = {
  granted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unverified: 'bg-amber-50 text-amber-800 border-amber-200',
  denied: 'bg-rose-50 text-rose-700 border-rose-200'
};

export const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

export const adminApi = {
  async login(identifier: string, password: string) {
    const res = await http.post<{ token: string; user: any }>('/admin/auth/login', { identifier, password });
    http.setToken(res.token);
    return res;
  },
  me: () => http.get<{ user: any }>('/auth/me'),
  overview: () => http.get<any>('/admin/locality/overview'),
  rights: () => http.get<any>('/admin/locality/rights'),
  places: (status: string, q = '', page = 1) =>
    http.get<any>(`/admin/locality/places?status=${status}&q=${encodeURIComponent(q)}&page=${page}&page_size=25`),
  place: (id: string) => http.get<{ place: any }>(`/admin/locality/places/${id}`),
  editPlace: (id: string, body: any) => http.request<any>(`/admin/locality/places/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  approve: (id: string, note?: string) => http.post<any>(`/admin/locality/places/${id}/approve`, { note }),
  reject: (id: string, note: string) => http.post<any>(`/admin/locality/places/${id}/reject`, { note }),
  unpublish: (id: string, note: string) => http.post<any>(`/admin/locality/places/${id}/unpublish`, { note }),
  bulk: (ids: string[], action: 'approve' | 'reject', note?: string) => http.post<any>('/admin/locality/places/bulk', { ids, action, note }),
  requests: (state: string, page = 1) => http.get<any>(`/admin/locality/requests?state=${state}&page=${page}&page_size=25`),
  retry: (id: string) => http.post<any>(`/admin/locality/requests/${id}/retry`),
  cancel: (id: string) => http.post<any>(`/admin/locality/requests/${id}/cancel`),
  scan: (cell: string) => http.post<any>('/admin/locality/scan', { cell }),
  worker: (action: 'pause' | 'resume' | 'run_once') => http.post<any>('/admin/locality/worker', { action }),
  moderation: (page = 1) => http.get<any>(`/admin/locality/moderation?page=${page}&page_size=50`),
  retention: () => http.post<any>('/admin/locality/retention/run')
};
