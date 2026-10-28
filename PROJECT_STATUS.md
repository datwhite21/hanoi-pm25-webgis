# TRẠNG THÁI DỰ ÁN — HANOI PM2.5 WEBGIS (`PROJECT_STATUS.md`)

> [!IMPORTANT]
> **Dành cho AI trong các phiên làm việc tiếp theo:** Hãy luôn đọc file này đầu tiên cùng với `NEXT_STEPS.md` và `ARCHITECTURE_DECISIONS.md` trước khi thực hiện bất kỳ thao tác nào.

**Cập nhật lần cuối:** 2026-10-28 20:25 (GMT+7)  
**Các giai đoạn đã hoàn thành:**
- **GIAI ĐOẠN 0 — KIỂM TRA MÔI TRƯỜNG VÀ KHẢO SÁT DỮ LIỆU:** **Hoàn thành 100%**
- **GIAI ĐOẠN 1 — PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG:** **Hoàn thành 100%**
- **GIAI ĐOẠN 2 — THIẾT KẾ UI/UX (LẤY CẢM HỨNG TỪ WINDY.COM) & KHỞI TẠO MONOREPO / FRONTEND:** **Hoàn thành 100%**
- **GIAI ĐOẠN 3 — BACKEND (`@hanoi-pm25/api`) VÀ CƠ SỞ DỮ LIỆU KHÔNG GIAN SUPABASE POSTGIS:** **Hoàn thành 100%**
- **GIAI ĐOẠN 4 — THU THẬP DỮ LIỆU THỰC TẾ TỰ ĐỘNG (DATA INGESTION WORKERS, QUALITY CONTROL & SCHEDULER):** **Hoàn thành 100%**
- **GIAI ĐOẠN 5 — TÍCH HỢP WEBGIS FRONTEND VỚI BACKEND POSTGIS API VÀ TRUY VẤN KHÔNG GIAN THỜI GIAN THỰC:** **Hoàn thành 100%**
- **GIAI ĐOẠN 6 — CẢNH BÁO Ô NHIỄM NÂNG CAO, LƯU ĐỊA ĐIỂM YÊU THÍCH (POSTGIS FAVORITES) VÀ PHÂN TÍCH TƯƠNG QUAN KHÍ TƯỢNG – PM2.5:** **Hoàn thành 100%**
- **GIAI ĐOẠN 7 — QUẢN TRỊ HỆ THỐNG, GIAO DIỆN PHÂN QUYỀN RBAC (`ADMIN` / `USER` / `GUEST`) & NHẬT KÝ KIỂM TOÁN (`audit_logs`):** **Hoàn thành 100%**
- **GIAI ĐOẠN 8 — KIỂM THỬ TOÀN DIỆN, ĐÁNH GIÁ HIỆU NĂNG KHÔNG GIAN POSTGIS (`EXPLAIN ANALYZE`), BẢO MẬT & TỐI ƯU GÓI BUILD (`manualChunks`):** **Hoàn thành 100%**
- **GIAI ĐOẠN 9 — CẤU HÌNH TRIỂN KHAI CLOUD CÔNG KHAI (VERCEL / RENDER / SUPABASE), DOCKER & GITHUB ACTIONS CI/CD:** **Hoàn thành 100%**

**Giai đoạn tiếp theo:** **GIAI ĐOẠN 10 (GIAI ĐOẠN CUỐI) — HOÀN THIỆN BỘ TÀI LIỆU THUYẾT MINH ĐỒ ÁN, CẤU TRÚC SLIDE BẢO VỆ & BỘ CÂU HỎI PHẢN BIỆN HỘI ĐỒNG** (Chờ người dùng xác nhận chuyển giai đoạn)

---

## 1. Kết quả Thực hiện Giai đoạn 9 (Triển khai Cloud Công khai, Docker & CI/CD)

- **Cấu hình Triển khai Frontend (`vercel.json`):** Hỗ trợ SPA routing, thiết lập HTTP Security Headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) và lưu đệm bất biến (`immutable`) cho `/assets/*`.
- **Cấu hình Triển khai Backend (`render.yaml` & `Dockerfile`):** Đóng gói `@hanoi-pm25/api` trên `node:22-alpine` kèm `HEALTHCHECK` tự động kiểm tra `/api/health`.
- **Cấu hình Docker Compose Dự phòng (`docker-compose.yml`):** Cho phép khởi chạy cụm `postgis/postgis:16-3.4-alpine` tự động nạp 14 bảng và dữ liệu Hà Nội tại máy cục bộ.
- **GitHub Actions CI/CD (`.github/workflows/ci-and-ingest.yml`):** Tự động kiểm tra `npm run typecheck`, chạy `vitest`, đóng gói `npm run build` và hỗ trợ lập lịch thu thập dữ liệu định kỳ (`*/30 * * * *`).
- **Tài liệu Hướng dẫn Triển khai & Vận hành:** Xuất bản [`docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md`](docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md).

---

## 2. Danh sách File đã tạo / sửa trong Giai đoạn 9

1. `vercel.json`
2. `render.yaml`
3. `Dockerfile`
4. `docker-compose.yml`
5. `.github/workflows/ci-and-ingest.yml`
6. `docs/deployment/DEPLOYMENT_AND_OPERATIONS_GUIDE.md`
7. `package.json`
