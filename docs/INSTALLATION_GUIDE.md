# HƯỚNG DẪN CÀI ĐẶT MÔI TRƯỜNG VÀ CÔNG CỤ (INSTALLATION GUIDE)
## Dự án: Hanoi PM2.5 GIS

**Ngày cập nhật:** 28/10/2026  
**Hệ điều hành mục tiêu:** Windows 10 / Windows 11 (`win32 x64`)

---

## 1. Các công cụ đã được cài đặt sẵn trên máy của bạn (Đã kiểm chứng)

Qua kiểm tra tự động ở Giai đoạn 0, máy tính của bạn **đã có sẵn đầy đủ các công cụ cốt lõi** để phát triển dự án:

1. **Node.js:** `v24.22.1` (Đã cài tại `C:\Program Files\nodejs\node.exe`)
2. **npm / npx:** `11.19.1` (Đã cài tại `C:\Program Files\nodejs\npm.cmd`)
3. **Git:** `2.56.0.windows.3` (Đã cấu hình tài khoản `datwhite21`)
4. **Google Antigravity IDE:** Đang hoạt động tại workspace `c:\Users\ADMIN\Documents\DALN`

> [!TIP]
> **Bạn KHÔNG cần phải tải hay cài đặt thêm Node.js hoặc Git.**

---

## 2. Cấu hình khuyến nghị cho Windows PowerShell (Tùy chọn nhưng rất hữu ích)

Hiện tại trên máy Windows của bạn, chính sách thực thi script PowerShell (`ExecutionPolicy`) đang ở trạng thái mặc định `Undefined` (tương đương `Restricted`). Điều này khiến lệnh `npm` (gọi file `npm.ps1`) báo lỗi `running scripts is disabled on this system`, dù gọi `npm.cmd` vẫn chạy bình thường.

Để gõ lệnh `npm` và `npx` thuận tiện trong mọi cửa sổ Terminal của Antigravity, bạn chỉ cần mở PowerShell và chạy 1 lệnh duy nhất sau (không cần quyền Admin):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

Sau khi chạy lệnh trên, bạn có thể kiểm tra lại bằng:
```powershell
npm -v
```
Kết quả in ra `11.19.1` là thành công.

---

## 3. Hướng dẫn đăng ký các API Key miễn phí cần thiết cho Giai đoạn 0 & Giai đoạn 4

Để lấy dữ liệu **trạm quan trắc thực tế tại Hà Nội**, bạn cần đăng ký **1 API Key bắt buộc (OpenAQ v3)** và **1 API Token khuyến nghị (WAQI)**. Cả hai đều hoàn toàn miễn phí 100%, không cần thẻ tín dụng.

### 3.1. Đăng ký OpenAQ API Key v3 (Bắt buộc — Nguồn quan trắc PM2.5 chính)
- **Trang chính thức:** https://explore.openaq.org/register
- **Các bước thực hiện:**
  1. Truy cập https://explore.openaq.org/register và điền Họ tên, Email, Mật khẩu để tạo tài khoản.
  2. Mở hộp thư Email của bạn và nhấn vào liên kết xác nhận tài khoản từ OpenAQ.
  3. Đăng nhập tại https://explore.openaq.org/login.
  4. Nhấn vào biểu tượng **Account / Profile** (góc trên bên phải) → chọn mục **API Keys** (hoặc truy cập trang quản lý tài khoản).
  5. Nhấn tạo/sao chép chuỗi **API Key** (chuỗi ký tự dài 64 ký tự hex).
  6. Dán vào biến `OPENAQ_API_KEY=` trong file `.env` tại thư mục gốc `c:\Users\ADMIN\Documents\DALN\.env` (tuyệt đối không gửi key vào khung chat để bảo mật).

### 3.2. Đăng ký WAQI API Token (Khuyến nghị — Nguồn đối chiếu trạm quan trắc Hà Nội)
- **Trang chính thức:** https://aqicn.org/data-platform/token/
- **Các bước thực hiện:**
  1. Truy cập https://aqicn.org/data-platform/token/.
  2. Nhập địa chỉ Email của bạn và tên tổ chức/dự án (ví dụ: `Hanoi PM2.5 WebGIS Student Thesis`).
  3. Tích chọn đồng ý điều khoản và nhấn **Submit**.
  4. Mở Email, nhấn vào đường dẫn xác nhận để nhận mã **Token** (40 ký tự).
  5. Dán vào biến `WAQI_API_TOKEN=` trong file `.env` tại `c:\Users\ADMIN\Documents\DALN\.env`.

---

## 4. Các dịch vụ sẽ thiết lập ở các giai đoạn tiếp theo (Chưa cần làm ngay ở Giai đoạn 0)

Theo đúng nguyên tắc *"Không yêu cầu cài đặt toàn bộ ứng dụng cùng lúc nếu chưa cần sử dụng"*, các dịch vụ sau sẽ được tôi hướng dẫn chi tiết từng bước khi bước vào đúng giai đoạn tương ứng:
- **Giai đoạn 3 (Backend & Database):** Tạo project miễn phí trên **Supabase** (https://supabase.com/) và bật extension **PostGIS**.
- **Giai đoạn 9 (Triển khai công khai):** Kết nối GitHub với **Vercel** (Frontend) và **Render** (Backend).
