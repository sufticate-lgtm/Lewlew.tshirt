# Xưởng.In — Hệ thống đặt áo in theo yêu cầu

**Không rành kỹ thuật và chỉ muốn đưa web này lên mạng?** Mở file `BAT-DAU-O-DAY.md` trong thư mục này — hướng dẫn từng bước bằng cách bấm chuột, không cần biết code. Phần dưới đây là tài liệu kỹ thuật, dành cho ai muốn hiểu sâu hơn hoặc tự chỉnh sửa code.

Khách chọn áo và mẫu in **có sẵn từ shop**, đổi màu áo + màu hình in theo bảng màu do shop cung cấp (không tải ảnh lên), rồi đặt hàng. Có giỏ hàng, thanh toán, tra cứu đơn hàng, và trang quản trị để quản lý màu áo / màu in / mẫu in / đơn hàng.

```
xuongin-shop/
  server/        API (Node + Express, lưu dữ liệu bằng file JSON)
  client/        Giao diện khách hàng + trang quản trị (React + Vite)
  package.json   Gộp lệnh cài đặt + build của cả hai, để deploy như MỘT dịch vụ duy nhất
  render.yaml    Cấu hình deploy tự động lên Render (xem BAT-DAU-O-DAY.md)
```

Khi build (`npm run build` ở thư mục gốc), giao diện React được biên dịch thành file tĩnh và **server Express phục vụ luôn các file đó** cùng với API — nghĩa là khi đưa lên mạng, bạn chỉ cần vận hành một dịch vụ duy nhất, một đường link duy nhất, không cần hai server riêng như lúc code (đỡ một bước cấu hình so với bản đầu).

## 1. Chạy thử trên máy của bạn

Cần Node.js 18 trở lên.

```bash
# Backend
cd server
cp .env.example .env        # đổi ADMIN_PASSWORD trong file .env
npm install
npm start                   # chạy tại http://localhost:4000

# Frontend (terminal khác)
cd client
npm install
npm run dev                 # chạy tại http://localhost:5173
```

Mở `http://localhost:5173` để xem trang khách hàng, và `http://localhost:5173/admin` để vào trang quản trị (mật khẩu lấy từ `ADMIN_PASSWORD` trong file `.env` của server).

Đây là cách chạy lúc đang phát triển/sửa code (hai server riêng, có proxy). Khi đưa lên môi trường thật, dùng lệnh ở thư mục gốc thay vì hai lệnh trên:

```bash
npm run build   # cài đặt + build cả client và server thành một bản duy nhất
npm start        # chạy server, lúc này phục vụ luôn cả giao diện tại cùng một địa chỉ
```

## 2. Dữ liệu mẫu in và màu sắc

Toàn bộ màu áo, màu hình in, và mẫu in nằm trong `server/data/db.json`, chỉnh được trực tiếp trong trang `/admin` (tab **Màu áo**, **Màu hình in**, **Mẫu in**) — không cần sửa code.

Mỗi mẫu in là một đoạn SVG do shop chuẩn bị sẵn, dùng `__PRIMARY__` và `__SECONDARY__` ở chỗ cần đổi màu; khách chỉ chọn màu từ bảng màu, không tải ảnh lên. Muốn có mẫu in phức tạp hơn (nhiều hơn 2 vùng màu, hình minh hoạ chi tiết), cách làm thực tế nhất là thuê designer xuất file SVG rồi dán mã vào ô "Mã SVG" trong trang quản trị.

## 3. Vì sao dữ liệu lưu bằng file JSON

Để bản này chạy được ngay không cần cài hệ quản trị cơ sở dữ liệu. `server/db.js` là lớp truy cập dữ liệu duy nhất — khi lượng đơn hàng lớn lên, thay nội dung hai hàm `readDB`/`writeDB` bằng truy vấn PostgreSQL/MySQL (ví dụ qua Prisma) mà **không cần sửa** các route trong `server.js`.

## 4. Thanh toán — phần quan trọng cần làm thêm

Bản này có 3 lựa chọn thanh toán (COD, chuyển khoản, ví điện tử) nhưng **chưa xử lý tiền thật** — khi khách bấm "Xác nhận đặt hàng", hệ thống chỉ lưu đơn hàng và phương thức đã chọn, không có giao dịch tài chính nào xảy ra. Đây là lựa chọn chủ động: tích hợp cổng thanh toán cần tài khoản merchant thật của bạn, việc đó không thể làm thay bạn được.

Để nhận tiền thật, bạn cần đăng ký merchant với một trong các cổng sau và để **backend** (không phải trình duyệt khách hàng) gọi API của họ khi tạo đơn:

- **VNPay**: tài liệu tại `https://sandbox.vnpayment.vn/apis/` — tạo URL thanh toán ở route `POST /api/orders`, redirect khách sang VNPay, nhận callback (IPN) ở một route mới để cập nhật `order.status`.
- **Momo Business**: tài liệu tại `https://developers.momo.vn` — luồng tương tự VNPay (tạo request → redirect → nhận callback).
- **Chuyển khoản ngân hàng thủ công**: cách đơn giản nhất để bắt đầu — không cần tích hợp gì, nhân viên xác nhận đã nhận tiền rồi tự đổi trạng thái đơn trong trang quản trị.

Việc tích hợp các cổng trên cần khoá API riêng của bạn (không thể đưa vào file mã nguồn chung này), nên mình để phần này dưới dạng hướng dẫn thay vì code giả — tránh trường hợp bạn tưởng đã chạy được nhưng thực ra tiền không hề được thu.

## 5. Đưa lên môi trường thật (deploy)

Cách đơn giản nhất, không cần biết kỹ thuật: làm theo `BAT-DAU-O-DAY.md` (dùng GitHub + Render, chỉ bấm chuột).

Cách thủ công nếu bạn quen dòng lệnh: bất kỳ nền tảng nào chạy được Node.js (Render, Railway, một VPS, ...) đều dùng được hai lệnh `npm run build` rồi `npm start` ở thư mục gốc — không cần deploy `client` và `server` riêng, vì server đã phục vụ luôn bản build của client. Chỉ cần đặt biến môi trường `ADMIN_PASSWORD` (đừng dùng giá trị mẫu) trên nền tảng bạn chọn. Nền tảng tự cấp HTTPS, không cần tự cấu hình.

## 6. Những phần nên làm tiếp khi shop hoạt động ổn định

- Đổi xác thực admin đơn giản (1 mật khẩu) sang đăng nhập có tài khoản riêng cho từng nhân viên.
- Gửi email/SMS xác nhận đơn hàng tự động (ví dụ qua SendGrid, hoặc tổng đài SMS trong nước).
- Theo dõi số lượng còn lại theo từng size/màu nếu sản xuất theo lô có giới hạn.
