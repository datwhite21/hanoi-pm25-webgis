# CÁC BƯỚC TIẾP THEO (NEXT STEPS)
## Dự án: Hanoi PM2.5 GIS

**Cập nhật lần cuối:** 2026-10-28 18:05 (GMT+7)

---

## 1. Trạng thái hiện tại
- **Giai đoạn 0 (Kiểm tra môi trường & Khảo sát dữ liệu thực tế):** Đã hoàn thành 100% (Đã xác minh 37 trạm OpenAQ v3, 10 trạm WAQI tại Hà Nội, và lưới Open-Meteo).
- **Giai đoạn 1 (Phân tích yêu cầu, Kiến trúc, DFD, ERD 14 bảng PostGIS, Đặc tả GIS & API):** Đã hoàn thành 100%.

---

## 2. Công việc của Giai đoạn 2 — Thiết kế UI/UX (Lấy cảm hứng từ Windy.com) & Khởi tạo Monorepo

Ngay sau khi bạn xác nhận chuyển sang **Giai đoạn 2**, chúng ta sẽ thực hiện:
1. Tạo tài liệu thiết kế giao diện chi tiết `docs/architecture/UI_UX_DESIGN_SPECIFICATION.md` (Hệ màu PM2.5/VN_AQI, Bố cục Bản đồ toàn màn hình kiểu Windy.com, Header nổi, Sidebar chọn lớp, Popup Trạm quan trắc, Popup Vị trí bất kỳ, Thanh Timeline phát hoạt ảnh, Dashboard Phân tích & Cảnh báo, và Responsive Mobile Bottom Sheet).
2. Khởi tạo cấu trúc Monorepo (`package.json` gốc với npm workspaces: `packages/shared`, `apps/web`, `apps/api`).
3. Xây dựng gói `packages/shared` chứa toàn bộ TypeScript types, Zod schemas, thang màu PM2.5/VN_AQI, và hàm tính toán NowCast / AQI chuẩn khoa học kèm Unit Tests kiểm chứng.
4. Khởi tạo khung giao diện `apps/web` (React + TypeScript + Vite + Tailwind CSS + Lucide Icons + MapLibre GL JS) với đầy đủ bố cục UI/UX lấy cảm hứng từ Windy.com.
