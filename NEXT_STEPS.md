# CÁC BƯỚC TIẾP THEO (NEXT STEPS)
## Dự án: Hanoi PM2.5 GIS

**Cập nhật lần cuối:** 2026-10-28 18:31 (GMT+7)

---

## 1. Hoàn tất Kiểm thử Giai đoạn 2
- Chờ `npm install` hoàn tất, chạy `npm test` (Vitest), `npm run typecheck` (TypeScript strict mode) và `npm run build` (Vite production bundle) để xác nhận 0 lỗi.
- Khởi chạy thử dev server (`npm run dev:web`) để kiểm chứng giao diện WebGIS hoạt động thực tế.

---

## 2. Chuẩn bị cho Giai đoạn 3 — Backend & Cơ sở dữ liệu Không gian Supabase PostGIS
Sau khi hoàn tất báo cáo Giai đoạn 2, ở **Giai đoạn 3**, tôi sẽ hướng dẫn bạn từng bước:
1. Tạo một Project miễn phí trên **Supabase** (https://supabase.com/) và bật Extension **`postgis`**.
2. Lấy chuỗi kết nối `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` điền vào file `.env`.
3. Thực thi bộ SQL Migrations khởi tạo 14 bảng chuẩn hóa + chỉ mục không gian `GIST` + nạp dữ liệu ranh giới hành chính Hà Nội (`administrative_areas`) và xây dựng Backend API (`apps/api`).
