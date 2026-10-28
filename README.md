# HANOI PM2.5 GIS (`hanoi-pm25-webgis`)
## Hệ thống WebGIS Giám sát, Phân tích và Cảnh báo Ô nhiễm Bụi mịn PM2.5 Gần Thời Gian Thực trên Toàn Thành phố Hà Nội

**Tên tiếng Anh:** *Development of a Near-Real-Time WebGIS System for PM2.5 Air Pollution Monitoring, Spatial Analysis and Warning in Hanoi*  
**Loại dự án:** Đồ án chuyên ngành Công nghệ thông tin

---

## 1. Giới thiệu tổng quan

**Hanoi PM2.5 GIS** là hệ thống WebGIS chuyên sâu phục vụ giám sát, trực quan hóa không gian - thời gian, phân tích tương quan khí tượng và cảnh báo ô nhiễm bụi mịn **PM2.5 (`µg/m³`)** trên toàn bộ địa bàn Thành phố Hà Nội.

Hệ thống tuân thủ nguyên tắc trung thực dữ liệu khoa học:
- Phân biệt rõ ràng giữa **Dữ liệu quan trắc thực tế tại trạm (`OpenAQ v3` / `WAQI`)**, **Dữ liệu mô hình chất lượng không khí (`Open-Meteo CAMS Global ~40 km`)**, và **Dữ liệu dự báo khí tượng (`Open-Meteo Weather`)**.
- Sử dụng cơ sở dữ liệu không gian **PostgreSQL / PostGIS** cho các truy vấn hình học thực tế (`ST_Distance`, `ST_DWithin`, `ST_Within`, `ST_Contains`, `ST_Intersects`).
- Giao diện bản đồ tương tác toàn màn hình lấy cảm hứng từ **Windy.com**, xây dựng bằng **React + TypeScript + Vite + Tailwind CSS + MapLibre GL JS**.

---

## 2. Cấu trúc thư mục dự án (Monorepo)

```text
hanoi-pm25-webgis/
├── apps/
│   ├── web/                  # Frontend React + TypeScript + Vite + MapLibre GL JS (Giai đoạn 2, 5, 6, 7)
│   └── api/                  # Backend Node.js + Express + TypeScript + Ingestion Workers (Giai đoạn 3, 4)
├── packages/
│   └── shared/               # Schemas Zod, Types, Constants & Công thức AQI dùng chung
├── database/
│   ├── migrations/           # SQL Migrations cho PostgreSQL + PostGIS (Giai đoạn 3)
│   └── seeds/                # Dữ liệu ranh giới hành chính Hà Nội & danh mục nguồn dữ liệu
├── docs/
│   ├── DATA_SOURCE_AUDIT.md          # Kiểm toán chi tiết các nguồn dữ liệu PM2.5 & GIS
│   ├── REALTIME_DATA_VERIFICATION.md # Bằng chứng xác minh API thực tế & 5 mốc thời gian
│   ├── DATA_QUALITY_POLICY.md        # Chính sách kiểm soát chất lượng (QC flags & Freshness)
│   ├── FEASIBILITY_REPORT.md         # Đánh giá tính khả thi & độ phủ không gian Hà Nội
│   ├── INSTALLATION_GUIDE.md         # Hướng dẫn cài đặt môi trường & lấy API Key miễn phí
│   └── PROJECT_SCOPE.md              # Phạm vi địa lý, đối tượng nghiên cứu & chức năng
├── scripts/
│   ├── verify-data-sources.mjs       # Script kiểm chứng kết nối thực tế tới các API nguồn
│   └── verification-results.json     # Log JSON kết quả kiểm chứng gần nhất
├── .env.example              # Mẫu cấu hình biến môi trường (Không chứa secret)
├── .gitignore                # Cấu hình loại trừ file nhạy cảm và thư mục build
├── ARCHITECTURE_DECISIONS.md # Nhật ký quyết định kiến trúc (ADR)
├── CHANGELOG.md              # Lịch sử thay đổi theo từng giai đoạn
├── NEXT_STEPS.md             # Các bước tiếp theo cần thực hiện
└── PROJECT_STATUS.md         # Trạng thái hiện tại của dự án (Đọc đầu tiên khi mở lại phiên)
```

---

## 3. Kiểm tra nhanh kết nối nguồn dữ liệu (Giai đoạn 0)

Chạy lệnh sau tại thư mục gốc để kiểm chứng trực tiếp các API dữ liệu môi trường & khí tượng:

```powershell
node scripts/verify-data-sources.mjs
```

