# Mobler 2.0 — hai ứng dụng độc lập, một backend chung

```
backend/        API Express dùng chung (tài khoản, quán, đặt bàn, realtime SSE, tìm kiếm)
apps/customer/  Ứng dụng khách hàng (Vite + React)  → http://localhost:5173
apps/shop/      Ứng dụng cửa hàng  (Vite + React)  → http://localhost:5174
apps/admin/     Ứng dụng quản trị kho địa điểm     → http://localhost:5175
shared/         Kiểu dữ liệu, logic đặt bàn, client HTTP/realtime, ngữ cảnh ngôn ngữ/giao diện
```

## Chạy
```bash
npm install
cp .env.example .env        # đặt JWT_SECRET, GEMINI_API_KEY, GOOGLE_MAPS_PLATFORM_KEY
npm run dev                 # API :3000, app khách :5173, app quán :5174, admin :5175
```
Build: `npm run build` → `backend/dist/server.cjs`, `apps/customer/dist`, `apps/shop/dist`.
Hai app gọi API qua `/api` (proxy Vite khi dev). Khi deploy riêng, đặt `VITE_API_URL=https://api.example.com`
lúc build và `CORS_ORIGINS=https://app...,https://shop...` cho backend.

## Tài khoản
- **Khách hàng** đăng ký/đăng nhập trong app khách: `POST /api/customer/auth/register|login`.
- **Cửa hàng** đăng ký trong app quán (kèm thông tin quán): `POST /api/shop/auth/register|login`.
  Đăng ký xong, quán xuất hiện ngay trong app khách và nhận đặt bàn.
- Hai loại tài khoản tách biệt hoàn toàn (cùng số điện thoại vẫn có 2 tài khoản riêng). Token có
  `audience` riêng; API khách chặn token quán và ngược lại; quán chỉ quản lý được quán của mình.
- Tài khoản mẫu (mật khẩu `123456`): khách `0908123789`, quán `0912345678` (quán 1 & 3), admin `0999999999`.

## Đặt bàn thời gian thực
- Khách: sơ đồ bàn lấy tình trạng thật từ `GET /api/shops/:id/availability` và tự cập nhật khi có người khác đặt / quán khóa bàn.
- Server kiểm tra trùng chỗ (mỗi lượt giữ bàn `slotDurationMin`, mặc định 120 phút) → `409 SLOT_TAKEN`.
- Trạng thái: `pending → confirmed → arrived → completed`, hoặc `rejected` / `cancelled`.
- Quán: màn “Đặt bàn trực tiếp” nhận yêu cầu mới tức thì (âm báo, thông báo trình duyệt, badge), xác nhận/từ chối/check-in,
  khóa bàn, đánh dấu khách vãng lai, bật/tắt nhận đặt bàn và tự động xác nhận.
- Realtime dùng Server-Sent Events: `POST /api/realtime/ticket` (đổi JWT lấy vé dùng 1 lần) → `GET /api/realtime/stream`.

## Kho địa điểm dùng chung (locality data)
Tìm quán cà phê theo khu vực → trả dữ liệu nội bộ đã duyệt trước, chỉ bổ sung qua hàng đợi + worker + admin duyệt.
Chi tiết vận hành, quyền dữ liệu, GPM: **docs/LOCALITY.md**. Đăng nhập admin bằng tài khoản có quyền admin (mẫu `0999999999` / `123456`).

## Bản đồ & dữ liệu quán miễn phí (không cần key)
- Bản đồ: MapLibre + OpenFreeMap (dữ liệu © OpenStreetMap).
- API quán: `GET /api/places/nearby?lat=..&lng=..&radius=3000&q=..&model=Cat%20Café` — lấy quán cà phê thật từ OpenStreetMap (Overpass), có cache 30 phút, thử lần lượt nhiều máy chủ Overpass.
- Khi không có Google key (hoặc Google lỗi/hết quota) thì `/api/places/search-new` và `/api/places/progressive-specialty` tự chuyển sang nguồn này. Quán từ OSM không có điểm/đánh giá giả; ảnh mẫu được gắn nhãn "Ảnh minh họa".

## Kiểm thử
`npm run test:booking` (39 kiểm tra), `npm run test:locality` (44 kiểm tra), `npm run test:freeplaces` (39 kiểm tra) và các bộ test tìm kiếm có sẵn — tất cả: `npm test`.

## Còn lại
Dashboard quán không còn dữ liệu mẫu: quán mới bắt đầu từ 0 (doanh thu, khách, đánh giá); thực đơn và voucher do chủ quán tự tạo/sửa/xóa và lưu trên server; ảnh tải lên lưu ở `backend/data/uploads`.
Dữ liệu lưu trong `backend/data/database.json` (file JSON) — nên chuyển sang Postgres trước khi chạy thật nhiều quán.
