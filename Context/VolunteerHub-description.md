# Website Volunteer Hub (Cổng sự kiện tình nguyện)

## 1. Bối cảnh (Context)

Hiện nay, các hoạt động tình nguyện thường được tổ chức rời rạc qua mạng xã hội, dẫn đến việc khó kiểm chứng uy tín tổ chức và khó khăn trong việc tập hợp đúng tình nguyện viên có kỹ năng phù hợp. Tình nguyện viên cũng thiếu một hệ thống ghi nhận quá trình đóng góp (Certificate/Portfolio) một cách chính thống.

Hệ thống Volunteer Hub được xây dựng nhằm tạo ra một hệ sinh thái minh bạch, kết nối các Tổ chức phi chính phủ (NGO), câu lạc bộ và cá nhân có lòng hảo tâm một cách khoa học và hiệu quả.

## 2. Tầm nhìn và mục tiêu (Vision & Objectives)

- Tầm nhìn: Trở thành mạng lưới tình nguyện lớn nhất, nơi mọi kỹ năng đều được trao đi đúng chỗ và mọi đóng góp đều được trân trọng.
- Mục tiêu:
  - Tối ưu điều phối: Kết nối đúng người, đúng việc dựa trên kỹ năng và vị trí địa lý.
  - Xác thực uy tín: Xây dựng hệ thống đánh giá (Rating) hai chiều giữa Tổ chức và Tình nguyện viên.
  - Số hóa đóng góp: Tự động cấp giấy chứng nhận điện tử và ghi nhận "Giờ tình nguyện" cho hồ sơ cá nhân.

## 3. Các đối tượng người dùng (Actors)

1. Tình nguyện viên (Volunteer): Tìm kiếm sự kiện, đăng ký tham gia, cập nhật kỹ năng cá nhân và tích lũy giờ tình nguyện.
2. Tổ chức/Nhà sáng lập (Organizer): Đăng tải sự kiện, quản lý danh sách duyệt tình nguyện viên, điểm danh và đánh giá thành viên.
3. Nhà tài trợ (Sponsor): Theo dõi tiến độ dự án và đóng góp nguồn lực (tài chính, nhu yếu phẩm) cho các sự kiện cụ thể.
4. Quản trị viên hệ thống (Admin): Kiểm duyệt tính pháp lý của tổ chức, quản lý danh mục kỹ thuật, xử lý khiếu nại và báo cáo tác động xã hội.

## 4. Yêu cầu chức năng (Functional Requirements)

### 4.1. Phân hệ quản lý hồ sơ tình nguyện (Portfolio)

- Hồ sơ kỹ năng: Lưu trữ thông tin về chuyên môn (Y tế, Giáo dục, CNTT...), nhóm máu, ngôn ngữ và sở thích.
- Hộ chiếu tình nguyện (Volunteer Passport): Ghi lại lịch sử các dự án đã tham gia và tổng số giờ đóng góp.

### 4.2. Phân hệ quản lý sự kiện (Event Management)

- Đăng tin tuyển dụng: Mô tả công việc, yêu cầu kỹ năng, thời gian, địa điểm và số lượng cần tuyển.
- Quy trình phê duyệt: Tổ chức có quyền xem hồ sơ và phỏng vấn trực tuyến trước khi chấp nhận tình nguyện viên vào dự án.
- Bản đồ tình nguyện: Hiển thị các sự kiện đang diễn ra xung quanh vị trí người dùng.

### 4.3. Phân hệ điều phối và điểm danh (Operations)

- Điểm danh thông minh: Sử dụng mã QR hoặc định vị GPS để xác nhận tình nguyện viên có mặt tại địa điểm sự kiện.
- Quản lý ca làm việc: Phân bổ tình nguyện viên theo các khung giờ hoặc vị trí công việc khác nhau (Hậu cần, Truyền thông...).

### 4.4. Phân hệ khen thưởng và chứng nhận

- Cấp chứng chỉ điện tử: Tự động tạo file PDF chứng nhận có mã QR định danh sau khi sự kiện kết thúc.
- Hệ thống Badge (Huy hiệu): Trao tặng huy hiệu ảo (Chiến sĩ xanh, Đại sứ nhân ái...) dựa trên mức độ tích cực.

## 5. Yêu cầu phi chức năng (Non-functional Requirements)

- Tính minh bạch (Transparency): Mọi thông tin về tổ chức và kết quả dự án phải được hiển thị công khai để tránh gian lận.
- Tính bảo mật (Security): Bảo vệ thông tin cá nhân và dữ liệu liên lạc của tình nguyện viên.
- Hiệu năng (Performance): Xử lý tốt lượng truy cập lớn khi có các chiến dịch khẩn cấp (Cứu trợ thiên tai).
- Tính khả dụng (Usability): Giao diện cần đơn giản, hỗ trợ tốt trên Mobile để tình nguyện viên thao tác "tại trận".
- Tính kết nối: Có khả năng chia sẻ thông tin sự kiện nhanh chóng lên các mạng xã hội.
