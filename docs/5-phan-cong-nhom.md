# Phân công nhóm — VolunteerHub

## 1. Thành viên

| STT | Họ tên | Vai trò | GitHub | Phụ trách |
|---|---|---|---|---|
| 1 | Tống Văn Đông | Nhóm trưởng | taoladong | Sự kiện / Đăng ký / Điểm danh / Chứng chỉ |
| 2 | Phạm Tiến Dũng | Thành viên | dung | Xác thực / Hồ sơ / Xác minh / Phân quyền |
| 3 | Hồ Sỹ Vinh | Thành viên | vinh | Ủng hộ / Đóng góp / Tài trợ / Tài chính |

## 2. Phân công chi tiết

### Phạm Tiến Dũng — Xác thực / Hồ sơ / Xác minh

**Backend**:
- `BaseCore.AuthService/` — toàn bộ project
- `BaseCore.APIService/Controllers/Identity/` — ProfileController, OrganizerVerificationController
- `BaseCore.APIService/Controllers/Admin/` — MonitoringController, BadgesController, AdminController (phần user management, KYC, skill verification, organizer verification, create user)
- `BaseCore.APIService/Controllers/Shared/` — UploadsController, NotificationsController
- `BaseCore.Services/Authen/`

**Frontend**:
- `BaseCore.WebClient/src/pages/auth/` — Login, Register
- `BaseCore.WebClient/src/pages/volunteer/MyProfile.jsx`
- `BaseCore.WebClient/src/pages/volunteer/Passport.jsx`
- `BaseCore.WebClient/src/pages/volunteer/MyBadges.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminUsers.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminMonitoring.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminOrganizerVerifications.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminVolunteerVerifications.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminSkills.jsx`
- `BaseCore.WebClient/src/pages/organizer/OrganizerVerification.jsx`
- `BaseCore.WebClient/src/pages/Notifications.jsx`

**Chức năng phụ trách**:
- Đăng ký, đăng nhập, JWT, refresh token
- Hồ sơ volunteer, kỹ năng, xác minh kỹ năng
- KYC volunteer (gửi + admin duyệt, reject reason ≥10 chars)
- Xác minh tổ chức organizer (gửi + admin duyệt, reject reason ≥10 chars)
- Admin quản lý user (khóa/mở + cascade, tạo user mới)
- Admin quản lý danh sách kỹ năng
- Notifications (tất cả state changes), badges, monitoring, audit log
- Upload file
- IsActive middleware (AuthService)

---

### Tống Văn Đông — Sự kiện / Đăng ký / Điểm danh

**Backend**:
- `BaseCore.EventService/` — toàn bộ project (bao gồm SignalR hub)
- `BaseCore.ApiGateway/` — cấu hình Ocelot routing
- `BaseCore.APIService/Controllers/Events/` — EventsController, RegistrationsController, WorkShiftsController, CertificatesController, EventCategoriesController
- `BaseCore.APIService/Controllers/Shared/` — ChannelsController, RatingsController
- `BaseCore.APIService/Controllers/Admin/` — DashboardController
- `BaseCore.Services/VolunteerHub/Events/` — EventService, RegistrationService, CertificateService, BadgeService
- `BaseCore.Services/VolunteerHub/Engagement/` — NotificationService, ChannelService, IChannelRealtimeNotifier
- `BaseCore.Services/VolunteerHub/Admin/` — AuditLogService

**Frontend**:
- `BaseCore.WebClient/src/pages/public/` — LandingPage, EventList, EventDetail
- `BaseCore.WebClient/src/pages/organizer/` — MyEvents, EventForm, ManageEvent
- `BaseCore.WebClient/src/pages/volunteer/MyRegistrations.jsx`
- `BaseCore.WebClient/src/pages/volunteer/MyCertificates.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminEvents.jsx`
- `BaseCore.WebClient/src/pages/admin/AdminCategories.jsx` (event categories)
- `BaseCore.WebClient/src/pages/shared/Channel.jsx`

**Chức năng phụ trách**:
- Tạo/sửa/xóa/duyệt/từ chối/hủy/hoàn thành/mở lại sự kiện
- Gửi duyệt lại event bị reject, admin transfer (validate Verified), auto-complete, overdue preview
- Đăng ký, rút, xin hủy sau confirm, confirm, cancel
- Điểm danh QR/GPS (CheckInRadiusKm configurable), self check-in, walk-in, bổ sung điểm danh, chỉnh giờ
- Check-out (pro-rate hours), ValidateCheckInWindow
- QR code GUID-based + rotate endpoint
- Ca làm việc (CRUD)
- Danh mục sự kiện (CRUD)
- Chứng chỉ (cấp tự động, verify, PDF)
- Huy hiệu (trao tự động)
- Đánh giá hai chiều + moderation (ẩn/xóa, filter raterId/rateeId, delete Admin only)
- Kênh trao đổi (post, comment, like) + SignalR realtime
- Gợi ý sự kiện theo kỹ năng
- Tác động công khai (impact)
- Dashboard (admin inbox, volunteer recommended events)
- Gateway routing (ocelot.json)
- Export events (maxRows + CSV injection protection)
- Audit log ghi method/GPS/IP cho check-in

---

### Hồ Sỹ Vinh — Ủng hộ / Tài trợ / Tài chính

**Backend**:
- `BaseCore.FinanceService/` — toàn bộ project
- `BaseCore.APIService/Controllers/Finance/` — SupportCampaignController, SponsorshipProposalController, SponsorController, SponsorProfileController
- `BaseCore.APIService/Controllers/Admin/AdminController.cs` (phần finance: overview, stale-donations, unreported-campaigns, open-proposals-past-event, export finance)
- `BaseCore.APIService/Controllers/LegacySales/` (nếu giữ Product/Order)

**Frontend**:
- `BaseCore.WebClient/src/pages/volunteer/MyDonations.jsx`
- `BaseCore.WebClient/src/pages/sponsor/MySponsorships.jsx`
- `BaseCore.WebClient/src/pages/sponsor/SponsorProfile.jsx` (trang `/sponsor/profile`)
- `BaseCore.WebClient/src/pages/admin/AdminExport.jsx`
- Phần finance trong `EventDetail.jsx` (campaign, tiến độ, danh sách donor, sponsor public)
- Phần campaign/sponsorship trong `ManageEvent.jsx`
- Phần sponsor tracking trong `MySponsorships.jsx`

**Chức năng phụ trách**:
- SponsorProfile (xem, cập nhật, auto-create)
- Support campaign (tạo, sửa, mở, đóng, hủy, báo cáo sử dụng tiền, transition guard)
- Individual donation (gửi, confirm, reject, cancel, overspend guard, notify donor)
- Sponsorship proposal (offer, request, accept, reject, cancel, received với ActualReceivedAmount, report, admin revert, duplicate prevention, notify cả hai bên)
- Sponsor tracking (timeline, impact per sponsorship)
- EventSponsor legacy (tài trợ nhanh)
- Báo cáo tài chính công khai (impact endpoint phần finance)
- Admin: finance overview, stale-donations, unreported-campaigns, open-proposals-past-event
- Admin export finance (JSON/CSV, maxRows limit + CSV injection protection)

---

## 3. Phần dùng chung (cần báo nhóm trước khi sửa)

| File/Folder | Lý do |
|---|---|
| `BaseCore.Entities/` | Thêm entity mới ảnh hưởng migration |
| `BaseCore.Repository/MySqlDbContext.cs` | Thêm DbSet/config |
| `BaseCore.Repository/Migrations/` | Conflict nếu 2 người tạo migration cùng lúc |
| `BaseCore.WebClient/src/App.jsx` | Router, layout |
| `BaseCore.WebClient/src/services/api.js` | API contract frontend |
| `BaseCore.WebClient/src/components/layouts/` | Sidebar, header |
| `BaseCore.WebClient/src/pages/Dashboard.jsx` | Render theo role — cả 3 người có thể sửa phần mình |
| `BaseCore.sln` | Thêm project mới |
| `BaseCore.ApiGateway/ocelot.json` | Thêm route |

**Quy tắc**: Ai cần sửa file chung → nhắn nhóm trước → sửa → push ngay → người khác pull.

## 4. Quy trình làm việc

### Branch strategy
```
master (stable)
├── feature/events-dong                 (Tống Văn Đông làm)
├── feature/auth-verification-dung      (Phạm Tiến Dũng làm)
└── feature/finance-donation-vinh       (Hồ Sỹ Vinh làm)
```

### Thứ tự merge
1. Mỗi thành viên pull `master`, làm trên nhánh cá nhân và push nhánh của mình.
2. Tống Văn Đông review/xử lý conflict các PR liên quan luồng sự kiện và tích hợp chung.
3. Chỉ merge vào `master` khi phần việc đã build/test ổn và checklist Trello đã cập nhật.

### Trước khi push
```powershell
dotnet build BaseCore.sln        # Backend phải pass
cd BaseCore.WebClient && npm run build   # Frontend phải pass (nếu sửa UI)
```

### Quy ước commit
```
docs: cap nhat tai lieu phan tich
feat(events): them luong su kien dang ky diem danh
feat(auth): them luong dang nhap va xac minh
feat(finance): them luong ung ho va tai tro
fix(ui): sua loi build frontend
```

## 5. Lịch họp nhóm

- **Thời gian**: Mỗi tuần 1 lần (thống nhất ngày/giờ cố định)
- **Hình thức**: Online (Messenger/Zalo) hoặc trực tiếp
- **Output**: Biên bản theo mẫu, lưu vào `Thực tập nhóm/`
- **Nội dung**: Mỗi người báo cáo tiến độ → demo nhanh → thống nhất việc tuần sau

## 6. Công cụ

| Công cụ | Mục đích | Link |
|---|---|---|
| GitHub | Quản lý mã nguồn | https://github.com/taoladong/volunteerhub2026_TTN |
| Trello | Quản lý công việc | https://trello.com/b/q3SPEszi/b%E1%BA%A3ng-trello-c%E1%BB%A7a-toi |
| Google Drive | Lưu tài liệu, báo cáo | https://drive.google.com/drive/u/0/folders/1qnu4XJEBNgHDcGQzNKacwwpaZxygxAdZ |
| Messenger/Zalo | Giao tiếp hàng ngày | (link group) |
| Swagger | Test API | http://localhost:5002/swagger (Identity), http://localhost:5003/swagger (Event), http://localhost:5004/swagger (Finance) |
| Postman | Test API nâng cao | (optional) |

## Cập nhật phân công 2026-05-25

### Phạm Tiến Dũng - Xác thực / Hồ sơ / Xác minh
- Phụ trách thêm `BaseCore.WebClient/src/pages/admin/AdminBadges.jsx`.
- Phụ trách API badge trong `BadgesController`: `POST/PUT/DELETE /api/badges`.
- Phụ trách trạng thái `ChangesRequested` cho KYC volunteer và skill verification.
- Phụ trách UI `AdminVolunteerVerifications.jsx` với ba thao tác: duyệt, yêu cầu bổ sung, từ chối.

### Tống Văn Đông - Sự kiện / Đăng ký / Điểm danh
- Phụ trách `AdminEvents.jsx`: xem chi tiết, duyệt/từ chối, hủy, hoàn thành/mở lại, transfer organizer, xóa có điều kiện.
- Phụ trách rule xóa event: chỉ xóa khi chưa có registration, shift, channel, campaign, sponsor/proposal, certificate, rating.
- Tiếp tục phụ trách danh mục sự kiện và rating moderation.

### Hồ Sỹ Vinh - Ủng hộ / Tài trợ / Tài chính
- Phụ trách thêm `BaseCore.WebClient/src/pages/admin/AdminFinanceWatch.jsx`.
- Phụ trách các endpoint giám sát finance: stale donations, unreported campaigns, open proposals past event.
- Màn finance watch chỉ đọc và đối soát, không thêm action sửa/xóa trực tiếp dữ liệu tài chính.

### File dùng chung cần báo nhóm trước khi sửa
- `BaseCore.WebClient/src/App.jsx`: đã thêm route `/admin/badges`, `/admin/finance`.
- `BaseCore.WebClient/src/components/layouts/MainLayout.jsx`: đã thêm menu Huy hiệu và Giám sát tài chính cho Admin.
- `BaseCore.WebClient/src/services/api.js`: đã thêm API badge, request changes KYC/skill và finance watch.
