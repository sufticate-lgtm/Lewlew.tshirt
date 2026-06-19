# Hướng Dẫn Đưa Web Lên Mạng — Dành Cho Người Không Rành Kỹ Thuật

Làm theo đúng thứ tự dưới đây. Bạn không cần biết viết code, không cần dùng dòng lệnh (terminal) — chỉ cần dùng trình duyệt, giống như đăng ký một tài khoản mạng xã hội.

Có 2 việc cần làm: (1) đưa bộ mã nguồn lên GitHub — như một "kho lưu trữ" online, (2) cho Render đọc kho đó và tự động dựng web cho bạn, miễn phí.

## Phần 1 — Đưa mã nguồn lên GitHub

**1. Tạo tài khoản GitHub**
Vào `github.com` → bấm **Sign up** → làm theo hướng dẫn (nhập email, đặt mật khẩu, xác minh). Miễn phí.

**2. Tạo một "repository" (kho chứa code) mới**
Sau khi đăng nhập, bấm nút **+** ở góc trên bên phải → **New repository**. Đặt tên ví dụ `xuongin-shop`. Chọn **Public**. **Không** tick các ô "Add a README file" hay "Add .gitignore" — để trống hết. Bấm **Create repository**.

**3. Giải nén file zip mình đã gửi cho bạn**
Trên máy bạn, nhấn chuột phải vào file `xuongin-shop.zip` → **Extract All / Giải nén**. Bạn sẽ có một thư mục tên `xuongin-shop` chứa các thư mục con `client`, `server` và vài file lẻ.

**4. Tải toàn bộ nội dung lên GitHub**
Trên trang repository vừa tạo, bấm dòng chữ **uploading an existing file**. Mở thư mục `xuongin-shop` vừa giải nén ở bước 3, **chọn tất cả các mục bên trong nó** (tức là chọn thư mục `client`, thư mục `server`, file `render.yaml`, file `package.json`, file `README.md` — chọn hết, không phải chỉ chọn thư mục `xuongin-shop` to bên ngoài), rồi **kéo-thả** chúng vào vùng tải file trên trang GitHub. Cuộn xuống, bấm **Commit changes** màu xanh.

Vậy là code đã có trên mạng. Phần 2 sẽ cho nó "sống" thành một trang web thật.

## Phần 2 — Dựng web bằng Render (miễn phí, không cần thẻ tín dụng)

**5. Tạo tài khoản Render**
Vào `render.com` → bấm **Get Started** → chọn **Sign up with GitHub** (cách này tiện nhất vì Render sẽ tự kết nối với tài khoản GitHub bạn vừa tạo).

**6. Tạo dịch vụ từ Blueprint**
Trong trang quản lý của Render, bấm **New +** → chọn **Blueprint**. Chọn repository `xuongin-shop` bạn vừa tạo. Render sẽ tự đọc file `render.yaml` có sẵn trong code và tự điền cấu hình — bạn không cần gõ gì thêm ở phần này.

**7. Đặt mật khẩu quản trị**
Render sẽ hỏi giá trị cho biến `ADMIN_PASSWORD`. Đây là mật khẩu để bạn đăng nhập vào trang quản trị (`/admin`) sau này — đặt một mật khẩu bạn dễ nhớ nhưng người khác khó đoán, và **ghi lại** nó. Bấm **Apply** hoặc **Create**.

**8. Chờ Render dựng web**
Render sẽ tự cài đặt và build trong khoảng 3–6 phút. Bạn sẽ thấy log chạy trên màn hình — cứ để nó chạy, không cần làm gì. Khi xong, trạng thái chuyển thành **Live** màu xanh, và Render cho bạn một đường link dạng:

```
https://xuongin-shop.onrender.com
```

Đó chính là trang web của bạn — gửi link này cho bất kỳ ai, họ mở lên là dùng được, không cần cài gì.

**9. Vào trang quản trị**
Thêm `/admin` vào cuối link, ví dụ `https://xuongin-shop.onrender.com/admin`, rồi đăng nhập bằng mật khẩu đã đặt ở bước 7.

**10. Tải ảnh mẫu in thật của bạn lên**
Vào tab **Mẫu in & ảnh**. Có sẵn một mẫu ví dụ ("Lazy Athlete Yoga") dùng đúng ảnh bạn từng gửi, để bạn thấy giao diện hoạt động ra sao. Để thêm mẫu của bạn:

- Gõ tên mẫu in (ví dụ "Mèo Lười Tập Gym") vào ô cuối trang → bấm **Thêm mẫu in**.
- Trong mẫu vừa tạo, gõ tên biến thể màu mực (ví dụ "Hồng - Kem" nếu hình in màu đó), chọn một màu đại diện bất kỳ để làm nút bấm → bấm **+ Biến thể màu mực**.
- Bên dưới biến thể, mỗi ô tương ứng một màu áo. Bấm vào ô **Tải ảnh** của màu áo nào bạn có ảnh, chọn file ảnh từ máy — xong ngay, không cần bấm lưu gì thêm. Màu áo nào không tải ảnh thì khách sẽ không chọn được màu đó.
- Nếu cùng một mẫu in có nhiều phiên bản màu mực khác nhau, lặp lại bước "+ Biến thể màu mực" cho mỗi phiên bản, rồi tải ảnh tương ứng.

Tab **Màu áo** dùng để thêm các màu áo bạn có trước (ví dụ Trắng, Đen, Navy...) — làm trước khi tải ảnh ở tab Mẫu in để có đủ ô màu áo cho từng biến thể.

## Vài điều cần biết khi dùng bản miễn phí

Vì là gói miễn phí, nếu không có ai vào trang trong 15 phút, Render sẽ cho trang "ngủ". Lượt khách đầu tiên sau đó sẽ phải chờ khoảng 30–60 giây để trang "thức dậy" — đây là bình thường, không phải lỗi, chỉ xảy ra với lượt truy cập đầu tiên sau thời gian vắng khách.

**Quan trọng hơn:** ở gói miễn phí, mỗi lần trang "thức dậy" sau khi ngủ (hoặc mỗi lần mình cập nhật code cho bạn), **toàn bộ ảnh bạn đã tải lên qua trang quản trị và các đơn hàng mới sẽ bị xoá sạch**, chỉ có dữ liệu mẫu có sẵn (mẫu "Lazy Athlete Yoga") là không mất vì nó nằm sẵn trong code. Gói miễn phí dùng để thử giao diện, tập làm quen với trang quản trị thì rất tốt — nhưng **đừng tải ảnh thật hàng loạt hoặc nhận đơn hàng thật khi còn ở gói miễn phí**, vì bạn sẽ mất hết sau một thời gian không ai vào web.

## Khi bạn sẵn sàng bán hàng thật

Làm theo các bước dưới đây một lần — sau đó ảnh và đơn hàng sẽ được giữ lại mãi, không còn bị xoá nữa.

**1. Nâng cấp dịch vụ lên gói trả phí thấp nhất**
Trong trang quản lý Render, mở dịch vụ `xuongin-shop` → vào tab **Settings** → tìm phần **Instance Type** → chọn gói **Starter** (khoảng 7 USD/tháng, cần nhập thẻ thanh toán). Gói này cũng giúp trang không bị "ngủ" nữa.

**2. Gắn ổ đĩa bền (Persistent Disk)**
Vẫn trong trang dịch vụ, tìm mục **Disks** ở menu bên trái → bấm **Add Disk**. Đặt tên bất kỳ (ví dụ `xuongin-data`), **Mount Path** điền đúng `/data`, chọn dung lượng nhỏ nhất (1 GB là dư dùng cho rất nhiều ảnh) → bấm **Save**.

**3. Khai báo đường dẫn lưu dữ liệu**
Vào tab **Environment** → bấm **Add Environment Variable** → Key điền `STORAGE_DIR`, Value điền `/data` → **Save Changes**. Render sẽ tự deploy lại một lần.

Từ lúc này, mọi ảnh tải lên qua trang quản trị và mọi đơn hàng mới đều được lưu trên ổ đĩa bền — không còn mất khi trang khởi động lại nữa.

## Khi mình gửi cho bạn một bộ code mới (cập nhật)

Làm theo đúng các bước sau, theo thứ tự:

**1. Xoá thư mục `server/data` cũ trên GitHub (nếu có)**
Mở repository `xuongin-shop` trên GitHub → bấm vào thư mục `server` → bấm vào thư mục `data` (nếu thấy) → bấm vào file `db.json` bên trong → ở góc trên bên phải của khung xem nội dung file, bấm biểu tượng thùng rác (Delete file) → cuộn xuống, bấm **Commit changes**. Khi file cuối cùng trong một thư mục bị xoá, GitHub tự xoá luôn thư mục rỗng đó.

*Lưu ý:* bản code mới có một lớp tự bảo vệ — nếu bạn quên bước này, web vẫn tự nhận ra dữ liệu cũ không hợp với code mới và tự thay bằng dữ liệu mẫu mới, không bị treo hay lỗi trắng trang. Nhưng làm bước này vẫn tốt hơn cho gọn gàng.

**2. Giải nén bộ file zip mới**
Giống bước 3 ở phần "Đưa mã nguồn lên GitHub" phía trên: nhấn chuột phải vào file zip mới → **Extract All / Giải nén**.

**3. Tải bộ file mới lên, đè lên file cũ**
Trên trang chính của repository `xuongin-shop`, bấm **Add file** (góc trên bên phải khung danh sách file) → **Upload files**. Mở thư mục vừa giải nén ở bước 2, **chọn tất cả các mục bên trong nó**, kéo-thả vào vùng tải file. File nào trùng đường dẫn với file đang có sẽ tự được thay nội dung mới, file nào chưa có sẽ được thêm vào — không cần làm gì thêm cho việc này. Cuộn xuống, bấm **Commit changes**.

**4. Chờ Render tự build lại**
Mỗi lần bạn Commit changes trên GitHub, Render tự nhận thấy và build lại — bạn không cần làm gì trên Render. Vào lại trang dịch vụ trên Render, xem log build chạy, đợi đến khi trạng thái là **Live**, rồi mở lại link web để kiểm tra. Mật khẩu quản trị bạn đã đặt trước đó vẫn giữ nguyên, không cần đặt lại.

Nếu mắc ở bước nào, gửi mình ảnh chụp màn hình của bước đó, mình sẽ chỉ tiếp.
