# Kịch bản test nghiệp vụ — VolunteerHub

Tài liệu này liệt kê các kịch bản test thủ công (manual) bao gồm cả **happy path** và **tình huống bất thường/edge case** mà người test cần kiểm tra trên giao diện.

> **Tài khoản demo:** admin/admin123, organizer/organizer123, volunteer/volunteer123, sponsor/sponsor123
> **URL:** http://localhost:3000

---

## 1. Đăng ký & Đăng nhập (FR-01)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 1.1 | Đăng ký tài khoản mới (Volunteer) | Thành công, redirect về login |
| 1.2 | Đăng nhập đúng username/password | Vào dashboard đúng role |
| 1.3 | Đăng nhập bằng email thay username | Cũng thành công |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 1.4 | Đăng ký trùng username | Báo lỗi "username đã tồn tại" |
| 1.5 | Đăng ký trùng email | Báo lỗi |
| 1.6 | Đăng nhập sai mật khẩu 8 lần liên tiếp | Bị rate-limit 429 "Too many requests" |
| 1.7 | Đăng nhập user bị khóa (IsActive=false) | Báo lỗi 401, không vào được |
| 1.8 | Truy cập /admin/users bằng tài khoản volunteer | Bị redirect về dashboard (403) |
| 1.9 | Token hết hạn → gọi API | Tự refresh token hoặc redirect login |
| 1.10 | Sửa localStorage token thành giá trị bậy → reload | Bị đẩy về login |

---

## 2. Xác minh tổ chức (FR-06)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 2.1 | Organizer vào /organizer/verification, điền đầy đủ thông tin, gửi | Status chuyển Pending |
| 2.2 | Admin vào /admin/organizer-verifications, duyệt | Status → Verified, organizer nhận thông báo |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 2.3 | Admin từ chối nhưng lý do < 10 ký tự | Báo lỗi validation |
| 2.4 | Organizer chưa verified → tạo event | Bị chặn, hiện thông báo "Cần xác minh tổ chức" |
| 2.5 | Organizer đã verified → sửa thông tin xác minh | Status quay về Pending, không tạo event mới được |
| 2.6 | Admin duyệt organizer đã Verified (double approve) | Không lỗi, giữ nguyên |

---

## 3. Tạo & Duyệt sự kiện (FR-07, FR-08)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 3.1 | Organizer (verified) tạo event đầy đủ thông tin | Event status = Pending |
| 3.2 | Admin duyệt event | Status → Approved, QR code sinh, channel tạo |
| 3.3 | Organizer sửa event Approved (đổi thời gian) | Lưu thành công, volunteer đã confirm nhận thông báo |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 3.4 | Tạo event EndDate < StartDate | Báo lỗi validation |
| 3.5 | Tạo event MinParticipants > MaxParticipants | Báo lỗi |
| 3.6 | Tạo event StartDate trong quá khứ | Báo lỗi hoặc cảnh báo |
| 3.7 | Admin từ chối event, lý do < 10 ký tự | Báo lỗi |
| 3.8 | Organizer gửi duyệt lại event bị Rejected | Status → Pending |
| 3.9 | Volunteer cố approve event (sửa API call) | 403 Forbidden |
| 3.10 | Sửa event đã Cancelled | Bị chặn |
| 3.11 | Tạo event khi organizer chưa verified | Bị chặn |

---

## 4. Đăng ký sự kiện (FR-10, FR-11, FR-12)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 4.1 | Volunteer đăng ký event Approved | Registration status = Pending |
| 4.2 | Organizer xác nhận đăng ký | Status → Confirmed, volunteer nhận thông báo |
| 4.3 | Volunteer rút đăng ký khi còn Pending | Thành công |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 4.4 | Đăng ký event đã hết chỗ (MaxParticipants) | Báo lỗi "Hết chỗ" |
| 4.5 | Đăng ký event yêu cầu KYC nhưng volunteer chưa KYC | Báo lỗi "Cần xác minh danh tính" |
| 4.6 | Đăng ký lại event đã rút trước đó | Thành công (tạo registration mới) |
| 4.7 | Đăng ký 2 lần cùng event | Báo lỗi "Đã đăng ký" |
| 4.8 | Rút đăng ký khi đã Confirmed | Không được rút trực tiếp, phải gửi yêu cầu hủy |
| 4.9 | Volunteer gửi yêu cầu hủy (đã Confirmed) | Organizer nhận request, phê duyệt → Cancelled |
| 4.10 | Organizer hủy registration | Status → Cancelled, volunteer nhận thông báo |
| 4.11 | Đăng ký event Pending (chưa duyệt) | Bị chặn |
| 4.12 | Đăng ký event đang diễn ra (StartDate đã qua) | Bị chặn |

---

## 5. Ca làm việc (FR-13)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 5.1 | Organizer tạo ca cho event | Thành công, sub-channel tạo |
| 5.2 | Volunteer đăng ký chọn ca | Registration gắn shiftId |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 5.3 | Tạo ca EndTime < StartTime | Báo lỗi |
| 5.4 | Tạo ca ngoài khoảng thời gian event | Báo lỗi |
| 5.5 | Đăng ký ca đã hết chỗ | Báo lỗi |
| 5.6 | Tạo ca cho event Pending (chưa approve) | Thành công (parent channel tự tạo) |
| 5.7 | Xóa ca đã có người đăng ký | Cần xử lý: chặn hoặc cảnh báo |

---

## 6. Điểm danh & Check-out (FR-14, FR-14b)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 6.1 | Organizer quét QR volunteer đã Confirmed | Check-in thành công, volunteer nhận thông báo |
| 6.2 | Volunteer tự check-in bằng QR (self check-in) | Thành công |
| 6.3 | Organizer check-out volunteer | VolunteerHours tự tính, volunteer nhận thông báo |
| 6.4 | Walk-in: organizer đăng ký + check-in tại chỗ | Registration tạo + check-in luôn |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 6.5 | Check-in volunteer chưa Confirmed (còn Pending) | Bị chặn |
| 6.6 | Check-in ngoài cửa sổ thời gian (event chưa bắt đầu) | Bị chặn |
| 6.7 | Check-in ngoài bán kính GPS (>CheckInRadiusKm) | Bị chặn (nếu dùng GPS) |
| 6.8 | Check-in 2 lần cùng volunteer | Bị chặn "Đã điểm danh" |
| 6.9 | Check-out volunteer chưa check-in | Bị chặn |
| 6.10 | Check-out 2 lần | Bị chặn |
| 6.11 | Organizer xoay QR code → volunteer dùng QR cũ | Bị chặn "QR không hợp lệ" |
| 6.12 | Bổ sung điểm danh sau 7 ngày | Bị chặn |
| 6.13 | Organizer chỉnh VolunteerHours thành số âm | Bị chặn |

---

## 7. Hoàn thành sự kiện & Chứng chỉ (FR-15, FR-16)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 7.1 | Organizer đánh dấu Complete | Event → Completed, chứng chỉ tự cấp cho volunteer đã check-in |
| 7.2 | Volunteer xem chứng chỉ ở /my-certificates | Hiển thị đúng, tải PDF được |
| 7.3 | Guest xác thực chứng chỉ qua mã verify | Hiển thị thông tin hợp lệ |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 7.4 | Complete event chưa có ai check-in | Thành công nhưng không cấp chứng chỉ nào |
| 7.5 | Complete event chưa đủ MinParticipants | Báo lỗi hoặc cảnh báo |
| 7.6 | Admin mở lại event (Uncomplete) | Status → Approved, chứng chỉ bị thu hồi |
| 7.7 | Xác thực chứng chỉ với mã sai | Hiển thị "Không tìm thấy" |
| 7.8 | Volunteer chưa check-in nhưng đã Confirmed → Complete | Không được cấp chứng chỉ |

---

## 8. Hủy sự kiện & Cascade (FR-09)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 8.1 | Organizer hủy event Approved (có lý do) | Status → Cancelled |
| 8.2 | Volunteer đã Confirmed nhận thông báo hủy | Có notification |
| 8.3 | Campaign Open tự chuyển Closed | Kiểm tra campaign status |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 8.4 | Hủy event đã Completed | Bị chặn |
| 8.5 | Hủy event không có lý do | Thành công (lý do optional) hoặc bắt buộc tùy rule |
| 8.6 | Volunteer cố hủy event (không phải organizer) | 403 |
| 8.7 | Sau khi hủy, event biến mất khỏi trang public | Đúng, không hiện nữa |
| 8.8 | Sponsor có proposal Accepted → event hủy | Proposal → Cancelled, sponsor nhận thông báo |

---

## 9. Kêu gọi ủng hộ & Donation (FR-20)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 9.1 | Organizer tạo campaign (Draft) → mở (Open) | Status chuyển đúng |
| 9.2 | Volunteer donate 50.000đ | Donation status = PendingConfirmation |
| 9.3 | Organizer xác nhận donation | Status → Confirmed, tổng public cập nhật |
| 9.4 | Organizer đóng campaign → báo cáo | Status → Closed → Reported |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 9.5 | Donate vào campaign Draft (chưa Open) | Bị chặn "Campaign is not open" |
| 9.6 | Donate vào campaign Closed | Bị chặn |
| 9.7 | Donate số tiền = 0 hoặc âm | Bị chặn |
| 9.8 | Donate ẩn danh → organizer xem list | Không thấy phone/email donor |
| 9.9 | Volunteer hủy donation khi còn PendingConfirmation | Thành công |
| 9.10 | Volunteer hủy donation đã Confirmed | Bị chặn |
| 9.11 | Organizer từ chối donation | Status → Rejected, donor nhận thông báo |
| 9.12 | Mở campaign từ Closed (đã đóng) | Bị chặn (chỉ Draft→Open→Closed) |
| 9.13 | Báo cáo UsedAmount > ConfirmedAmount | Bị chặn hoặc yêu cầu giải trình |

---

## 10. Tài trợ doanh nghiệp (FR-21)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 10.1 | Organizer mời sponsor (OrganizerRequest) | Proposal status = Pending |
| 10.2 | Sponsor chấp nhận | Status → Accepted |
| 10.3 | Organizer xác nhận đã nhận tiền (Received) | Nhập ActualReceivedAmount |
| 10.4 | Organizer báo cáo sử dụng (Report) | Status → Reported |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 10.5 | Sponsor đề nghị tài trợ event đã có proposal active | Bị chặn "Đã có đề nghị" |
| 10.6 | Sponsor hủy proposal sau khi Accepted | Bị chặn |
| 10.7 | Organizer reject proposal, lý do < 10 ký tự | Bị chặn |
| 10.8 | Event hủy → proposal Pending/Accepted tự Cancelled | Kiểm tra status |
| 10.9 | Admin rollback proposal về Pending | Thành công |
| 10.10 | Sponsor offer vào event Pending (chưa Approved) | Bị chặn |

---

## 11. Đánh giá hai chiều (FR-18)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 11.1 | Volunteer đánh giá organizer sau event Completed | Thành công (1-5 sao + nhận xét) |
| 11.2 | Organizer đánh giá volunteer đã tham gia | Thành công |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 11.3 | Đánh giá event chưa Completed | Bị chặn |
| 11.4 | Đánh giá 2 lần cùng cặp/event | Bị chặn "Đã đánh giá" |
| 11.5 | Volunteer đánh giá organizer event mình không tham gia | Bị chặn |
| 11.6 | Volunteer tự xóa đánh giá | Bị chặn (chỉ Admin xóa) |
| 11.7 | Admin ẩn đánh giá không phù hợp | Thành công, không hiện public |
| 11.8 | Điểm ngoài 1-5 (0 hoặc 6) | Bị chặn |

---

## 12. Thông báo & Realtime (FR-19, FR-24)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 12.1 | Event được duyệt → organizer nhận thông báo | Có notification mới |
| 12.2 | Volunteer được check-in → nhận thông báo | Có notification |
| 12.3 | Chat trong channel event → tin nhắn hiện realtime | SignalR push |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 12.4 | Thời gian hiển thị "X phút trước" đúng timezone | Không hiện "7 giờ trước" khi vừa gửi |
| 12.5 | Volunteer không thuộc event → truy cập channel | Bị chặn |
| 12.6 | Gửi tin nhắn rỗng | Bị chặn |
| 12.7 | Mất kết nối SignalR → reconnect | Tự reconnect, không mất tin |

---

## 13. Admin quản trị (FR-23)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 13.1 | Admin khóa user | User bị 401 mọi API |
| 13.2 | Admin mở khóa user | User hoạt động bình thường |
| 13.3 | Admin tạo user mới | Thành công |
| 13.4 | Admin export events CSV | Tải file CSV đúng |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 13.5 | Khóa organizer có event Approved | Event tự hủy, campaign/proposal cascade |
| 13.6 | Admin transfer event cho organizer chưa Verified | Bị chặn |
| 13.7 | Admin transfer event cho organizer bị khóa | Bị chặn |
| 13.8 | Admin xóa skill đang được event sử dụng | Skill bị xóa khỏi JSON event |
| 13.9 | Export > 10.000 rows | Bị giới hạn maxRows |
| 13.10 | Admin auto-complete event chưa quá hạn 24h | Không complete |

---

## 14. Hồ sơ & KYC (FR-03, FR-05)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 14.1 | Volunteer cập nhật profile (kỹ năng, bio, avatar) | Lưu thành công |
| 14.2 | Volunteer gửi KYC (ảnh CCCD + chân dung) | Status → PendingVerification |
| 14.3 | Admin duyệt KYC | Status → Verified, volunteer nhận thông báo |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 14.4 | Admin từ chối KYC, lý do < 10 ký tự | Bị chặn |
| 14.5 | Volunteer gửi KYC lần 2 khi đang Pending | Bị chặn hoặc ghi đè |
| 14.6 | Xem profile người khác → không thấy ảnh CCCD | Đúng, KYC không leak |
| 14.7 | Volunteer gửi minh chứng kỹ năng → admin duyệt | Skill → Verified |

---

## 15. Bản đồ & Filter (FR-02)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 15.1 | Chọn bán kính 5km → hiện event trong 5km | Số event trên bản đồ = số trong list |
| 15.2 | Chọn kỹ năng "Không yêu cầu kỹ năng" | Hiện event không yêu cầu skill |
| 15.3 | Tìm kiếm keyword | Kết quả đúng |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 15.4 | Chọn 10km rồi đổi 5km | Số marker trên bản đồ = số event trong list (không lệch) |
| 15.5 | Tìm keyword không tồn tại | Hiện "Không tìm thấy sự kiện" |
| 15.6 | Không cho phép GPS → bản đồ vẫn hiện | Hiện vị trí mặc định, không crash |

---

## 16. Sponsor Profile (FR-27)

### Happy path
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 16.1 | Sponsor vào /sponsor/profile lần đầu | Profile tự tạo, form trống |
| 16.2 | Sponsor cập nhật thông tin | Lưu thành công |

### Tình huống bất thường
| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 16.3 | Volunteer truy cập /sponsor/profile | Bị redirect (không phải Sponsor) |
| 16.4 | Sponsor để trống tên tổ chức → lưu | Bị chặn validation |

---

## 17. Tình huống đặc biệt / Edge case tổng hợp

| # | Kịch bản | Kết quả mong đợi |
|---|----------|------------------|
| 17.1 | Event đến giờ bắt đầu nhưng chưa có ai đăng ký | Hệ thống gửi thông báo cho organizer |
| 17.2 | Event kết thúc nhưng organizer không Complete | Admin thấy trong overdue preview, auto-complete sau 24h |
| 17.3 | Organizer tạo event → bị khóa → event tự hủy | Cascade đúng |
| 17.4 | 2 tab cùng login → 1 tab logout | Tab còn lại bị đẩy về login khi gọi API |
| 17.5 | Upload ảnh > 5MB | Bị chặn hoặc resize |
| 17.6 | Nhập XSS `<script>alert(1)</script>` vào tên event | Hiển thị text thuần, không execute |
| 17.7 | Nhập SQL injection vào search | Không lỗi, trả kết quả rỗng |
| 17.8 | Mở 2 browser, cùng đăng ký event → 1 người cuối hết chỗ | Người sau nhận lỗi "Hết chỗ" |
| 17.9 | Refresh token hết hạn (sau 7 ngày) | Bị đẩy về login |
| 17.10 | Event có 100 volunteer check-in → Complete | Chứng chỉ cấp đủ 100 |
| 17.11 | Trang hiển thị tiếng Việt đúng (không mojibake) | Tất cả trang không có ký tự lạ |
| 17.12 | Mobile responsive (viewport 375px) | Layout không vỡ |
| 17.13 | Slow network (3G) → submit form | Không submit 2 lần (double-click protection) |
| 17.14 | Back button sau khi submit form | Không re-submit |

---

## Cách sử dụng tài liệu này

1. **Mỗi kịch bản** = 1 test case. Đánh dấu ✅/❌ khi test.
2. **Tình huống bất thường** quan trọng hơn happy path — đây là nơi bug thường ẩn.
3. Ưu tiên test theo thứ tự: **Security (RBAC, leak)** → **Data integrity (cascade, status)** → **UX (thông báo, redirect)**.
4. Nếu phát hiện lỗi, ghi lại: số kịch bản + mô tả lỗi + screenshot.

---

*Tổng: 17 nhóm, ~120 kịch bản.*
## Cập nhật test case quản trị 2026-05-25

Các test case dưới đây bổ sung cho nghiệp vụ đã sửa đổi gần nhất. Khi chạy demo, ưu tiên kiểm thử qua UI thật thay vì gọi trực tiếp API.

### Admin badges

| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 18.1 | Admin vào `/admin/badges`, tạo huy hiệu với tên, mô tả và điều kiện hợp lệ | Huy hiệu mới xuất hiện trong danh sách |
| 18.2 | Admin sửa tên, mô tả, icon hoặc điều kiện huy hiệu | Lưu thành công, danh sách cập nhật đúng |
| 18.3 | Admin xóa huy hiệu chưa từng cấp cho user | Xóa thành công |
| 18.4 | Admin xóa huy hiệu đã cấp cho user | Bị chặn, hiển thị lý do không được xóa |
| 18.5 | Admin nhập điều kiện âm hoặc bỏ trống cả `min_events` và `min_hours` | Bị chặn validation |

### Admin finance watch

| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 18.6 | Admin vào `/admin/finance` | Hiển thị tổng quan, donation pending lâu ngày, campaign chưa báo cáo và proposal còn mở nếu có |
| 18.7 | Admin đổi số ngày lọc donation pending | Danh sách stale donations reload theo ngưỡng mới |
| 18.8 | Admin tìm thao tác sửa/xóa tiền trực tiếp trong `/admin/finance` | Không có action sửa/xóa trực tiếp trên màn giám sát |
| 18.9 | Có campaign đã có tiền confirmed nhưng event đã complete/cancel mà chưa report | Campaign xuất hiện trong nhóm chưa báo cáo |

### Volunteer verification request changes

| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 18.10 | Admin yêu cầu bổ sung KYC với lý do quá ngắn | Bị chặn validation |
| 18.11 | Admin yêu cầu bổ sung KYC với lý do hợp lệ | KYC chuyển `ChangesRequested`, volunteer nhận thông báo |
| 18.12 | Admin yêu cầu bổ sung minh chứng kỹ năng với lý do hợp lệ | Skill chuyển `ChangesRequested`, volunteer nhận thông báo |
| 18.13 | Volunteer gửi lại minh chứng kỹ năng sau `ChangesRequested` | Skill chuyển lại `PendingVerification` |
| 18.14 | Admin reject KYC hoặc skill hợp lệ | Trạng thái chuyển `Rejected`, lý do hiển thị cho volunteer |

### Admin event hard delete

| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 18.15 | Admin xóa event chưa có registration, campaign, sponsor, channel hoặc certificate | Xóa thành công |
| 18.16 | Admin xóa event đã có dữ liệu nghiệp vụ | Bị chặn; hướng xử lý đúng là hủy event hoặc chuyển trạng thái nghiệp vụ |
## Cập nhật test case nghiệp vụ lõi 2026-05-25

| # | Bước | Kết quả mong đợi |
|---|------|------------------|
| 19.1 | Tạo event mới không chia ca | Form tạo event không bắt nhập ca; event tạo thành công |
| 19.2 | Event chưa có registration, organizer bấm `Chia ca` và tạo ca hợp lệ | Tạo ca thành công, đăng ký sau đó bắt buộc chọn ca |
| 19.3 | Event đã có ít nhất một registration, organizer tìm nút `Chia ca` | UI ẩn nút; nếu gọi API trực tiếp thì backend chặn |
| 19.4 | Event có ca, volunteer đăng ký nhưng không chọn ca | Bị chặn validation |
| 19.5 | Tạo ca ngoài thời gian event | Bị chặn validation |
| 19.6 | Check-in trước cửa sổ event/shift | Bị chặn |
| 19.7 | Check-in đúng cửa sổ, sau đó check-out | Giờ tình nguyện được tính theo thời gian thực |
| 19.8 | Complete event còn registration `Pending` | Hiện cảnh báo; nếu xác nhận thì pending không được tính tham gia/chứng chỉ |
| 19.9 | Complete event không có volunteer confirmed/check-in | Vẫn hoàn thành, không cấp chứng chỉ |
| 19.10 | Organizer tạo campaign cho event đã kết thúc/hủy | Bị chặn |
| 19.11 | Event không có campaign/donation/sponsor | Vẫn đăng ký, điểm danh, complete và cấp chứng chỉ bình thường |
| 19.12 | Donation số tiền âm, bằng 0 hoặc vượt giới hạn | Bị chặn, tổng campaign không đổi |
| 19.13 | Sponsor gửi proposal trùng khi đã có proposal active cùng event | Bị chặn |
| 19.14 | Proposal `Received` xuất hiện trong impact report | Tổng tài trợ đã nhận cập nhật đúng, không cộng trùng legacy sponsor |
