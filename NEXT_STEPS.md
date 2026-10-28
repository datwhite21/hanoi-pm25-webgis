# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 20:20 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0** đến **Giai đoạn 8** (Vượt qua 25/25 bài kiểm thử tự động, hoàn tất đo kiểm `EXPLAIN ANALYZE` trên 8 chỉ mục không gian GIST của Supabase PostGIS và tối ưu hóa gói build `manualChunks`).

---

## Kế hoạch triển khai GIAI ĐOẠN 9 — CẤU HÌNH TRIỂN KHAI CLOUD CÔNG KHAI (VERCEL / RENDER / SUPABASE) & DOCKER

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 9**, thực hiện tuần tự các công việc sau:

1. **Xây dựng Cấu hình Triển khai Cloud Miễn phí cho Sinh viên:**
   - Tạo `vercel.json` cho Frontend (`@hanoi-pm25/web`) hỗ trợ SPA routing và proxy `/api/*`.
   - Tạo `render.yaml` và `Dockerfile` cho Backend (`@hanoi-pm25/api`) kết nối Supabase PostGIS.
   - Tạo workflow GitHub Actions (`.github/workflows/ci-and-ingest.yml`) phục vụ kiểm thử tự động CI (Typecheck + Vitest) và kích hoạt thu thập dữ liệu định kỳ.
2. **Biên soạn Tài liệu Hướng dẫn Triển khai & Vận hành Thực tế (`docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md`):**
   - Hướng dẫn chi tiết từng bước triển khai lên Vercel + Render + Supabase và chạy bằng Docker Compose tại máy cục bộ.
