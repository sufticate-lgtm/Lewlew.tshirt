# Xưởng.In — Hệ thống đặt áo in theo yêu cầu

**Không rành kỹ thuật và chỉ muốn đưa web này lên mạng?** Mở file `BAT-DAU-O-DAY.md` trong thư mục này — hướng dẫn từng bước bằng cách bấm chuột, không cần biết code. Phần dưới đây là tài liệu kỹ thuật, dành cho ai muốn hiểu sâu hơn hoặc tự chỉnh sửa code.

Khách chọn mẫu in, chọn màu mực in (mỗi mẫu có thể có vài biến thể màu), rồi chọn màu áo — mỗi lựa chọn hiển thị **ảnh chụp thật** do bạn tải lên qua trang quản trị (không phải hình vẽ minh hoạ). Có giỏ hàng, thanh toán, tra cứu đơn hàng, và trang quản trị để quản lý màu áo / mẫu in / biến thể màu mực / ảnh / đơn hàng.

```
xuongin-shop/
  server/        API (Node + Express, lưu dữ liệu bằng file JSON + ảnh tải lên)
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

## 2. Mẫu in, biến thể màu mực, và ảnh

Vào trang `/admin` → tab **Mẫu in & ảnh**. Cấu trúc dữ liệu có 3 lớp:

1. **Mẫu in** — ví dụ "Lazy Athlete Yoga". Chỉ có tên, không có ảnh trực tiếp.
2. **Biến thể màu mực** — mỗi mẫu in có thể có nhiều biến thể (ví dụ bản in màu Hồng - Kem, bản in màu Cam - Trắng). Mỗi biến thể có một màu đại diện (chỉ để hiển thị nút chọn, không cần khớp chính xác từng pixel).
3. **Ảnh theo từng màu áo** — với mỗi biến thể, bạn tải lên một ảnh chụp riêng cho từng màu áo bạn có. Màu áo nào chưa có ảnh thì khách sẽ không chọn được màu đó khi đang xem biến thể này — không có xử lý ảnh tự động, ảnh hiển thị đúng như file bạn tải lên.

Dữ liệu mẫu có sẵn (mẫu "Lazy Athlete Yoga", biến thể "Hồng - Kem", ảnh áo Xanh Ngọc) dùng chính ảnh bạn đã gửi, nằm trong `server/seed-assets/uploads/` — ảnh này nằm trong code nên không bao giờ mất, dùng để bạn thấy ngay kết quả mà không cần tải gì trước.

## 3. Vì sao dữ liệu lưu bằng file JSON + ổ đĩa thường — và lưu ý quan trọng

Để bản này chạy được ngay không cần cài hệ quản trị cơ sở dữ liệu. `server/db.js` là lớp truy cập dữ liệu duy nhất — khi lượng đơn hàng lớn lên, thay nội dung hai hàm `readDB`/`writeDB` bằng truy vấn PostgreSQL/MySQL mà **không cần sửa** các route trong `server.js`.

**Lưu ý quan trọng khi deploy lên Render (hoặc bất kỳ nền tảng PaaS miễn phí tương tự):** ổ đĩa của gói miễn phí là "ổ đĩa tạm" — mọi ảnh bạn tải lên qua trang quản trị và mọi đơn hàng mới **sẽ mất** mỗi khi dịch vụ khởi động lại (kể cả việc tự "ngủ" rồi "thức" sau 15 phút không có khách, không chỉ khi bạn chủ động deploy lại). Gói miễn phí dùng tốt để thử nghiệm, nhưng **không nên dùng để bán hàng thật** với dữ liệu này. Xem mục "Khi bạn sẵn sàng bán hàng thật" trong `BAT-DAU-O-DAY.md` để biết cách gắn ổ đĩa bền (Persistent Disk) — chỉ vài cú bấm, không cần sửa code, chi phí thêm rất nhỏ.

## 4. Thanh toán — phần quan trọng cần làm thêm

Bản này có 3 lựa chọn thanh toán (COD, chuyển khoản, ví điện tử) nhưng **chưa xử lý tiền thật** — khi khách bấm "Xác nhận đặt hàng", hệ thống chỉ lưu đơn hàng và phương thức đã chọn, không có giao dịch tài chính nào xảy ra. Đây là lựa chọn chủ động: tích hợp cổng thanh toán cần tài khoản merchant thật của bạn, việc đó không thể làm thay bạn được.

Để nhận tiền thật, bạn cần đăng ký merchant với một trong các cổng sau và để **backend** (không phải trình duyệt khách hàng) gọi API của họ khi tạo đơn:

- **VNPay**: tài liệu tại `https://sandbox.vnpayment.vn/apis/` — tạo URL thanh toán ở route `POST /api/orders`, redirect khách sang VNPay, nhận callback (IPN) ở một route mới để cập nhật `order.status`.
- **Momo Business**: tài liệu tại `https://developers.momo.vn` — luồng tương tự VNPay (tạo request → redirect → nhận callback).
- **Chuyển khoản ngân hàng thủ công**: cách đơn giản nhất để bắt đầu — không cần tích hợp gì, nhân viên xác nhận đã nhận tiền rồi tự đổi trạng thái đơn trong trang quản trị.

Việc tích hợp các cổng trên cần khoá API riêng của bạn (không thể đưa vào file mã nguồn chung này), nên mình để phần này dưới dạng hướng dẫn thay vì code giả — tránh trường hợp bạn tưởng đã chạy được nhưng thực ra tiền không hề được thu.

## 5. Đưa lên môi trường thật (deploy)

Cách đơn giản nhất, không cần biết kỹ thuật: làm theo `BAT-DAU-O-DAY.md` (dùng GitHub + Render, chỉ bấm chuột).

Cách thủ công nếu bạn quen dòng lệnh: bất kỳ nền tảng nào chạy được Node.js (Render, Railway, một VPS, ...) đều dùng được hai lệnh `npm run build` rồi `npm start` ở thư mục gốc — không cần deploy `client` và `server` riêng, vì server đã phục vụ luôn bản build của client. Chỉ cần đặt biến môi trường `ADMIN_PASSWORD` (đừng dùng giá trị mẫu) trên nền tảng bạn chọn. Nếu nền tảng đó có ổ đĩa bền, đặt thêm `STORAGE_DIR` thành đường dẫn đã mount để ảnh và đơn hàng không bị mất (xem mục 3). Nền tảng tự cấp HTTPS, không cần tự cấu hình.

## 6. Những phần nên làm tiếp khi shop hoạt động ổn định

- Đổi xác thực admin đơn giản (1 mật khẩu) sang đăng nhập có tài khoản riêng cho từng nhân viên.
- Gửi email/SMS xác nhận đơn hàng tự động (ví dụ qua SendGrid, hoặc tổng đài SMS trong nước).
- Theo dõi số lượng còn lại theo từng size/màu nếu sản xuất theo lô có giới hạn.
