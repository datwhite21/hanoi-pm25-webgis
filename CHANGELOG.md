# LỊCH SỬ THAY ĐỔI (CHANGELOG)
## Dự án: Hanoi PM2.5 GIS

---

## [0.9.5] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 9: CẤU HÌNH TRIỂN KHAI CLOUD CÔNG KHAI (VERCEL / RENDER / SUPABASE), DOCKER & GITHUB ACTIONS CI/CD

### Đã thêm mới (Added)
- Tạo cấu hình triển khai Frontend [`vercel.json`](vercel.json) và Backend [`render.yaml`](render.yaml), [`Dockerfile`](Dockerfile), [`docker-compose.yml`](docker-compose.yml).
- Tạo workflow GitHub Actions [`.github/workflows/ci-and-ingest.yml`](.github/workflows/ci-and-ingest.yml) tự động kiểm thử CI và thu thập dữ liệu định kỳ.
- Xuất bản hướng dẫn triển khai và vận hành [`docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md`](docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md).

---

## [0.9.0] - 2026-10-28 — HOÀN THÀNH GIAI ĐOẠN 8: KIỂM THỬ TOÀN DIỆN, ĐO KIỂM HIỆU NĂNG POSTGIS (`EXPLAIN ANALYZE`) & TỐI ƯU GÓI BUILD (`manualChunks`)

### Đã thêm mới (Added)
- Tối ưu hóa gói build `manualChunks`, đo kiểm `EXPLAIN ANALYZE` trên Supabase PostGIS và vượt qua 25/25 bài kiểm thử tự động.
