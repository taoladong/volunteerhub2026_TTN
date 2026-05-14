# VolunteerHub - Requirements Spec

## Tổng quan

Tài liệu này là output tuần 1 cho yêu cầu chức năng và phi chức năng. AuthService phụ trách các yêu cầu Identity/Profile/KYC từ FR-01 đến FR-10. Các yêu cầu còn lại dùng để nhóm chốt phạm vi tích hợp với EventService, FinanceService và frontend ở các tuần sau.

## Functional Requirements

### Identity / Profile / KYC - AuthService

- FR-01: Người dùng có thể đăng ký tài khoản bằng email, mật khẩu, họ tên và vai trò phù hợp.
- FR-02: Người dùng có thể đăng nhập và nhận JWT access token cùng refresh token.
- FR-03: Hệ thống phân quyền theo role Volunteer, Organizer, Sponsor và Admin.
- FR-04: Người dùng có thể xem thông tin tài khoản hiện tại và trạng thái active/locked.
- FR-05: Volunteer có thể tạo, xem và cập nhật hồ sơ cá nhân gồm số điện thoại, ngày sinh, giới tính, địa chỉ, bio và avatar.
- FR-06: Volunteer có thể khai báo kỹ năng, số năm kinh nghiệm và mô tả liên quan.
- FR-07: Volunteer có thể gửi hồ sơ KYC để xác minh danh tính.
- FR-08: Admin có thể duyệt, từ chối hoặc yêu cầu bổ sung hồ sơ KYC của volunteer.
- FR-09: Organizer có thể gửi thông tin xác minh pháp lý trước khi tạo sự kiện.
- FR-10: Admin có thể duyệt, từ chối hoặc yêu cầu bổ sung hồ sơ xác minh organizer; admin cũng có thể khóa hoặc mở khóa tài khoản khi cần.

### Event / Registration / Attendance

- FR-11: Organizer đã verified có thể tạo và cập nhật sự kiện tình nguyện.
- FR-12: Event có thể cấu hình địa điểm, thời gian, số lượng volunteer và yêu cầu KYC.
- FR-13: Admin có thể duyệt hoặc từ chối event.
- FR-14: Volunteer có thể xem danh sách event và chi tiết event public.
- FR-15: Volunteer có thể đăng ký hoặc rút đăng ký khỏi event.
- FR-16: Hệ thống chặn volunteer chưa KYC khi event yêu cầu KYC verified.
- FR-17: Organizer có thể confirm/reject volunteer registration.
- FR-18: Organizer có thể điểm danh QR hoặc điểm danh thủ công và hệ thống tính giờ tham gia.
- FR-19: Hệ thống có thể phát hành certificate sau khi volunteer hoàn thành event.

### Finance / Sponsorship

- FR-20: Organizer có thể tạo campaign kêu gọi ủng hộ cho event.
- FR-21: Volunteer có thể gửi donation vào campaign đang mở.
- FR-22: Sponsor có thể gửi sponsorship proposal cho event và organizer có thể accept/reject/mark received.
- FR-23: Admin hoặc organizer có thể xem/export dữ liệu tài chính, donation, sponsorship và report minh bạch.

## Non-Functional Requirements

- NFR-01: Backend sử dụng .NET 8, Entity Framework Core và SQL Server.
- NFR-02: Các service trao đổi dữ liệu qua HTTP REST API và đi qua API Gateway khi frontend gọi.
- NFR-03: API trả lỗi rõ ràng bằng status code và message có thể hiển thị ở frontend.
- NFR-04: JWT và role phải dùng nhất quán giữa AuthService, EventService và FinanceService.
- NFR-05: Dữ liệu nhạy cảm như mật khẩu phải lưu dạng hash, không lưu plain text.
- NFR-06: Các thao tác admin nhạy cảm cần có khả năng audit ở giai đoạn mở rộng.
- NFR-07: Code backend phải build được trước khi merge.
- NFR-08: Mỗi phân hệ phải có README hoặc tài liệu API contract trước khi triển khai sâu.
- NFR-09: Không thay đổi schema hoặc migration chung khi chưa thống nhất nhóm.
- NFR-10: Hệ thống ưu tiên demo end-to-end ổn định hơn số lượng feature quá lớn.

## AuthService Acceptance Criteria Tuần 1

- Có mô tả rõ phạm vi Identity/Profile/KYC và actor liên quan.
- Có danh sách FR/NFR, trong đó FR-01 đến FR-10 thuộc trách nhiệm AuthService.
- Có README AuthService để thành viên phụ trách biết tuần sau cần thiết kế API, entity và flow nào.
- Project AuthService build được ở mức skeleton hiện tại.
