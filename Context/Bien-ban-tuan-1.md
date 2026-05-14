# Biên bản họp tuần 1 - VolunteerHub

## Thông tin

- Ngày: 14/05/2026
- Thành phần: Nhóm 3 người
- Chủ đề: Khởi động dự án VolunteerHub và phân tích yêu cầu

## Nội dung thống nhất

1. Thống nhất đề tài: Website VolunteerHub hỗ trợ kết nối hoạt động tình nguyện.
2. Thống nhất 4 vai trò chính: Volunteer, Organizer, Sponsor, Admin.
3. Thống nhất kiến trúc định hướng: .NET 8 microservice, React/Vite frontend, SQL Server, Ocelot API Gateway.
4. Phân chia phân hệ:
   - Thành viên 1: AuthService, Identity, Profile, KYC, organizer verification, admin identity.
   - Thành viên 2: EventService, event lifecycle, registration, attendance, certificate.
   - Thành viên 3: FinanceService, donation, sponsorship, financial report.
5. Thống nhất tuần 1 tập trung vào mô tả bài toán, actor, yêu cầu chức năng, yêu cầu phi chức năng và setup repo.

## Output tuần 1

- `Context/VolunteerHub-description.md`
- `Context/VolunteerHub-requirements-spec.md`
- `Context/Bien-ban-tuan-1.md`
- `README.md`
- `AuthService/README.md`

## Kết luận

Nhóm sẽ dùng các tài liệu tuần 1 làm cơ sở cho tuần 2: thiết kế kiến trúc, database, API contract và phân công chi tiết trước khi triển khai backend ở tuần 3.
