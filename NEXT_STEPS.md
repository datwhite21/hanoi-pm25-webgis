# CÁC BƯỚC TIẾP THEO — HANOI PM2.5 WEBGIS (`NEXT_STEPS.md`)

**Cập nhật lần cuối:** 2026-10-28 19:40 (GMT+7)  
**Trạng thái hiện tại:** Đã hoàn thành **Giai đoạn 0**, **Giai đoạn 1**, **Giai đoạn 2**, **Giai đoạn 3**, **Giai đoạn 4**, và **Giai đoạn 5** (Tích hợp hoàn chỉnh Frontend WebGIS với Backend PostGIS API, truy vấn không gian trực tiếp `ST_Contains`, `ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Intersects` và 18/18 bài kiểm thử tự động thành công).

---

## Kế hoạch triển khai GIAI ĐOẠN 6 — CẢNH BÁO Ô NHIỄM NÂNG CAO, LƯU ĐỊA ĐIỂM YÊU THÍCH (POSTGIS FAVORITES) VÀ PHÂN TÍCH THỐNG KÊ CHUYÊN SÂU

Ngay khi người dùng xác nhận chuyển sang **Giai đoạn 6**, thực hiện tuần tự các công việc sau:

1. **Nâng cấp Hệ thống Phân tích Thống kê & Tương quan Khí tượng – PM2.5 (`packages/shared/src/analytics.ts` & Backend `/api/v1/analysis/correlation`):**
   - Xây dựng hàm tính hệ số tương quan Pearson ($r$) giữa nồng độ PM2.5 (`µg/m³`) và các biến khí tượng (tốc độ gió `km/h`, độ ẩm tương đối `%`, nhiệt độ `°C`) kèm giải thích khoa học chuẩn mực (tương quan âm giữa tốc độ gió và nồng độ PM2.5 do cơ chế thông gió ngang; cảnh báo không suy diễn nhân quả đơn biến).
   - Bổ sung tính toán tỷ lệ vượt ngưỡng QCVN 05:2023/BTNMT (`50 µg/m³`) và WHO 2021 (`15 µg/m³`) theo khu vực và theo khung giờ trong ngày (giờ cao điểm sáng 07:00–09:00 và tối 18:00–22:00 so với buổi trưa).
2. **Xây dựng Quản lý Địa điểm Yêu thích & Cảnh báo Cá nhân hóa (`user_favorite_locations`):**
   - Cho phép người dùng (vai trò `USER` / `ADMIN`) lưu bất kỳ vị trí nào trên bản đồ Hà Nội vào bảng `user_favorite_locations` trong Supabase PostGIS với ngưỡng cảnh báo tùy chỉnh (`custom_pm25_threshold_ugm3`, mặc định `35.0 µg/m³`).
   - Tự động ánh xạ trạm gần nhất bằng PostGIS `<->` (`nearest_station_id`) và đơn vị hành chính bằng `ST_Contains` (`administrative_area_id`), đồng thời hiển thị danh sách địa điểm yêu thích và trạng thái vượt ngưỡng cá nhân ngay trên giao diện.
3. **Kiểm thử Giai đoạn 6:**
   - Viết bài kiểm thử đơn vị và tích hợp cho thuật toán tương quan Pearson ($r$), API `/api/v1/analysis/correlation`, và luồng lưu/xóa địa điểm yêu thích PostGIS (`/api/v1/user/favorites`).
   - Chạy `npm run typecheck`, `npm test`, và `npm run build`.
