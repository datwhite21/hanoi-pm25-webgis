# BÁO CÁO KIỂM THỬ TOÀN DIỆN, ĐÁNH GIÁ HIỆU NĂNG KHÔNG GIAN POSTGIS VÀ KIỂM TOÁN BẢO MẬT
## Hệ thống: Hanoi PM2.5 WebGIS (`docs/testing/SYSTEM_TEST_REPORT.md`)

**Ngày thực nghiệm:** 28/10/2026  
**Môi trường kiểm thử:** Windows 11 · Node.js `v24.22.1` · TypeScript `5.7.2` · Vitest `2.1.9` · Supertest `7.0.0`  
**Cơ sở dữ liệu thực tế:** Supabase Cloud PostgreSQL `17.6` + PostGIS `3.3.7 (GEOS 3.14.1, PROJ 9.7.1)`  

---

## 1. Tổng quan Kết quả Kiểm thử Tự động (Automated Test Suite)

Toàn bộ hệ thống được kiểm thử tự động qua **3 cấp độ** (Unit Test cho thuật toán môi trường & thống kê, Frontend Store & Spatial Inspector Test, và Backend Live PostGIS Integration & Security Test) với tổng cộng **25/25 kịch bản kiểm thử đạt 100% (`0 failed`)**.

| Bộ kiểm thử (Test Suite) | Số kịch bản | Kết quả | Thời gian chạy | Phạm vi kiểm chứng chính |
| :--- | :---: | :---: | :---: | :--- |
| [`packages/shared/src/__tests__/aqi-and-qc.test.ts`](../../packages/shared/src/__tests__/aqi-and-qc.test.ts) | **9** | **9/9 PASS** | `20 ms` | Công thức nội suy VN_AQI (QĐ 1459/QĐ-TCMT), thuật toán NowCast 12h, chuyển đổi ngược US AQI -> PM2.5 (`µg/m³`), bộ lọc QC 7 cờ, hệ số tương quan Pearson ($r$), thống kê vượt ngưỡng QCVN 05:2023 & WHO 2021 |
| [`apps/web/src/__tests__/snapshot-and-inspector.test.ts`](../../apps/web/src/__tests__/snapshot-and-inspector.test.ts) | **5** | **5/5 PASS** | `138 ms` | Tách biệt trạm đo trực tiếp (`DIRECT_CONCENTRATION`) và quy đổi (`DERIVED_FROM_US_AQI`), tra cứu tọa độ bất kỳ tại Sóc Sơn/Hai Bà Trưng, phủ lưới CAMS `0.4°`, quản lý RBAC (`GUEST`/`USER`/`ADMIN`) và ghi vết `audit_logs` |
| [`apps/api/src/__tests__/api-postgis.test.ts`](../../apps/api/src/__tests__/api-postgis.test.ts) | **11** | **11/11 PASS** | `5,915 ms` | Kết nối trực tiếp Supabase PostGIS, `ST_Contains`, `ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Intersects`, lưu/xóa địa điểm yêu thích PostGIS (`user_favorite_locations`), RBAC (`401`/`403`), cập nhật quy tắc `alert_rules`, chống SQL Injection & kiểm tra biên Zod |
| **TỔNG CỘNG** | **25** | **25/25 PASS (100%)** | **`6.07 s`** | **Đạt toàn bộ tiêu chuẩn kỹ thuật và khoa học của đề tài** |

---

## 2. Kết quả Đo kiểm Hiệu năng Truy vấn Không gian PostGIS (`EXPLAIN ANALYZE`)

Kịch bản [`scripts/benchmark-postgis-and-security.mjs`](../../scripts/benchmark-postgis-and-security.mjs) đã thực thi lệnh `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` trực tiếp trên Supabase PostgreSQL 17 + PostGIS 3.3.7 (kết quả gốc lưu tại [`scripts/postgis-benchmark-results.json`](../../scripts/postgis-benchmark-results.json)) với **8 chỉ mục không gian GIST (`USING gist`)** đang hoạt động:

| Mã truy vấn | Nội dung truy vấn không gian PostGIS | Thời gian thực thi tại DB (`Execution Time`) | Thời gian lập kế hoạch (`Planning Time`) | Tổng thời gian khứ hồi mạng TLS (`Round-trip`) | Đánh giá hiệu năng |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`SPATIAL_QUERY_1`** | **Point-in-Polygon (`ST_Contains`):** Xác định tọa độ `(21.0058°N, 105.8418°E)` nằm trong đơn vị hành chính cấp 2 (`HN-HBT`) | **`1.566 ms`** | `183.685 ms` *(lần đầu nạp cache)* | `1,339.73 ms` | Rất nhanh (`< 2 ms` tại nhân PostGIS nhờ GIST Index `idx_admin_areas_geom_gist`) |
| **`SPATIAL_QUERY_2`** | **KNN Nearest Stations (`ST_DWithin` + `<->`):** Tìm 5 trạm quan trắc gần nhất trong bán kính `15,000 m` ưu tiên trạm `FRESH` | **`91.420 ms`** | `3.074 ms` | `211.79 ms` | Đạt chuẩn tương tác thời gian thực (`< 100 ms` tại DB cho phép tính khoảng cách mặt cầu `geography`) |
| **`SPATIAL_QUERY_3`** | **Spatial Aggregation (`ST_Within` + `LATERAL`):** Tổng hợp nồng độ PM2.5 trung bình theo từng quận/huyện trên toàn Hà Nội | **`5.599 ms`** | `0.755 ms` | `217.41 ms` | Rất nhanh (`~5.6 ms` tại nhân PostGIS cho truy vấn gộp nhóm không gian toàn thành phố) |
| **`SPATIAL_QUERY_4`** | **Polygon Intersection (`ST_Intersects`):** Tìm các ô lưới mô hình số trị CAMS `0.4° (~40 km)` giao cắt với huyện Sóc Sơn (`HN-SS`) | **`5.838 ms`** | `0.323 ms` | `119.46 ms` | Rất nhanh (`~5.8 ms` tại nhân PostGIS nhờ chỉ mục `idx_model_cells_poly_gist`) |

---

## 3. Tối ưu hóa Đóng gói Giao diện Production (`manualChunks`)

Bằng cách cấu hình chiến lược tách gói (`build.rollupOptions.output.manualChunks`) trong [`apps/web/vite.config.ts`](../../apps/web/vite.config.ts), gói ứng dụng đã được phân tách thành các mô-đun độc lập giúp trình duyệt lưu đệm (cache) hiệu quả và loại bỏ hoàn toàn cảnh báo kích thước chunk:

| Tên Gói (Chunk File) | Kích thước sau nén Minify | Kích thước truyền tải Gzip | Vai trò kỹ thuật |
| :--- | :---: | :---: | :--- |
| `dist/assets/vendor-maplibre-*.js` | `803.01 kB` | **`217.91 kB`** | Nhân đồ họa bản đồ WebGL MapLibre GL JS (chỉ tải 1 lần và lưu cache dài hạn) |
| `dist/assets/index-*.js` | `550.46 kB` | **`148.33 kB`** | Mã nguồn nghiệp vụ Hanoi PM2.5 WebGIS, thuật toán AQI/NowCast/Pearson & dữ liệu biên giới Hà Nội |
| `dist/assets/vendor-react-*.js` | `173.75 kB` | **`54.94 kB`** | Nhân React 18, React DOM và Zustand State Management |
| `dist/assets/vendor-icons-*.js` | `16.68 kB` | **`3.64 kB`** | Bộ biểu tượng khí tượng và GIS (`lucide-react`) |
| `dist/assets/vendor-maplibre-*.css` | `65.47 kB` | **`9.22 kB`** | Stylesheet chuẩn của MapLibre GL |
| `dist/assets/index-*.css` | `29.96 kB` | **`5.95 kB`** | Giao diện Glassmorphism TailwindCSS |

---

## 4. Kiểm toán An toàn Thông tin & Trung thực Khoa học

1. **Chống SQL Injection (SQLi):** 100% câu lệnh truy vấn trong `@hanoi-pm25/api` sử dụng tham số hóa (`$1, $2, ...`) của thư viện `pg`. Đã kiểm thử thực tế với chuỗi tấn công `HN-HBT' OR '1'='1` trên `/api/v1/areas/:id/statistics` — hệ thống xử lý an toàn như chuỗi văn bản thuần và trả về `404 AREA_NOT_FOUND`.
2. **Kiểm tra Biên Đầu vào (Input Validation):** Mọi tham số tọa độ (`lat`, `lon`), bán kính (`radius_km`), số giờ (`hours`) và ngưỡng cảnh báo đều được kiểm tra bằng lược đồ `Zod` trước khi chạm tới cơ sở dữ liệu (trả về `400 VALIDATION_ERROR` khi tọa độ nằm ngoài phạm vi hợp lệ).
3. **Xác thực JWT & Phân quyền RBAC (`GUEST` / `USER` / `ADMIN`):** Mật khẩu người dùng được băm bằng `Blowfish (bcrypt / pgcrypto crypt)` trong PostgreSQL; các API quản trị (`/api/v1/admin/*`) bắt buộc đi qua middleware `requireRole('ADMIN')` và ghi vết bất biến vào bảng `audit_logs`.
4. **Bảo vệ Khóa Bí mật (Secret Hygiene):** Các thông tin nhạy cảm (`DATABASE_URL`, `OPENAQ_API_KEY`, `WAQI_API_TOKEN`, `JWT_SECRET`) chỉ nằm trong `.env` cục bộ (đã loại trừ trong `.gitignore`), tuyệt đối không xuất hiện trong mã nguồn hoặc gói build Frontend.
