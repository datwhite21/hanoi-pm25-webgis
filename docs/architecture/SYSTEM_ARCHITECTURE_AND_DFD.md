# KIẾN TRÚC HỆ THỐNG VÀ SƠ ĐỒ LUỒNG DỮ LIỆU (SYSTEM ARCHITECTURE & DFD)
## Dự án: Hanoi PM2.5 GIS

**Phiên bản:** 1.0 (Giai đoạn 1)  
**Ngày cập nhật:** 28/10/2026

---

## 1. Sơ đồ Kiến trúc Tổng thể Hệ thống (High-Level System Architecture)

```mermaid
flowchart TD
    subgraph External["1. Tầng Nguồn Dữ Liệu Bên Ngoài (External Data Sources)"]
        OpenAQ["OpenAQ API v3\n(37 Trạm Hà Nội — PM2.5 µg/m³)"]
        WAQI["WAQI API\n(10 Trạm Hà Nội — US-EPA AQI Sub-index)"]
        OpenMeteoAQ["Open-Meteo Air Quality API\n(Lưới mô hình CAMS Global ~40 km)"]
        OpenMeteoWx["Open-Meteo Weather & Geocoding API\n(Khí tượng 15 phút & Tìm kiếm địa danh)"]
        GISSource["Dữ liệu Ranh giới Hành chính Hà Nội\n(GeoJSON / OCHA COD-AB / GADM)"]
    end

    subgraph Backend["2. Tầng Backend & Xử Lý Dữ Liệu (Node.js + Express + TypeScript)"]
        Scheduler["Dual-Trigger Scheduler\n(In-process Cron + GitHub Actions Webhook)"]
        Workers["Ingestion Workers\n(Fetch, Retry, Rate-Limit Handling)"]
        Pipeline["Validation (Zod) → Normalization (UTC, µg/m³)\n→ Quality Control (QC Flags) → Deduplication"]
        GISService["PostGIS Spatial Analysis Engine\n(ST_Distance, ST_DWithin, ST_Within, ST_Contains)"]
        AlertEngine["Pollution & Technical Alert Engine\n(QCVN 05:2023 / WHO / Stale Detection)"]
        RestAPI["REST API (/api/v1/*) + Auth (JWT/RBAC)\n+ Server-Sent Events (/api/v1/stream)"]
    end

    subgraph Database["3. Tầng Cơ Sở Dữ Liệu Không Gian (Supabase PostgreSQL + PostGIS)"]
        PostGIS[("PostgreSQL 15+ với Extension PostGIS\n14 Bảng Chuẩn Hóa + Chỉ mục Không gian GIST")]
    end

    subgraph Frontend["4. Tầng Giao Diện WebGIS (React + TypeScript + Vite + Tailwind)"]
        MapView["MapLibre GL JS Fullscreen Map\n(Lấy cảm hứng từ Windy.com)"]
        Timeline["Interactive Timeline\n(Lịch sử 48h — Hiện tại — Dự báo 72h)"]
        AnalyticsUI["Recharts Analytics & Comparison\n(Chuỗi thời gian, Tương quan Gió/Ẩm/Nhiệt)"]
        AdminUI["Admin & Audit Dashboard\n(Quản lý Trạm, Nguồn, Jobs, Cảnh báo)"]
    end

    OpenAQ --> Workers
    WAQI --> Workers
    OpenMeteoAQ --> Workers
    OpenMeteoWx --> Workers
    GISSource --> PostGIS

    Scheduler --> Workers
    Workers --> Pipeline
    Pipeline --> PostGIS
    PostGIS <--> GISService
    PostGIS <--> AlertEngine
    GISService --> RestAPI
    AlertEngine --> RestAPI
    PostGIS <--> RestAPI

    RestAPI <--> MapView
    RestAPI <--> Timeline
    RestAPI <--> AnalyticsUI
    RestAPI <--> AdminUI
```

---

## 2. Sơ đồ Luồng Dữ liệu — DFD Mức Ngữ Cảnh (Context Diagram — DFD Level 0)

```mermaid
flowchart LR
    Citizen["👤 Người dân / Khách"]
    RegUser["👤 Người dùng Đăng ký"]
    Admin["🛡️ Quản trị viên"]
    ExtAPIs["🌐 Các API Môi trường & Khí tượng\n(OpenAQ, WAQI, Open-Meteo)"]

    System(("HỆ THỐNG WEBGIS\nHANOI PM2.5 GIS"))

    ExtAPIs -- "Dữ liệu PM2.5 thực đo, AQI, Mô hình, Khí tượng" --> System
    Citizen -- "Truy vấn bản đồ, tọa độ, vùng hành chính, biểu đồ" --> System
    System -- "Bản đồ PM2.5, Trạm gần nhất, Thống kê, Cảnh báo, File CSV/PDF" --> Citizen

    RegUser -- "Lưu địa điểm yêu thích, Cấu hình ngưỡng cảnh báo" --> System
    System -- "Cảnh báo cá nhân hóa theo vị trí" --> RegUser

    Admin -- "Cấu hình nguồn, Kích hoạt đồng bộ, Kiểm toán dữ liệu" --> System
    System -- "Nhật ký đồng bộ (Ingestion Jobs), Audit Logs, Trạng thái API" --> Admin
```

---

## 3. Sơ đồ Luồng Dữ liệu — DFD Mức 1 (DFD Level 1 — Các Tiến trình Cốt lõi)

```mermaid
flowchart TD
    Ext["API Nguồn (OpenAQ, WAQI, Open-Meteo)"]
    User["Người dùng (Khách / Đăng ký)"]
    Admin["Quản trị viên"]

    P1["1.0 Thu thập, Chuẩn hóa\n& Kiểm soát Chất lượng (QC)"]
    P2["2.0 Truy vấn Không gian PostGIS\n& Hiển thị Bản đồ WebGIS"]
    P3["3.0 Phân tích Chuỗi Thời gian,\nKhí tượng & So sánh Khu vực"]
    P4["4.0 Phát hiện Cảnh báo Ô nhiễm\n& Cảnh báo Kỹ thuật"]
    P5["5.0 Quản trị Hệ thống,\nNgười dùng & Nhật ký Kiểm toán"]

    D1[("D1: monitoring_stations & sensors")]
    D2[("D2: pm25_observations & model_pm25_values")]
    D3[("D3: weather_data")]
    D4[("D4: administrative_areas")]
    D5[("D5: air_quality_alerts")]
    D6[("D6: users, favorites, ingestion_jobs & audit_logs")]

    Ext --> P1
    P1 --> D1
    P1 --> D2
    P1 --> D3
    P1 --> D6

    D1 --> P2
    D2 --> P2
    D4 --> P2
    User <--> P2

    D2 --> P3
    D3 --> P3
    D4 --> P3
    User <--> P3

    D1 --> P4
    D2 --> P4
    P4 --> D5
    D5 --> User

    Admin <--> P5
    P5 <--> D1
    P5 <--> D6
```

---

## 4. Nguyên tắc Phân tách Mô-đun (Modular Separation Principles)

Trong thư mục `apps/api/src/modules/`, hệ thống được chia thành 6 module độc lập, giao tiếp qua tầng Service rõ ràng:
1. `ingestion/`: Chứa các adapter kết nối `OpenAqAdapter`, `WaqiAdapter`, `OpenMeteoAqAdapter`, `OpenMeteoWeatherAdapter`, cùng bộ `QualityControlPipeline`.
2. `gis/`: Chứa các hàm truy vấn không gian thuần PostGIS (`findNearestStations`, `findStationsWithinRadius`, `findAdministrativeAreaByPoint`, `getAreaStatistics`, `filterByBoundingBox`).
3. `monitoring/`: Phục vụ dữ liệu PM2.5 mới nhất, lịch sử trạm, lưới mô hình và timeline.
4. `analytics/`: Xử lý tổng hợp thời gian (theo giờ/ngày), tính hệ số tương quan khí tượng Pearson $r$, so sánh đa trạm và xuất CSV/PDF.
5. `alerts/`: Động cơ quy tắc phát hiện vượt ngưỡng QCVN 05:2023/BTNMT, WHO và phát hiện trạm mất tín hiệu (`STALE`/`UNAVAILABLE`).
6. `admin/`: Quản lý người dùng, phân quyền JWT, nhật ký `ingestion_jobs` và `audit_logs`.

