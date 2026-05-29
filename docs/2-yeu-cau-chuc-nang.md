# Yêu cầu chức năng — VolunteerHub

## 1. Danh sách yêu cầu chức năng (28 FR)

### FR-01. Đăng ký, đăng nhập và phân quyền người dùng
- Đăng ký tài khoản theo vai trò (Volunteer, Organizer, Sponsor).
- Đăng nhập bằng username + password, hệ thống cấp JWT access token + refresh token.
- Phân quyền API theo role. Người không đúng vai trò bị chặn (401/403).
- User bị khóa (IsActive = false) bị chặn 401 trên tất cả service (IsActive middleware).
- Admin có thể tạo user mới (Volunteer/Organizer/Sponsor).

### FR-02. Hiển thị trang công khai và khám phá sự kiện
- Guest và user đã đăng nhập xem được landing page, danh sách sự kiện `Approved`.
- Lọc/tìm kiếm theo từ khóa, danh mục, kỹ năng, vị trí, bán kính.
- Hỗ trợ chế độ danh sách và bản đồ.
- Chi tiết sự kiện hiển thị đầy đủ thông tin + nút chia sẻ/copy link.

### FR-03. Quản lý hồ sơ tình nguyện viên
- Volunteer tạo/cập nhật hồ sơ: kỹ năng, nhóm máu, ngôn ngữ, sở thích, bio, avatar.
- Chọn nhiều kỹ năng từ danh mục hệ thống.
- Gửi minh chứng kỹ năng (ảnh/link) để admin xác minh. Trạng thái: `SelfDeclared` → `PendingVerification` → `Verified` / `Rejected`.
- Admin từ chối kỹ năng phải kèm lý do ≥10 ký tự.

### FR-04. Xem hộ chiếu tình nguyện (Volunteer Passport)
- Xem lịch sử sự kiện đã tham gia.
- Tổng hợp giờ tình nguyện, chứng chỉ, huy hiệu.

### FR-05. Gửi và duyệt xác minh danh tính (KYC)
- Volunteer gửi ảnh CCCD (mặt trước, mặt sau) + ảnh chân dung.
- Admin duyệt/từ chối (lý do từ chối ≥10 ký tự). Trạng thái: `Unverified` → `PendingVerification` → `Verified` / `Rejected`.
- KYC không bắt buộc toàn hệ thống, chỉ bắt buộc khi event yêu cầu.
- Thông báo gửi cho volunteer khi KYC được duyệt hoặc từ chối.

### FR-06. Gửi và duyệt xác minh tổ chức (Organizer Verification)
- Organizer gửi thông tin pháp lý (tên tổ chức, đại diện, email, địa chỉ, mô tả, giấy tờ).
- Admin duyệt/từ chối (lý do từ chối ≥10 ký tự). Trạng thái: `Unverified` → `Pending` → `Verified` / `Rejected`.
- Organizer chỉ được tạo event khi `Verified`.
- Sửa thông tin sau khi verified → quay về `Pending`, không tạo event mới được cho tới khi duyệt lại.
- Thông báo gửi cho organizer khi xác minh được duyệt hoặc từ chối.

### FR-07. Tạo và sửa sự kiện
- Organizer (đã verified) tạo event: tên, mô tả, danh mục, kỹ năng yêu cầu, thời gian, địa điểm, tọa độ, số lượng min/max, ảnh, option KYC, `CheckInRadiusKm` (mặc định 0.5km).
- Event mới ở trạng thái `Pending`.
- Organizer sửa event của mình (chặn khi `Cancelled`/`Completed`).
- Khi sửa time/location trên event `Approved` → hệ thống tự notify volunteer đã confirm và sponsor active.

### FR-08. Duyệt và từ chối sự kiện
- Admin duyệt `Pending` → `Approved` (sinh QR code dạng GUID, tạo channel trao đổi).
- Admin từ chối `Pending` → `Rejected` (lý do ≥10 ký tự, lưu vào `RejectReason`).
- Organizer gửi duyệt lại event bị `Rejected` → `Pending`.

### FR-09. Hủy sự kiện và xử lý cascade
- Organizer hoặc Admin hủy event (trừ `Completed`) → `Cancelled` + lý do.
- Cascade: campaign `Open` → `Closed`, proposal `Pending`/`Accepted` → `Cancelled`.
- Notify volunteer đã `Confirmed` và sponsor có proposal active.
- Tiền đã `Confirmed`/`Received` giữ nguyên — xử lý ngoài hệ thống.

### FR-10. Đăng ký và rút đăng ký sự kiện
- Volunteer đăng ký event `Approved`, chọn ca nếu có.
- Kiểm tra: event còn chỗ, KYC nếu yêu cầu, shift thuộc event và còn chỗ.
- Trạng thái mới: `Pending`. Volunteer rút được khi còn `Pending`.
- Đăng ký lại được nếu bản cũ đã `Cancelled`.

### FR-11. Yêu cầu hủy đăng ký sau khi đã xác nhận
- Volunteer đã `Confirmed` có thể gửi yêu cầu hủy (kèm lý do).
- Organizer phê duyệt hủy → registration chuyển `Cancelled` (ghi `CancelledAt`), notify volunteer.

### FR-12. Xác nhận và hủy đăng ký bởi organizer
- Organizer xem danh sách đăng ký event mình (Admin cũng xem được).
- Organizer xác nhận (`Pending` → `Confirmed`) hoặc hủy registration.
- Kiểm tra `registrationId` thuộc đúng `eventId`.

### FR-12A. Lịch phỏng vấn trước khi xác nhận
- Organizer có thể tạo `InterviewSlot` cho event để hẹn phỏng vấn tình nguyện viên trước khi xác nhận.
- Volunteer xem được lịch hẹn và trạng thái lời mời phỏng vấn liên quan đến đăng ký của mình.
- `InterviewService` quản lý slot, lời mời, trạng thái tham gia và kết quả phỏng vấn.
- `InterviewCallController` hỗ trợ luồng mở cuộc gọi/phòng phỏng vấn theo slot.
- Kết quả phỏng vấn là căn cứ để organizer quyết định confirm hoặc hủy đăng ký.

### FR-13. Tạo và quản lý ca làm việc
- Organizer tạo ca: tên, thời gian bắt đầu/kết thúc, số lượng tối đa, kỹ năng yêu cầu (optional).
- Volunteer chọn ca khi đăng ký. Hệ thống kiểm shift thuộc event và còn chỗ.

### FR-14. Điểm danh volunteer tại sự kiện
- Organizer điểm danh volunteer đã `Confirmed` bằng QR hoặc GPS (bán kính `CheckInRadiusKm`, mặc định 0.5km, cấu hình per-event).
- Volunteer tự điểm danh bằng QR (self check-in) nếu đã `Confirmed`.
- Walk-in: organizer đăng ký + check-in tại chỗ cho volunteer có tài khoản.
- Bổ sung điểm danh: organizer có thể ghi nhận trong 7 ngày sau event.
- Chỉnh giờ tình nguyện: organizer điều chỉnh `VolunteerHours` cho từng volunteer.
- QR code dùng GUID (không deterministic), hỗ trợ xoay QR (`POST /api/events/{id}/qr/rotate`).
- ValidateCheckInWindow: shift ±15/30 phút, event ±30 phút/2 giờ.
- Audit log ghi nhận method (QR/GPS), tọa độ GPS, IP address.
- Thông báo gửi cho volunteer khi được check-in, walk-in, manual-attend.

### FR-14b. Check-out volunteer
- Organizer ghi nhận check-out cho volunteer đã check-in (`POST /api/events/{id}/registrations/{regId}/checkout`).
- Hệ thống tự tính `VolunteerHours` pro-rate dựa trên thời gian thực tế (từ `AttendedAt` đến `CheckedOutAt`).
- Nếu volunteer có shift, giờ được tính trong khoảng shift; nếu không, tính trong khoảng event.
- Thông báo gửi cho volunteer khi được check-out.

### FR-15. Hoàn thành và mở lại sự kiện
- Organizer hoặc Admin đánh dấu event `Approved` → `Completed`.
- Hệ thống tự cấp chứng chỉ cho volunteer đã điểm danh.
- Admin có thể rollback `Completed` → `Approved` (thu hồi chứng chỉ, notify organizer).
- Admin trigger auto-complete cho event quá hạn EndDate > 24 giờ.
- Admin xem overdue preview (danh sách event quá hạn chưa complete).

### FR-16. Cấp và xác thực chứng chỉ điện tử
- Tự động cấp khi event completed, cho volunteer đã `IsAttended = true`.
- Mỗi chứng chỉ có mã verify duy nhất.
- Endpoint tải PDF, hiển thị đúng tiếng Việt.
- Guest xác thực chứng chỉ qua mã verify.

### FR-17. Trao huy hiệu tự động theo điều kiện
- Trao tự động theo điều kiện: số sự kiện tham gia, số giờ tình nguyện.
- Volunteer xem huy hiệu đã nhận.

### FR-18. Đánh giá hai chiều sau sự kiện
- Sau event `Completed`: volunteer đã tham gia đánh giá organizer, organizer đánh giá volunteer đã tham gia.
- Điểm 1-5 + nhận xét. Mỗi cặp chỉ đánh giá 1 lần/event.
- Admin có thể ẩn/xóa đánh giá không phù hợp. Xóa chỉ Admin mới được.
- Admin lọc đánh giá theo `raterId`, `rateeId`, `eventId`, `hidden`.

### FR-19. Trao đổi trong kênh sự kiện
- Event được duyệt tự động có channel. Người có quyền xem bài viết, bình luận, tương tác.
- Kiểm tra quyền truy cập + quan hệ cha-con (channel → post → comment).
- SignalR realtime cho post/comment mới (EventService).

### FR-20. Tạo đợt kêu gọi và nhận ủng hộ cá nhân
- Organizer tạo đợt kêu gọi: tiêu đề, mô tả, mục tiêu tiền, thời gian, thông tin nhận tiền.
- Campaign lưu thông tin ngân hàng nhận tiền, nội dung chuyển khoản và dữ liệu hỗ trợ tạo VietQR.
- Trạng thái campaign: `Draft` → `Open` → `Closed` / `Cancelled` → `Reported`.
- Campaign status transition guard: chỉ cho phép chuyển theo thứ tự hợp lệ (Draft→Open→Closed only).
- Volunteer/User gửi khoản ủng hộ (số tiền, tên, ẩn danh, minh chứng).
- Organizer xác nhận/từ chối. Chỉ `Confirmed` mới tính vào tổng public.
- Public event hiển thị tổng tiền đã xác nhận, thống kê donor và danh sách donor theo quyền ẩn danh.
- Chặn `UsedAmount > ConfirmedAmount` khi báo cáo (trừ khi organizer giải trình).
- Thông báo gửi cho donor khi donation được confirm/reject.

### FR-21. Gửi và xử lý đề nghị tài trợ doanh nghiệp
- Hai chiều: Organizer mời sponsor (`OrganizerRequest`) hoặc Sponsor đề nghị (`SponsorOffer`).
- Trạng thái: `Pending` → `Accepted` → `Received` → `Reported` / `Cancelled`.
- `Accepted` = đồng ý nguyên tắc, chưa tính tiền.
- `Received` = organizer xác nhận đã nhận (nhập số tiền thực nhận `ActualReceivedAmount`).
- Sponsor không hủy được sau `Accepted`. Admin có thể rollback về `Pending`.
- Khi event bị hủy: proposal `Pending`/`Accepted` tự động `Cancelled`.
- Chống trùng: mỗi sponsor chỉ có 1 proposal active per event.
- Thông báo gửi cho cả hai bên khi proposal được accept/reject/received/report.

### FR-22. Hiển thị dashboard theo vai trò
- Mỗi vai trò có dashboard phù hợp sau đăng nhập.
- Volunteer: gợi ý sự kiện theo kỹ năng (recommended events), đăng ký gần đây, giờ tình nguyện, huy hiệu.
- Organizer: sự kiện của tôi, trạng thái đăng ký, insights.
- Sponsor: tài trợ của tôi, tác động.
- Admin: số liệu tổng quan, inbox (pending KYC, organizer verifications, skill verifications, stale donations, failed cert jobs).

### FR-23. Quản trị người dùng, danh mục và giám sát hệ thống
- Admin quản lý người dùng (tìm kiếm, khóa/mở — kèm impact summary khi khóa).
- Khóa organizer → tự động hủy event `Pending`/`Approved` của họ + cascade campaign/proposal.
- Admin tạo user mới (`POST /api/admin/users`).
- Admin quản lý danh mục sự kiện, kỹ năng (xóa skill tự cleanup JSON trong event).
- Admin export dữ liệu (JSON/CSV) với `maxRows` limit (tối đa 10.000) + CSV injection protection.
- Admin xem monitoring, audit log.
- Admin xem donation pending quá hạn, campaign chưa báo cáo, proposal kẹt.
- Admin chuyển quyền sở hữu event (transfer) — validate new organizer phải Verified + notify cả hai bên.

### FR-24. Gửi và nhận thông báo
- Hệ thống tự gửi thông báo khi:
  - Event: duyệt/từ chối/hủy, thay đổi time/location.
  - Registration: xác nhận, check-in, walk-in, manual-attend, adjust-hours, check-out.
  - KYC: approve/reject.
  - Organizer verification: approve/reject.
  - Donation: confirm/reject.
  - Proposal: accept/reject/received/report.
  - User: toggle-status (khóa/mở).
  - Event: uncomplete (notify organizer), transfer (notify cả hai bên).
- Người dùng xem danh sách thông báo (phân trang), đánh dấu đã đọc.
- Cơ chế pull (frontend gọi API định kỳ).

### FR-25. Gợi ý sự kiện phù hợp
- Hệ thống gợi ý event `Approved` có kỹ năng yêu cầu khớp với kỹ năng volunteer đã khai báo.
- Hiển thị trên dashboard volunteer (recommended events).

### FR-26. Hiển thị tác động công khai (Impact)
- Event đã `Completed` hiển thị public: số volunteer đăng ký, đã xác nhận, đã điểm danh, giờ tình nguyện, chứng chỉ đã cấp, tổng ủng hộ đã xác nhận, tổng tài trợ đã nhận, no-show count.
- Thông tin tài trợ chỉ hiển thị khoản đã `Confirmed`/`Received`.

### FR-27. Quản lý hồ sơ nhà tài trợ (SponsorProfile)
- Sponsor xem và cập nhật hồ sơ tổ chức: tên tổ chức, đại diện, email liên hệ, SĐT, website, logo, mô tả.
- Hồ sơ tự động tạo khi sponsor truy cập lần đầu.
- Trang `/sponsor/profile` cho phép sponsor quản lý thông tin.

### FR-28. Upload file và ảnh
- Người dùng upload ảnh (event cover, KYC, minh chứng kỹ năng, minh chứng donation).
- Hệ thống lưu file và trả URL.

## 2. Trạng thái nghiệp vụ

### Event status
```
Pending → Approved → Completed
    ↓         ↓
 Rejected   Cancelled
```

### Registration status
```
Pending → Confirmed → (IsAttended = true) → (CheckedOutAt)
    ↓         ↓
Cancelled  Cancelled (qua request-cancel)
```

### Support Campaign status
```
Draft → Open → Closed → Reported
              ↓
           Cancelled
```
> Transition guard: chỉ cho phép chuyển theo thứ tự hợp lệ (Draft→Open→Closed).

### Individual Donation status
```
PendingConfirmation → Confirmed
                    → Rejected
                    → Cancelled (user hủy khi còn pending)
```

### Sponsorship Proposal status
```
Pending → Accepted → Received → Reported
    ↓         ↓
 Rejected  Cancelled (khi event hủy)
    ↓
 Cancelled (bên tạo hủy)
```

## 3. Quy tắc nghiệp vụ chính

1. Chỉ event `Approved` mới mở đăng ký và tài trợ.
2. Chỉ organizer sở hữu hoặc admin mới xem/điều phối registration.
3. Volunteer chỉ rút đăng ký khi `Pending`. Sau `Confirmed` phải xin hủy qua organizer.
4. Check-in chỉ cho registration `Confirmed`, trong cửa sổ thời gian hợp lệ (ValidateCheckInWindow).
5. Check-out chỉ cho volunteer đã check-in, chưa check-out.
6. Complete chỉ khi event `Approved`.
7. Rating chỉ sau `Completed`, đúng cặp quan hệ tham gia/sở hữu. Xóa rating chỉ Admin.
8. Certificate chỉ cấp cho `IsAttended = true`.
9. Chỉ donation `Confirmed` / proposal `Received` mới tính vào tổng public.
10. Mọi giao dịch tiền đều ngoài hệ thống — chỉ ghi nhận khi organizer xác nhận đã nhận.
11. Không serialize password/salt trong response.
12. Channel/post/comment phải kiểm quan hệ cha-con.
13. Khi event hủy, tiền đã nhận giữ nguyên — organizer tự xử lý ngoài hệ thống.
14. Reject reason phải ≥10 ký tự (event reject, KYC reject, skill reject, proposal reject).
15. Mỗi sponsor chỉ có 1 proposal active per event (duplicate prevention).
16. Transfer event: new organizer phải Verified + active.
17. Khóa organizer → cascade hủy event active + campaign + proposal.
18. Campaign chỉ chuyển trạng thái theo thứ tự hợp lệ (Draft→Open→Closed).

## Cập nhật nghiệp vụ quản trị 2026-05-25

### FR-29. Quản lý huy hiệu bởi Admin
- Admin xem danh sách huy hiệu hiện có tại `/admin/badges`.
- Admin thêm/sửa huy hiệu gồm: tên, mô tả, icon URL, điều kiện `min_events` và/hoặc `min_hours`.
- Admin được xóa huy hiệu chỉ khi huy hiệu chưa từng được cấp cho user.
- Nếu huy hiệu đã được cấp, hệ thống chặn xóa để bảo toàn lịch sử; admin chỉ nên sửa tên/mô tả/icon trong phạm vi không làm sai ý nghĩa huy hiệu đã trao.
- Huy hiệu vẫn được cấp tự động khi volunteer đạt điều kiện qua tổng số sự kiện đã tham gia hoặc tổng giờ tình nguyện.

### FR-30. Giám sát tài chính bởi Admin
- Admin có màn `/admin/finance` để xem các khoản cần đối soát:
  - Donation `PendingConfirmation` quá số ngày cấu hình.
  - Campaign đã có tiền confirmed nhưng event đã kết thúc/hủy mà chưa `Reported`.
  - Sponsorship proposal còn `Pending`/`Accepted` sau khi event đã `Completed`/`Cancelled`.
- Màn giám sát tài chính chỉ đọc dữ liệu, hỗ trợ admin phát hiện và nhắc các bên liên quan.
- Admin không sửa/xóa trực tiếp donation, campaign hoặc proposal tại màn này; mọi thay đổi vẫn đi qua flow nghiệp vụ chính của organizer/sponsor/admin revert.

### Verification request changes
- KYC volunteer và skill verification có thêm trạng thái `ChangesRequested`.
- Admin có thể `approve`, `request changes`, hoặc `reject`.
- `request changes` và `reject` phải có lý do rõ ràng tối thiểu 10 ký tự.
- Volunteer có thể gửi lại minh chứng kỹ năng khi trạng thái là `SelfDeclared`, `Rejected` hoặc `ChangesRequested`.

### Quy tắc xóa cứng
- Event: chỉ xóa nếu chưa có registration, work shift, channel, campaign, sponsor/proposal, certificate, rating.
- User: chỉ xóa nếu chưa có dữ liệu nghiệp vụ liên quan.
- Badge: chỉ xóa nếu chưa cấp cho user.
- Rating: admin được xóa nếu vi phạm; thông thường ưu tiên ẩn/hiện.
- Audit log, monitoring, export: không sửa/xóa qua UI demo.
## Cập nhật nghiệp vụ lõi 2026-05-25

### Đăng ký sự kiện
- Volunteer chỉ đăng ký event `Approved`, chưa bắt đầu, chưa kết thúc và chưa full capacity.
- Event yêu cầu KYC thì volunteer phải có KYC `Verified`.
- Nếu event không chia ca, registration không có `ShiftId`.
- Nếu event đã chia ca, registration bắt buộc có `ShiftId` hợp lệ thuộc event và ca chưa đầy.
- Volunteer rút trực tiếp chỉ khi registration còn `Pending`; sau `Confirmed` phải gửi yêu cầu hủy để organizer xử lý.

### Ca làm việc
- Ca làm việc là tùy chọn nâng cao, không nằm trong flow tạo event mặc định.
- Organizer chỉ được bật/tạo ca khi event chưa có registration nào.
- Sau khi event có ca, mọi đăng ký mới phải chọn ca.
- Ca phải nằm trong khoảng thời gian event; không được tạo ca ngoài `StartDate`/`EndDate`.
- Xóa ca chỉ được phép khi ca chưa có registration; nếu đã có registration thì phải giữ lịch sử.

### Điểm danh và tính giờ
- Check-in chỉ cho registration `Confirmed` và event `Approved`.
- Nếu registration có ca, cửa sổ check-in theo ca; nếu không có ca, cửa sổ check-in theo event.
- QR là phương thức chính khi event có QR; GPS chỉ là fallback khi event không có QR.
- Check-in không cộng giờ ngay; giờ tình nguyện được tính khi check-out hoặc khi organizer điều chỉnh/bổ sung điểm danh hợp lệ.
- Check-out tính giờ thực tế từ `AttendedAt` đến `CheckedOutAt`, không vượt quá khung event/shift.
- Manual attend chỉ thực hiện sau khi event kết thúc và trong cửa sổ bổ sung cho phép.

### Hoàn thành event
- Organizer/admin được hoàn thành event `Approved` kể cả khi còn registration `Pending`.
- Hệ thống phải cảnh báo số registration chưa xử lý trước khi hoàn thành.
- Khi vẫn quyết tâm hoàn thành, các registration chưa xử lý không được tính tham gia, không cộng giờ và không cấp chứng chỉ.
- Không dùng số người tối thiểu như điều kiện cứng; chỉ dùng cảnh báo/ngữ cảnh vận hành nếu cần.

### Ủng hộ cá nhân
- Organizer có thể tạo support campaign sau khi event được duyệt và chưa kết thúc/hủy.
- Campaign đi theo state machine `Draft -> Open -> Closed -> Reported`, có nhánh `Cancelled`.
- Volunteer gửi donation vào campaign `Open`; số tiền phải lớn hơn 0 và không vượt giới hạn cấu hình.
- Màn ủng hộ hiển thị thông tin ngân hàng/VietQR để donor chuyển khoản đúng nội dung.
- Donation chỉ cộng vào tổng public khi `Confirmed`.
- Thống kê donor gồm tổng số donor, tổng tiền confirmed và badge dựa trên mức đóng góp.
- Donation ẩn danh không hiển thị thông tin liên hệ trên public; organizer chỉ dùng thông tin xác nhận trong phạm vi cần thiết.
- Event không có campaign hoặc campaign không có donation vẫn hoàn thành bình thường.

### Tài trợ doanh nghiệp
- Sponsorship proposal là luồng chính thức cho sponsor doanh nghiệp.
- Organizer có thể mời sponsor; sponsor cũng có thể đề nghị tài trợ event.
- Mỗi sponsor chỉ có một proposal active cho một event tại một thời điểm.
- Chỉ proposal `Received` mới tính vào tổng tài trợ đã nhận.
- Proposal đã `Received`/`Reported` không xóa cứng; mọi điều chỉnh phải có lý do/audit.
