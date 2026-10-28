# ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG BACKEND (REST API SPECIFICATION)
## Dự án: Hanoi PM2.5 GIS

**Phiên bản:** 1.0 (Giai đoạn 1)  
**Tiền tố API:** `/api/v1`  
**Định dạng trao đổi:** `application/json; charset=utf-8`

---

## 1. Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)

Mọi API trả về cấu trúc JSON thống nhất:

```json
{
  "success": true,
  "timestampUtc": "2026-10-28T11:00:00.000Z",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 37
  }
}
```

Khi xảy ra lỗi (Validation / Auth / Rate limit / Server error):
```json
{
  "success": false,
  "timestampUtc": "2026-10-28T11:00:00.000Z",
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Thông báo lỗi tiếng Việt rõ ràng",
    "details": []
  }
}
```

---

## 2. Danh mục các Endpoint Công khai (Public WebGIS & Analytics APIs)

| Phương thức | Đường dẫn (Endpoint) | Tham số truy vấn (`Query Params`) | Chức năng & Kết quả trả về |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Không | Kiểm tra sức khỏe Backend, kết nối PostGIS và thời điểm đồng bộ gần nhất của từng nguồn dữ liệu. |
| `GET` | `/api/v1/stations` | `status` (`FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`), `source` (`OPENAQ_V3`, `WAQI`), `bbox` (`minLon,minLat,maxLon,maxLat`), `near` (`lat,lon`), `radiusMeters`, `withinHanoi` (`true`/`false`) | Danh sách các trạm quan trắc kèm tọa độ GeoJSON, số đo PM2.5 mới nhất, trạng thái độ tươi và khoảng cách nếu truyền `near`. |
| `GET` | `/api/v1/stations/:id` | Không | Thông tin chi tiết 1 trạm, danh sách cảm biến (`sensors`), đơn vị hành chính chứa trạm (`ST_Within`), số đo mới nhất và phép tính `VN_AQI` / `US_AQI`. |
| `GET` | `/api/v1/stations/:id/observations` | `from`, `to` (ISO-8601), `interval` (`raw`, `1h`, `24h`), `includeFlagged` (`false` mặc định), `page`, `limit` | Chuỗi thời gian số đo PM2.5, PM10 tại trạm kèm thống kê (`avg`, `min`, `max`, `missingRatePct`, `trend`). |
| `GET` | `/api/v1/pm25/latest` | `includeStale` (`true`/`false`), `includeModelGrid` (`true`/`false`) | Snapshot toàn cảnh PM2.5 mới nhất toàn Hà Nội (cả điểm trạm quan trắc thực và lưới ô mô hình CAMS Global) để render lớp bản đồ mặc định. |
| `GET` | `/api/v1/pm25/history` | `from`, `to`, `stationIds` (comma-separated), `aggregation` (`hourly`, `daily`) | Lịch sử PM2.5 tổng hợp của một hoặc nhiều trạm để phục vụ Timeline và biểu đồ lịch sử. |
| `GET` | `/api/v1/pm25/model` | `validAt` (ISO-8601), `from`, `to` | Dữ liệu các ô lưới mô hình CAMS Global (`0.4° × 0.4° ~ 40 km`) trên toàn Hà Nội cho quá khứ 48h, hiện tại và dự báo 72h tới. |
| `GET` | `/api/v1/weather/latest` | `lat`, `lon` (tùy chọn) | Dữ liệu khí tượng hiện tại (Nhiệt độ, Độ ẩm, Tốc độ gió, Hướng gió, Áp suất, Lượng mưa) trên toàn lưới Hà Nội. |
| `GET` | `/api/v1/weather/history` | `from`, `to`, `stationId` hoặc `gridCellId` | Chuỗi thời gian khí tượng kết hợp nồng độ PM2.5 và hệ số tương quan Pearson $r$ cho phân hệ Phân tích Khí tượng. |
| `GET` | `/api/v1/gis/inspect-point` | `lat`, `lon` (Bắt buộc) | **Endpoint cho Popup Vị trí Bất kỳ:** Dùng PostGIS xác định Xã/Phường/Quận/Huyện chứa điểm (`ST_Contains`), tìm trạm hoạt động gần nhất (`ST_Distance`), và lấy giá trị mô hình CAMS + Thời tiết tại ô lưới chứa điểm đó. |
| `GET` | `/api/v1/areas` | `level` (`1`, `2`, `3`), `parentId`, `bbox`, `includeGeometry` (`true`/`false`) | Danh sách và hình học GeoJSON của các đơn vị hành chính Thành phố Hà Nội. |
| `GET` | `/api/v1/areas/:id/statistics` | `from`, `to` | Thống kê các trạm thuộc đơn vị hành chính (`ST_Within`), nồng độ PM2.5 trung bình/max/min của các trạm trong vùng, kèm giá trị mô hình tham khảo nếu vùng chưa có trạm đo. |
| `GET` | `/api/v1/analysis/compare` | `stationIds` hoặc `areaIds`, `from`, `to` | So sánh song song 2–4 trạm/khu vực (PM2.5 trung bình, cực đại, tỷ lệ thiếu dữ liệu, xu hướng và điều kiện khí tượng). |
| `GET` | `/api/v1/reports/export` | `format` (`csv`, `pdf`), `stationIds`, `areaId`, `from`, `to` | Xuất tệp dữ liệu `.csv` hoặc báo cáo tổng hợp `.pdf`. |
| `GET` | `/api/v1/alerts` | `status` (`ACTIVE`, `RESOLVED`), `category`, `severity`, `areaId`, `stationId` | Danh sách cảnh báo ô nhiễm PM2.5 vượt ngưỡng và cảnh báo kỹ thuật (trạm mất dữ liệu). |
| `GET` | `/api/v1/data-sources/status` | Không | Trạng thái kết nối, thời điểm đồng bộ thành công gần nhất và số lượng trạm hoạt động của từng nhà cung cấp (`OpenAQ`, `WAQI`, `Open-Meteo`). |
| `GET` | `/api/v1/stream/events` | Không | Kết nối **Server-Sent Events (SSE)** đẩy thông báo tự động xuống trình duyệt ngay khi có dữ liệu PM2.5 hoặc cảnh báo mới. |

---

## 3. Danh mục các Endpoint Xác thực, Người dùng & Quản trị (Protected APIs)

| Phương thức | Đường dẫn (Endpoint) | Quyền yêu cầu | Chức năng |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Công khai | Đăng ký tài khoản người dùng mới. |
| `POST` | `/api/v1/auth/login` | Công khai | Đăng nhập và nhận JWT Access Token. |
| `GET` | `/api/v1/users/me/favorites` | `USER` / `ADMIN` | Lấy danh sách địa điểm yêu thích và trạng thái PM2.5 tại trạm gần nhất của từng địa điểm. |
| `POST` | `/api/v1/users/me/favorites` | `USER` / `ADMIN` | Lưu địa điểm yêu thích mới (tự động dùng PostGIS gắn `nearest_station_id` và `administrative_area_id`). |
| `DELETE` | `/api/v1/users/me/favorites/:id` | `USER` / `ADMIN` | Xóa địa điểm yêu thích. |
| `POST` | `/api/v1/internal/ingest/trigger` | Header `X-Cron-Secret` hoặc `ADMIN` | Kích hoạt tiến trình thu thập dữ liệu tự động (dành cho GitHub Actions Cron hoặc Quản trị viên). |
| `POST` | `/api/v1/admin/stations` | `ADMIN` | Thêm mới hoặc cập nhật metadata trạm do hệ thống quản lý (ghi `audit_logs`). |
| `PATCH` | `/api/v1/admin/observations/:id/qc` | `ADMIN` | Đánh dấu lại cờ chất lượng `quality_flag` kèm lý do bắt buộc (giữ nguyên `raw_value`, ghi `audit_logs`). |
| `POST` | `/api/v1/admin/import/observations` | `ADMIN` | Nhập tệp dữ liệu quan trắc chuẩn hóa (CSV/JSON) có nguồn gốc hợp lệ (ghi `audit_logs`). |
| `GET` | `/api/v1/admin/ingestion-jobs` | `ADMIN` | Xem lịch sử đồng bộ dữ liệu (`ingestion_jobs`). |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN` | Xem nhật ký kiểm toán hệ thống (`audit_logs`). |

