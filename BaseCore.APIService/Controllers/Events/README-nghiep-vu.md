# Phần 2 - Event / Registration / Attendance

Tài liệu này mô tả nghiệp vụ của phần Event để thành viên phụ trách hiểu phạm vi, role, chức năng, luồng xử lý và các rule chính.

## 1. Mục tiêu

Phần Event là lõi nghiệp vụ của Volunteer Hub. Phần này quản lý toàn bộ vòng đời sự kiện tình nguyện:

- Organizer tạo event.
- Admin duyệt event.
- Volunteer đăng ký tham gia.
- Organizer xác nhận volunteer.
- Volunteer/organizer điểm danh.
- Hệ thống ghi nhận giờ tình nguyện và cấp chứng nhận.

## 2. Role liên quan

### Guest

- Xem danh sách event công khai.
- Xem chi tiết event đã được duyệt.
- Không được đăng ký nếu chưa đăng nhập.

### Volunteer

- Xem event.
- Đăng ký tham gia event.
- Bị chặn nếu event yêu cầu KYC mà volunteer chưa verified.
- Xem danh sách đăng ký của mình.
- Check-in bằng QR nếu đã được organizer confirm.
- Xem giờ tình nguyện, certificate/passport nếu có.

### Organizer

- Tạo event nếu đã verified.
- Sửa event của mình.
- Cấu hình event có yêu cầu KYC hay không.
- Cấu hình số lượng volunteer tối thiểu/tối đa.
- Xem danh sách volunteer đăng ký.
- Confirm/reject volunteer.
- Điểm danh thủ công cho volunteer.
- Hiển thị QR check-in tại địa điểm sự kiện.
- Quản lý ca làm việc nếu có.

### Admin

- Xem danh sách event chờ duyệt.
- Duyệt/từ chối event.
- Theo dõi event trong hệ thống.

## 3. Chức năng chính

### Event Management

- Tạo event.
- Sửa event.
- Upload ảnh event.
- Nhập địa chỉ có gợi ý tự động.
- Chọn vị trí trên bản đồ.
- Nếu tick trên bản đồ, hệ thống cập nhật lại địa chỉ theo tọa độ nếu reverse geocode khả dụng.
- Cấu hình:
  - Tên event.
  - Mô tả.
  - Thời gian.
  - Địa điểm.
  - Tọa độ.
  - Category.
  - Skill yêu cầu.
  - Số lượng volunteer tối thiểu.
  - Số lượng volunteer tối đa.
  - Có yêu cầu KYC hay không.

### Event Approval

- Event mới tạo ở trạng thái chờ duyệt.
- Admin duyệt thì event được hiển thị công khai.
- Admin từ chối thì organizer cần sửa/gửi lại.
- Volunteer chỉ đăng ký được event đã duyệt và còn mở.

### Registration

- Volunteer gửi đăng ký tham gia event.
- Hệ thống kiểm tra:
  - Đã đăng nhập chưa.
  - Có role volunteer không.
  - Event có tồn tại không.
  - Event đã approved chưa.
  - Event còn nhận đăng ký không.
  - Event có yêu cầu KYC không.
  - Volunteer đã đăng ký trước đó chưa.
  - Số lượng tối đa đã đủ chưa.
- Organizer confirm/reject registration.

### Attendance

- QR check-in:
  - Organizer mở mã QR của event.
  - Volunteer quét hoặc nhập mã check-in.
  - Hệ thống xác nhận volunteer đã được confirm.
  - Hệ thống ghi nhận attended và số giờ.
- Manual check-in:
  - Organizer chọn volunteer trong danh sách.
  - Organizer xác nhận điểm danh.
  - Hệ thống ghi nhận attended và số giờ.

### Certificate

- Sau khi volunteer hoàn thành event, hệ thống có thể tạo certificate.
- Core xử lý thuộc Event Service C#.
- Module phụ đề xuất: Rust Certificate Generator.
- Rust nhận dữ liệu và render file PDF/QR.

## 4. Luồng nghiệp vụ chính

### Luồng tạo và duyệt event

```text
1. Organizer đăng nhập.
2. Backend kiểm tra organizer đã verified chưa.
3. Organizer tạo event.
4. Event ở trạng thái Pending.
5. Admin xem danh sách event Pending.
6. Admin duyệt event.
7. Event chuyển sang Approved và hiển thị công khai.
```

### Luồng event yêu cầu KYC

```text
1. Organizer tạo hoặc sửa event.
2. Organizer bật option "Yêu cầu KYC".
3. Event được admin duyệt.
4. Volunteer chưa KYC bấm đăng ký.
5. Backend trả lỗi và không tạo registration.
6. Volunteer KYC verified bấm đăng ký.
7. Backend tạo registration Pending.
```

### Luồng đăng ký và confirm volunteer

```text
1. Volunteer xem chi tiết event.
2. Volunteer gửi đăng ký.
3. Hệ thống tạo registration Pending.
4. Organizer vào trang quản lý event.
5. Organizer xem danh sách đăng ký.
6. Organizer confirm hoặc reject.
7. Nếu confirm, volunteer có thể tham gia/check-in.
```

### Luồng điểm danh QR

```text
1. Organizer mở trang quản lý event.
2. Organizer hiển thị QR check-in.
3. Volunteer đã được confirm dùng tài khoản của mình để quét/nhập mã.
4. Backend kiểm tra registration hợp lệ.
5. Backend ghi nhận attended.
6. Hệ thống cộng giờ tình nguyện.
```

### Luồng điểm danh thủ công

```text
1. Organizer mở danh sách volunteer của event.
2. Organizer chọn volunteer cần điểm danh.
3. Organizer bấm xác nhận điểm danh.
4. Backend kiểm tra event thuộc organizer.
5. Backend ghi nhận attended.
6. Hệ thống cộng giờ tình nguyện.
```

### Luồng cấp certificate

```text
1. Event kết thúc hoặc volunteer đã attended đủ điều kiện.
2. Event Service chuẩn bị dữ liệu certificate.
3. Event Service gọi Rust Certificate Generator.
4. Rust sinh PDF và QR verify.
5. Event Service lưu certificate metadata vào database.
6. Volunteer tải/xem certificate trên UI.
```

## 5. Rule nghiệp vụ quan trọng

- Organizer chưa verified không được tạo event.
- Event mới tạo phải chờ admin duyệt.
- Volunteer chỉ đăng ký được event đã approved.
- Volunteer chưa KYC bị chặn nếu event yêu cầu KYC.
- Organizer chỉ được quản lý event của mình.
- Admin mới được duyệt/từ chối event.
- Nếu chưa đủ số volunteer tối thiểu, event vẫn có thể bắt đầu nhưng UI/backend nên cảnh báo organizer.
- Không cho đăng ký vượt quá số lượng tối đa.
- Chỉ registration đã confirmed mới được check-in.
- Không nên cho một volunteer check-in trùng nhiều lần nếu đã attended.

## 6. API/Controller liên quan

Folder chính:

- `BaseCore.APIService/Controllers/Events/`
- `BaseCore.Services/VolunteerHub/Events/`

Controller/API tiêu biểu:

- Event API.
- Registration API.
- Work shift API.
- Event category API.
- Certificate API.

Phụ thuộc dữ liệu:

- Identity: cần kiểm tra organizer verification và volunteer KYC.
- Finance: campaign/donation/sponsorship gắn với event.

## 7. Tiêu chí hoàn thành

- Organizer verified tạo event được.
- Organizer chưa verified bị chặn.
- Admin duyệt/từ chối event được.
- Event yêu cầu KYC chặn đúng volunteer chưa verified.
- Volunteer KYC verified đăng ký được.
- Organizer confirm/reject registration được.
- QR check-in hoạt động.
- Manual check-in hoạt động.
- Ghi nhận giờ tình nguyện đúng.
- Certificate có thể sinh sau khi volunteer hoàn thành event.
