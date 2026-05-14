# VolunteerHub - Mô tả bài toán

## Bối cảnh

VolunteerHub là website hỗ trợ kết nối hoạt động tình nguyện giữa người tham gia, đơn vị tổ chức, nhà tài trợ và quản trị viên. Hệ thống giúp công khai thông tin sự kiện, quản lý đăng ký, xác minh hồ sơ, ghi nhận đóng góp và tạo dữ liệu phục vụ báo cáo/demo môn học.

## Tầm nhìn

VolunteerHub hướng tới một nền tảng đơn giản, minh bạch và có thể mở rộng theo microservice. Mỗi phân hệ có trách nhiệm rõ ràng để nhóm 3 người có thể chia việc độc lập nhưng vẫn tích hợp được qua API Gateway và JWT/role thống nhất.

## Mục tiêu tuần 1

- Chốt bài toán, phạm vi và actor chính.
- Chốt yêu cầu chức năng và phi chức năng ở mức phân tích.
- Chốt phạm vi AuthService: Identity, Profile, KYC, organizer verification và admin identity.
- Chuẩn bị tài liệu để các tuần sau thiết kế API, database và triển khai backend.

## Actor

### Volunteer

Người tham gia hoạt động tình nguyện. Volunteer có thể đăng ký tài khoản, cập nhật hồ sơ cá nhân, khai báo kỹ năng, gửi KYC, xem sự kiện, đăng ký tham gia, điểm danh và nhận certificate.

### Organizer

Đơn vị hoặc cá nhân tổ chức sự kiện. Organizer cần đăng ký tài khoản, gửi hồ sơ xác minh pháp lý, được admin duyệt trước khi tạo và quản lý sự kiện.

### Sponsor

Cá nhân hoặc doanh nghiệp tài trợ. Sponsor có thể đăng ký tài khoản, gửi đề nghị tài trợ, theo dõi trạng thái tài trợ và xem báo cáo minh bạch liên quan.

### Admin

Người quản trị hệ thống. Admin duyệt KYC, duyệt organizer, quản lý user, duyệt sự kiện, theo dõi dữ liệu tài chính và hỗ trợ kiểm tra hệ thống.

## Phạm vi hệ thống

- AuthService: đăng ký, đăng nhập, JWT/refresh token, role, user status, volunteer profile, volunteer skill, volunteer KYC, organizer verification, admin review identity.
- EventService: event lifecycle, registration, attendance, certificate, organizer insight.
- FinanceService: support campaign, donation, sponsorship proposal, financial report.
- ApiGateway: routing thống nhất cho frontend và các service.
- Frontend React/Vite: màn hình public, auth, volunteer, organizer, sponsor và admin.

## Ngoài phạm vi tuần 1

- Chưa triển khai API nghiệp vụ hoàn chỉnh.
- Chưa tạo migration chính thức cho toàn hệ thống.
- Chưa hoàn thiện frontend.
- Chưa tích hợp module Rust/Ruby phụ trợ.
