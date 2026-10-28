# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 20:07 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0** đến **Giai đoạn 7** (Hoàn thiện Trung tâm Quản trị Hệ thống RBAC, cấu hình quy tắc cảnh báo `alert_rules`, điều phối thu thập tức thời `ingestion_jobs`, nhật ký kiểm toán bất biến `audit_logs`, và vượt qua 24/24 bài kiểm thử tự động).

---

## Kế hoạch triển khai GIAI ĐOẠN 8 — KIỂM THỬ TOÀN DIỆN, TỐI ƯU HIỆU NĂNG POSTGIS & TỐI ƯU HÓA GÓI BUILD (`manualChunks`)

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 8**, thực hiện tuần tự các công việc sau:

1. **Tối ưu hóa Gói Build Frontend (`apps/web/vite.config.ts`):**
   - Cấu hình `build.rollupOptions.output.manualChunks` tách riêng `maplibre-gl`, `lucide-react`, và `@hanoi-pm25/shared` để loại bỏ cảnh báo chunk > 500 kB và tăng tốc độ tải trang lần đầu.
2. **Kiểm thử Hiệu năng Truy vấn Không gian PostGIS & Bảo mật API (`scripts/benchmark-postgis-and-security.mjs`):**
   - Đo thời gian phản hồi thực tế (latency `ms`) của các chỉ mục không gian GIST (`idx_admin_areas_geom_gist`, `idx_stations_geog_gist`, `idx_model_cells_poly_gist`) trên Supabase PostGIS.
   - Kiểm tra bảo mật: xác thực JWT, phân quyền RBAC (`401`/`403`), chống SQL Injection bằng tham số hóa `$1, $2`, kiểm tra giới hạn đầu vào Zod và kiểm tra không rò rỉ biến môi trường nhạy cảm.
3. **Tổng hợp Báo cáo Kiểm thử Hệ thống Toàn diện (`docs/testing/SYSTEM_TEST_REPORT.md`):**
   - Lập bảng kết quả kiểm thử Unit Test, Integration Test, Spatial Query Benchmark và Security Checklist phục vụ trực tiếp chương Thực nghiệm & Kiểm thử trong quyển đồ án.
