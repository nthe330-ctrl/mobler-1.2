# Locality data — kho địa điểm dùng chung

Mục tiêu: tìm “quán cà phê” ở một khu vực thì trả từ dữ liệu nội bộ đã duyệt; chỉ bổ sung khi thiếu/cũ,
qua hàng đợi + worker phía server + admin duyệt. Giảm các lượt gọi Google Maps trùng lặp.

## 1. Luồng đầy đủ

```
App khách (GPS trên máy) ──► tính ô lưới ~1,1 km (cellForCoords) ──► GET /api/locality/search?cell=…
                                                                   │
            ┌──────────────────────────────────────────────────────┤
            │ 1. Trả ngay: quán đối tác + địa điểm đã xuất bản trong 3×3 ô
            │ 2. Trạng thái: complete | partial | enriching | stale | empty
            │ 3. Ô thiếu/hết hạn → enqueueCell() (idempotent, gộp trùng, cooldown, rate-limit)
            ▼
   Hàng đợi (locality.json → requests) ──► Worker (trong tiến trình API, concurrency, timeout, retry/backoff,
                                           circuit breaker, hạn mức/ngày) ──► adapter: mock_dev | osm | file_import | gpm(khóa)
                                                                   │
            ingestCandidates(): kiểm tra quyền nguồn → khử trùng lặp (tên chuẩn hóa + ≤80 m) → gộp
            → evaluateQuality(): chỉ quán cà phê, ≥3 ảnh hợp lệ, ≥10 đánh giá hợp lệ, danh mục rõ ràng
            → pending_review (đạt) | disqualified (không đạt, lưu lý do)
                                                                   │
   App Admin (apps/admin) ── duyệt/sửa/từ chối, theo lô ──► published ──► mọi người dùng khác tìm cùng khu vực
                                                                         dùng lại, không tạo job mới
```

Nếu dữ liệu chưa đủ, app khách vẫn hiển thị những gì có cùng nhãn “Đang bổ sung…”. Tìm kiếm Google trả phí
chỉ chạy khi server cho phép (`allow_google_fallback`). Server tắt cho phép này khi khu vực đã `complete`.

## 2. Thành phần

| Thành phần | Tệp |
|---|---|
| Kiểu dữ liệu, ô lưới, trạng thái (dùng chung) | `shared/locality.ts` |
| Cấu hình & ngưỡng | `backend/server/locality/config.ts` |
| Lưu trữ (JSON, ghi nguyên tử) | `backend/server/locality/store.ts` → `backend/data/locality.json` |
| Sổ quyền dữ liệu | `backend/config/source-rights.json`, `rights.ts` |
| Tiêu chuẩn chất lượng | `quality.ts` |
| Khử trùng lặp & gộp | `ingest.ts` |
| Hàng đợi idempotent | `queue.ts` |
| Worker | `worker.ts` |
| Adapter nguồn | `adapters/mockDev.ts`, `osm.ts`, `fileImport.ts`, `gpm.ts` (khóa) |
| Tìm kiếm, admin, hết hạn | `service.ts`, `routes.ts` |
| Đếm lượt gọi Google + proxy ảnh | `backend/server/googleMeter.ts`, `/api/media/place-photo` |
| App admin | `apps/admin` (cổng 5175) |
| Tích hợp app khách | `apps/customer/src/components/HomeView.tsx` |
| Kiểm thử | `backend/scripts/locality-e2e.ts` (`npm run test:locality`) |

### Schema (`locality.json`)
- `places[]`: `id`, `dedupe_key` (tên chuẩn hóa + tọa độ ~110 m, **không dùng Place ID**), `status`
  (`pending_review | disqualified | published | rejected | unpublished`), tên, địa chỉ, `lat/lng`, `cell_id`, `categories`,
  điện thoại, website, giờ mở cửa, `sources[]` (nguồn, mã trong nguồn nếu được phép, `fetched_at`, ghi nguồn),
  `photos[]` / `reviews[]` (mỗi mục có `source`, `rights_status`, `fetched_at`, `expires_at`, `removed_by_admin`),
  `quality` (số ảnh/đánh giá hợp lệ, danh mục đã xác minh, lý do, cảnh báo quyền), `published_at`, `expires_at`, `admin_edits`.
- `requests[]`: `idempotency_key` = `ô|cafe|từ khóa`, `state`, `trigger`, người yêu cầu (đã băm), số lượt gộp,
  `attempts/max_attempts`, `next_attempt_at`, `last_error` (đã lọc secret), `skipped_sources`, `result`.
- `coverage[]`: ô đã quét, `scanned_at`, `fresh_until`.
- `moderation[]`: nhật ký duyệt — ai, lúc nào, thao tác, thay đổi (from → to), ghi chú.
- `usage[]`: bộ đếm theo ngày (90 ngày).

## 3. Tiêu chuẩn chất lượng (mặc định)
- Chỉ nhận **quán cà phê**: phải có ít nhất một danh mục trong `LOCALITY_ALLOWED_CATEGORIES`
  (cafe, coffee shop, quán cà phê, specialty coffee, bakery cafe…). Không có danh mục, danh mục quá chung
  (“point of interest”), hoặc mâu thuẫn (cafe + restaurant) đều bị đánh dấu không đạt. Hệ thống **không suy đoán từ tên**.
- **≥ 3 ảnh** và **≥ 10 đánh giá** *hợp lệ*: chỉ tính mục có `rights_status = granted`, còn hạn lưu, không bị admin gỡ, không trùng.
- Không đạt thì vẫn lưu cùng lý do để theo dõi, nhưng **không bao giờ xuất bản**. Admin không thể duyệt mục không đạt.
- Đổi ngưỡng: `LOCALITY_MIN_PHOTOS`, `LOCALITY_MIN_REVIEWS`, `LOCALITY_ALLOWED_CATEGORIES`.

## 4. Quyền dữ liệu
`backend/config/source-rights.json` là nơi duy nhất cấp quyền. Mỗi nguồn và mỗi `origin` có `business_data`, `photos`,
`reviews`, `redistribute` = `granted | unverified | denied`, kèm `basis`, `verified_by`, `verified_at`, `retention_days`.
- Nguồn chưa được phép lưu thông tin doanh nghiệp → worker **không lưu gì** từ nguồn đó (ghi số bản ghi bị bỏ vào job).
- Ảnh/đánh giá chưa có quyền → không tính vào ngưỡng, không gửi về app khách. Với admin, URL và nội dung cũng bị xóa trước khi gửi.
- `google_maps` = `denied` theo Google Maps Platform ToS §3.2.3(a) (“No Scraping… copy and save business names, addresses, or user reviews”).
- `osm` = cho phép lưu thông tin quán (ODbL 1.0, phải ghi nguồn “© OpenStreetMap contributors”). App khách có hiển thị dòng ghi nguồn.
  **Cần pháp chế xác nhận nghĩa vụ share-alike**. OSM không có ảnh/đánh giá nên quán chỉ có dữ liệu OSM sẽ không đạt ngưỡng.
- Thu hồi quyền (đổi sang `denied`) → lần chạy hết hạn kế tiếp xóa toàn bộ bản ghi từ nguồn đó.

## 5. Worker & GPM
- Worker chạy trong tiến trình API (`LOCALITY_WORKER_ENABLED=true`), mỗi `LOCALITY_WORKER_INTERVAL_SEC` giây,
  `LOCALITY_WORKER_CONCURRENCY` job cùng lúc, timeout `LOCALITY_JOB_TIMEOUT_SEC`, tối đa `LOCALITY_MAX_ATTEMPTS` lần,
  backoff `LOCALITY_BACKOFF_BASE_SEC × 4^(n-1)`, circuit breaker sau `LOCALITY_CIRCUIT_FAILURES` lỗi liên tiếp trong
  `LOCALITY_CIRCUIT_OPEN_MIN` phút, hạn mức `LOCALITY_SOURCE_DAILY_LIMIT` lượt/nguồn/ngày. Admin có thể tạm dừng hoặc chạy một lượt.
- Vì dữ liệu nằm trong một file JSON, **chỉ một tiến trình được ghi**. Muốn tách worker ra máy/tiến trình riêng thì phải chuyển sang database có khóa (SQLite/Postgres) trước.
- **GPM trực tiếp đang khóa** (`adapters/gpm.ts`): chưa có tài liệu API GPM đã xác minh nên không tự đặt endpoint.
  Để bật cần đủ 3 điều kiện: (1) hiện thực theo tài liệu nhà cung cấp; (2) `GPM_CONNECTOR_ENABLED=true`,
  `GPM_API_URL`, `GPM_API_KEY` chỉ đặt trên server/secret manager; (3) cấp quyền cho nguồn `gpm` trong `source-rights.json`.
- **Cách dùng GPM ngay bây giờ (không cần credential trên server):** viết kịch bản GPM Automate chạy theo lịch trên máy GPM,
  xuất JSON vào thư mục chia sẻ `LOCALITY_IMPORT_DIR` theo định dạng:

```json
{
  "format": "mobler-locality-import/v1",
  "origin": "partner_websites",
  "generator": "GPM Automate – kịch bản X",
  "exported_at": "2026-10-09T10:00:00Z",
  "places": [{
    "name": "…", "address": "…", "lat": 10.77, "lng": 106.70,
    "categories": ["cafe"], "phone": "…", "website": "…", "opening_hours": "07:00-22:00",
    "photos": [{ "url": "https://…", "attribution": "…" }],
    "reviews": [{ "rating": 5, "text": "…", "date": "2026-09-01", "language": "vi", "author": "…" }]
  }]
}
```
  `origin` phải được khai báo và cấp quyền trong `source-rights.json → origins`, nếu không mọi thứ trong tệp sẽ bị bỏ qua.

## 6. Làm mới, cache, chi phí
- Ô được coi là mới trong `LOCALITY_CELL_FRESH_DAYS` (30) ngày. Không quét lại cùng ô/từ khóa trong `LOCALITY_REQUEST_COOLDOWN_HOURS` (24) giờ.
  Ảnh/đánh giá không làm mới thường hơn `LOCALITY_MEDIA_REFRESH_DAYS` (30) ngày.
- Từ khóa chung (“cà phê”, “cafe”…) gộp chung một job. Mỗi từ khóa riêng chỉ tạo job riêng khi `LOCALITY_KEYWORD_JOBS=true`.
- Giới hạn: `LOCALITY_REQUESTER_HOURLY_LIMIT` yêu cầu/giờ cho mỗi người, `LOCALITY_MANUAL_REFRESH_HOURLY_LIMIT` lần “Làm mới”/giờ,
  `LOCALITY_MAX_QUEUED`, 120 lượt tìm/phút/IP.
- Cache kết quả tìm kiếm `LOCALITY_SEARCH_CACHE_TTL_SEC` (60 s), tự xóa khi có duyệt/sửa.
- Ảnh/đánh giá chỉ hiển thị nếu được lấy về trước lần duyệt gần nhất (`published_at`). Dữ liệu mới sau khi xuất bản phải được admin duyệt lại mới lên app.
- Bộ đếm (admin → Tổng quan & chi phí): `google.places_text_search`, `google.place_photo`, `google.geocoding` là lượt gọi thật.
  `locality.google_calls_avoided_est` là số **ước tính** (= số lượt tìm `complete` × `LOCALITY_GOOGLE_CALLS_PER_SEARCH`).
- Vẫn có thể phát sinh phí: Maps JavaScript API (bản đồ trong app khách, tính theo lượt tải trên thiết bị),
  Places Text Search / Place Photo khi khu vực chưa đủ dữ liệu hoặc khi dùng tìm kiếm AI theo từ khóa, Geocoding.
  Đặt `LOCALITY_ALLOW_GOOGLE_FALLBACK=false` để tắt hẳn tìm kiếm Google dự phòng.

## 7. Hết hạn & xóa
Job chạy tự động mỗi 6 giờ, hoặc admin → Nguồn & quyền → “Chạy ngay”. Job này:
- xóa ảnh/đánh giá quá `retention_days` của nguồn;
- xóa bản ghi khi quyền nguồn bị thu hồi;
- gỡ địa điểm không còn đạt chuẩn;
- xếp hàng làm mới địa điểm đã xuất bản nhưng quá `expires_at`.

Mọi thao tác đều ghi vào nhật ký.

## 8. Quyền riêng tư vị trí
App khách xin GPS theo luồng sẵn có, rồi tự tính mã ô trên thiết bị. Chỉ mã ô (~1,1 km) được gửi lên `/api/locality/search`,
server từ chối tọa độ thô. Người yêu cầu ẩn danh được lưu dưới dạng hash có salt, không lưu IP.
(Luồng tìm kiếm Google dự phòng/AI có sẵn vẫn gửi tọa độ khi được dùng.)
