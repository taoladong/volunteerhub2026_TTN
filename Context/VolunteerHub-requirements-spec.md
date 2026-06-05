# Đặc tả yêu cầu chi tiết - Volunteer Hub

## 1. Thông tin tài liệu

- Tên hệ thống: Volunteer Hub - Cổng sự kiện tình nguyện.
- Mục đích tài liệu: Đặc tả yêu cầu nghiệp vụ và kỹ thuật ở mức đủ chi tiết để thiết kế, phát triển, kiểm thử và nghiệm thu hệ thống.
- Nguồn tổng hợp: Các tài liệu trong thư mục `Context`, gồm mô tả bài toán Volunteer Hub, project reading guide và trạng thái triển khai hiện tại.
- Phạm vi: Web application gồm frontend, API gateway, auth service, core API service và database phục vụ các vai trò Volunteer, Organizer, Sponsor, Admin.

## 2. Bối cảnh và vấn đề

Các hoạt động tình nguyện hiện thường được tổ chức rời rạc qua mạng xã hội. Cách tổ chức này gây khó khăn trong việc kiểm chứng uy tín đơn vị tổ chức, tìm đúng tình nguyện viên có kỹ năng phù hợp, điều phối nhân sự tại hiện trường và ghi nhận đóng góp sau sự kiện.

Volunteer Hub được xây dựng để tạo một hệ sinh thái minh bạch, nơi sự kiện tình nguyện được công khai, tình nguyện viên được kết nối theo kỹ năng/vị trí, nhà tổ chức quản lý vận hành có kiểm soát, nhà tài trợ theo dõi được đóng góp và hệ thống tự động ghi nhận giờ tình nguyện, chứng chỉ, huy hiệu.

## 3. Mục tiêu hệ thống

1. Kết nối đúng người, đúng việc dựa trên kỹ năng, nhu cầu sự kiện và vị trí địa lý.
2. Minh bạch hóa thông tin tổ chức, sự kiện, tài trợ và kết quả tác động xã hội.
3. Hỗ trợ tổ chức quản lý trọn vòng đời sự kiện: tạo, chờ duyệt, duyệt, đăng ký, xác nhận, điểm danh, hoàn thành, báo cáo.
4. Ghi nhận chính thống đóng góp của tình nguyện viên thông qua hộ chiếu tình nguyện, giờ tình nguyện, chứng chỉ điện tử và huy hiệu.
5. Cung cấp trải nghiệm sử dụng tốt trên desktop và mobile, đặc biệt cho thao tác tại hiện trường.

## 4. Phạm vi hệ thống

### 4.1. Trong phạm vi

- Đăng ký, đăng nhập, phân quyền người dùng theo vai trò.
- Quản lý hồ sơ tình nguyện viên, kỹ năng và hộ chiếu tình nguyện.
- Quản lý danh mục sự kiện, kỹ năng, người dùng.
- Tạo, sửa, duyệt, từ chối, hoàn thành và hiển thị sự kiện.
- Đăng ký tham gia sự kiện, chọn ca làm việc, rút đăng ký khi còn chờ duyệt.
- Lên lịch phỏng vấn tình nguyện viên bằng `InterviewSlot`, gửi lời mời/call và dùng kết quả phỏng vấn trước khi xác nhận đăng ký.
- Xác nhận/hủy đăng ký, điểm danh bằng QR hoặc GPS.
- Quản lý ca làm việc, tiến độ tài trợ/milestone, kênh trao đổi.
- Tài trợ sự kiện và theo dõi danh sách tài trợ của nhà tài trợ.
- Đánh giá hai chiều giữa organizer và volunteer sau sự kiện.
- Tự động cấp chứng chỉ, verify certificate và tải PDF.
- Trao huy hiệu dựa trên điều kiện số sự kiện hoặc số giờ.
- Dashboard, thông báo, export dữ liệu, monitoring và audit log cho admin.

### 4.2. Ngoài phạm vi hoặc backlog

- Kiểm duyệt pháp lý organizer bằng upload giấy tờ tổ chức.
- Workflow khiếu nại/ticket đầy đủ cho admin.
- QR matrix thật trong PDF certificate nếu endpoint hiện chỉ render certificate/verify URL tối thiểu.
- Caching/rate limiting chuyên biệt cho chiến dịch khẩn cấp quy mô lớn.
- Tối ưu dữ liệu kỹ năng bằng bảng join nếu vẫn lưu `RequiredSkillIds` dạng JSON.

## 5. Tác nhân hệ thống

### 5.1. Volunteer

Tình nguyện viên là người tìm kiếm sự kiện, cập nhật hồ sơ/kỹ năng, đăng ký tham gia, chọn ca, nhận thông báo, tham gia kênh trao đổi, điểm danh, nhận chứng chỉ/huy hiệu và đánh giá organizer sau sự kiện.

### 5.2. Organizer

Tổ chức hoặc nhà sáng lập là người tạo sự kiện, mô tả nhu cầu nhân sự, quản lý đăng ký, xác nhận/hủy volunteer, tạo ca làm việc, điểm danh, hoàn thành sự kiện, đánh giá volunteer và xem báo cáo.

### 5.3. Sponsor

Nhà tài trợ là người xem các sự kiện đã được duyệt, gửi đóng góp tài chính/nhu yếu phẩm/dịch vụ, theo dõi danh sách tài trợ của mình và tiến độ/tác động của sự kiện.

### 5.4. Admin

Quản trị viên hệ thống là người quản lý người dùng, duyệt/từ chối/hoàn thành sự kiện, quản lý danh mục, kỹ năng, export dữ liệu, xem monitoring, audit log và xử lý các vấn đề vận hành.

### 5.5. Guest

Khách chưa đăng nhập có thể xem landing page, danh sách sự kiện công khai, chi tiết sự kiện đã duyệt, kết quả tác động công khai và xác thực chứng chỉ bằng mã verify.

## 6. Yêu cầu chức năng

### FR-01. Xác thực và phân quyền

- Hệ thống phải cho phép người dùng đăng ký tài khoản theo vai trò được hỗ trợ.
- Hệ thống phải cho phép đăng nhập bằng thông tin định danh và mật khẩu.
- Sau đăng nhập, hệ thống cấp JWT access token và refresh token.
- Frontend phải lưu phiên đăng nhập để gọi API qua gateway.
- Hệ thống phải phân quyền route/API theo vai trò `Volunteer`, `Organizer`, `Sponsor`, `Admin`.
- Người dùng không đúng vai trò phải bị chặn hoặc chuyển hướng khỏi màn hình không được phép.

### FR-02. Trang công khai và khám phá sự kiện

- Guest và người dùng đã đăng nhập có thể xem landing page.
- Hệ thống phải hiển thị danh sách sự kiện công khai với trạng thái `Approved`.
- Người dùng có thể lọc/tìm kiếm sự kiện theo từ khóa, danh mục, kỹ năng, trạng thái phù hợp, vị trí hoặc bán kính gần tôi nếu có định vị.
- Hệ thống phải hỗ trợ chế độ danh sách và bản đồ cho sự kiện.
- Chi tiết sự kiện phải hiển thị thông tin cơ bản, organizer, thời gian, địa điểm, kỹ năng yêu cầu, số lượng, trạng thái, tài trợ/tác động công khai nếu có.
- Chi tiết sự kiện phải có khả năng chia sẻ hoặc copy link.

### FR-03. Hồ sơ tình nguyện viên

- Volunteer có thể tạo/cập nhật hồ sơ cá nhân.
- Hồ sơ phải lưu các thông tin: chuyên môn/kỹ năng, nhóm máu, ngôn ngữ, sở thích, giới thiệu, avatar hoặc thông tin liên hệ phù hợp.
- Volunteer có thể chọn nhiều kỹ năng từ danh mục kỹ năng hệ thống.
- Dữ liệu hồ sơ phải được validate trước khi lưu.

### FR-04. Hộ chiếu tình nguyện

- Volunteer có thể xem lịch sử sự kiện đã tham gia.
- Hệ thống phải tổng hợp số giờ tình nguyện đã ghi nhận.
- Hệ thống phải hiển thị chứng chỉ và huy hiệu liên quan đến quá trình tham gia.
- Chỉ các sự kiện có tham gia/điểm danh hợp lệ mới được tính vào đóng góp.

### FR-05. Quản lý sự kiện của organizer

- Organizer có thể tạo sự kiện mới với tên, mô tả, danh mục, kỹ năng yêu cầu, thời gian bắt đầu/kết thúc, địa điểm, tọa độ, số lượng tối đa và ảnh bìa.
- Sự kiện mới tạo phải ở trạng thái `Pending` để chờ admin duyệt.
- Organizer có thể sửa sự kiện của mình khi nghiệp vụ cho phép.
- Khi sửa sự kiện, hệ thống phải giữ/cập nhật đúng danh sách kỹ năng yêu cầu.
- Organizer có thể xem danh sách sự kiện của mình.
- Organizer có thể vào màn quản lý với sự kiện `Approved` hoặc `Completed`.

### FR-06. Duyệt sự kiện

- Admin có thể xem danh sách sự kiện theo trạng thái.
- Admin có thể duyệt sự kiện `Pending` thành `Approved`.
- Admin có thể từ chối sự kiện `Pending` thành `Rejected`.
- Hệ thống phải thống nhất trạng thái từ chối là `Rejected`.
- Khi sự kiện được duyệt, hệ thống có thể tạo kênh trao đổi gắn với sự kiện.
- Admin và organizer sở hữu sự kiện có thể hoàn thành sự kiện nếu sự kiện đang `Approved`.

### FR-07. Đăng ký tham gia sự kiện

- Volunteer có thể đăng ký sự kiện đã `Approved`.
- Nếu sự kiện có ca làm việc, Volunteer có thể chọn ca khi đăng ký.
- Hệ thống phải kiểm tra ca thuộc đúng sự kiện.
- Hệ thống phải kiểm tra sức chứa sự kiện/ca trước khi nhận đăng ký.
- Trạng thái đăng ký mới mặc định là `Pending`.
- Volunteer có thể rút đăng ký khi trạng thái còn `Pending`.
- Volunteer có thể đăng ký lại nếu đăng ký cũ đã `Cancelled`.
- Volunteer phải xem được trạng thái đăng ký hiện tại trong chi tiết sự kiện hoặc danh sách đăng ký của mình.

### FR-08. Quản lý đăng ký

- Organizer chỉ được xem danh sách đăng ký của sự kiện do mình sở hữu; Admin có thể xem khi được phân quyền.
- Organizer có thể xác nhận đăng ký `Pending` thành `Confirmed`.
- Organizer có thể hủy đăng ký theo rule nghiệp vụ.
- Các action xác nhận/hủy/điểm danh phải kiểm tra `registrationId` thuộc đúng `eventId`.
- UI phải hiển thị tên volunteer, ngày đăng ký, trạng thái, ca làm việc, ghi chú và thông tin điểm danh nếu có.

### FR-09. Quản lý ca làm việc

- Organizer có thể tạo ca làm việc cho sự kiện của mình.
- Ca làm việc phải có tên, thời gian bắt đầu, thời gian kết thúc và số lượng tối đa hợp lệ.
- Thời gian kết thúc phải sau thời gian bắt đầu.
- Volunteer chỉ có thể chọn ca còn chỗ.
- Sức chứa ca được tính từ số đăng ký active, hoặc từ counter nếu hệ thống mở rộng sau này.

### FR-10. Điểm danh

- Organizer có thể điểm danh volunteer đã được xác nhận.
- Hệ thống phải hỗ trợ điểm danh bằng mã QR của sự kiện.
- Hệ thống phải hỗ trợ điểm danh bằng tọa độ GPS nếu backend nhận tọa độ.
- Điểm danh thành công phải ghi nhận trạng thái tham gia, thời gian hoặc số giờ tình nguyện theo rule.
- Volunteer chưa được xác nhận không được điểm danh.

### FR-11. Hoàn thành sự kiện và báo cáo tác động

- Organizer sở hữu sự kiện hoặc Admin có thể đánh dấu sự kiện `Approved` thành `Completed`.
- Khi hoàn thành, hệ thống phải tổng hợp số người tham gia, số giờ tình nguyện, chứng chỉ đã cấp và thông tin tài trợ.
- Sự kiện đã hoàn thành phải có báo cáo/tác động công khai ở trang chi tiết nếu dữ liệu được phép công khai.
- Organizer vẫn có thể xem báo cáo sau khi sự kiện hoàn thành.

### FR-12. Chứng chỉ điện tử

- Khi sự kiện hoàn thành, hệ thống phải tự động cấp chứng chỉ cho volunteer đủ điều kiện, ví dụ đã điểm danh.
- Mỗi chứng chỉ phải có mã verify duy nhất.
- Người dùng có thể xem danh sách chứng chỉ của mình.
- Guest hoặc người dùng có thể xác thực chứng chỉ qua đường dẫn/mã verify.
- Hệ thống phải cung cấp endpoint tải PDF chứng chỉ.
- PDF phải hiển thị đúng thông tin chứng chỉ, tên sự kiện và mã xác thực.

### FR-13. Huy hiệu

- Hệ thống phải hỗ trợ danh mục badge/huy hiệu.
- Hệ thống phải trao huy hiệu tự động dựa trên điều kiện như số sự kiện hoặc số giờ tình nguyện.
- Volunteer có thể xem huy hiệu đã nhận.

### FR-14. Đánh giá hai chiều

- Sau khi sự kiện `Completed`, Volunteer đã tham gia có thể đánh giá Organizer.
- Organizer sở hữu sự kiện có thể đánh giá Volunteer đã tham gia.
- Người không liên quan hoặc vai trò không phù hợp không được tạo đánh giá.
- Hệ thống phải lưu điểm đánh giá và nhận xét nếu có.

### FR-15. Kênh trao đổi

- Sự kiện đã duyệt có thể có channel trao đổi.
- Người có quyền tham gia channel có thể xem bài viết, bình luận và tương tác.
- API phải kiểm tra quyền truy cập channel.
- Khi thao tác comment/like, hệ thống phải kiểm tra `postId` và `commentId` thuộc đúng `channelId`.

### FR-16. Tài trợ sự kiện

- Sponsor có thể xem sự kiện đã `Approved` để tài trợ.
- Sponsor có thể tạo sponsorship với loại đóng góp, số tiền hoặc giá trị, và ghi chú.
- Backend phải nhận đúng payload gồm `contributionType`, `amount`, `note`.
- Sponsor chỉ được tài trợ sự kiện tồn tại và đang `Approved`.
- Sponsor có thể xem danh sách tài trợ của mình.
- Thông tin tài trợ phù hợp có thể xuất hiện trong báo cáo tác động công khai.

### FR-17. Theo dõi milestone/tài trợ

- Organizer hoặc vai trò được phép có thể tạo/cập nhật milestone tiến độ tài trợ/dự án.
- Milestone phải có tiêu đề hợp lệ, mô tả, hạn dự kiến, thứ tự, trạng thái và phần trăm tiến độ nếu có.
- Danh sách milestone phải được sắp xếp ổn định theo thứ tự hoặc thời gian.
- Dữ liệu milestone phải được validate ở cả frontend và backend.

### FR-18. Thông báo

- Hệ thống phải có trang thông báo cho người dùng đã đăng nhập.
- Thông báo có thể dùng cơ chế pull/polling.
- Backlog: realtime notification nếu cần trải nghiệm tức thời.

### FR-19. Dashboard

- Sau đăng nhập, mỗi vai trò phải có dashboard phù hợp.
- Volunteer dashboard nên hiển thị gợi ý sự kiện, đăng ký gần đây, nhắc lịch, thông báo và đóng góp.
- Organizer dashboard nên hiển thị sự kiện của tôi, trạng thái đăng ký, tiến độ vận hành.
- Sponsor dashboard nên hiển thị tài trợ của tôi và tác động.
- Admin dashboard nên hiển thị số liệu tổng quan, trạng thái sự kiện, monitoring hoặc cảnh báo.

### FR-20. Quản trị danh mục và kỹ năng

- Admin có thể tạo/sửa/xóa danh mục sự kiện.
- Admin có thể tạo/sửa/xóa kỹ năng.
- Tên danh mục/kỹ năng phải được trim và validate độ dài.
- Không được xóa danh mục đang được sự kiện sử dụng; hệ thống phải trả lỗi thân thiện.
- UI phải hiển thị lỗi validation nhất quán với backend.

### FR-21. Quản trị người dùng

- Admin có thể xem danh sách người dùng.
- Admin có thể tìm kiếm người dùng bằng `keyword`.
- UI phải hiển thị đúng các trường: tên, username, email, vai trò, trạng thái active.
- Các thao tác thay đổi trạng thái người dùng nếu có phải được phân quyền admin.

### FR-22. Export dữ liệu

- Admin có thể export dữ liệu/báo cáo.
- JSON export phải stringify đúng, không xuất ra `[object Object]`.
- File export phải phản ánh dữ liệu được phép xuất theo quyền admin.

### FR-23. Monitoring và audit log

- Admin phải có màn monitoring để xem sức khỏe hệ thống, số liệu tổng quan và lịch sử thao tác nhạy cảm.
- Backend monitoring/audit log phải được gọi qua API admin phù hợp.
- UI phải hiển thị trạng thái hệ thống rõ ràng và chịu lỗi khi một nguồn dữ liệu không phản hồi.

## 7. Trạng thái nghiệp vụ

### 7.1. Event status

- `Pending`: Sự kiện mới tạo, chờ admin duyệt.
- `Approved`: Sự kiện đã được duyệt, có thể đăng ký/tài trợ/vận hành.
- `Completed`: Sự kiện đã hoàn thành, có thể phát sinh báo cáo, chứng chỉ, rating.
- `Rejected`: Sự kiện bị admin từ chối.
- `Cancelled`: Sự kiện bị hủy theo rule nghiệp vụ nếu có.

### 7.2. Registration status

- `Pending`: Volunteer đã đăng ký, chờ organizer xác nhận.
- `Confirmed`: Organizer đã xác nhận volunteer tham gia.
- `Cancelled`: Đăng ký đã bị rút/hủy.

## 8. Quy tắc nghiệp vụ chính

1. Chỉ sự kiện `Approved` mới được volunteer đăng ký và sponsor tài trợ.
2. Chỉ organizer sở hữu event hoặc admin mới được xem/điều phối registration của event.
3. Organizer chỉ được confirm/cancel/check-in registration thuộc đúng event của mình.
4. Volunteer chỉ được rút đăng ký khi registration còn `Pending`.
5. Volunteer có thể đăng ký lại nếu bản ghi cũ đã `Cancelled`.
6. Check-in chỉ hợp lệ với volunteer đã `Confirmed`.
7. Complete event chỉ hợp lệ khi event đang `Approved`.
8. Rating chỉ hợp lệ sau khi event `Completed` và người đánh giá có quan hệ tham gia/sở hữu hợp lệ.
9. Certificate chỉ cấp cho volunteer đủ điều kiện sau event completed.
10. Không serialize dữ liệu nhạy cảm như password/salt trong response public.
11. Channel, post, comment, like phải kiểm tra quan hệ cha con theo đúng route.
12. Dữ liệu tọa độ event là bắt buộc nếu event cần xuất hiện trên bản đồ và filter gần tôi.

## 9. Yêu cầu dữ liệu chính

### 9.1. User

- Thuộc tính chính: id, name, userName, email, role/userType, isActive.
- Không được trả về password, salt hoặc dữ liệu xác thực nhạy cảm cho client.

### 9.2. Event

- Thuộc tính chính: id, title, description, category, organizer, required skills, startDate, endDate, location, latitude, longitude, maxParticipants, coverImage, status, qrCode, channel.

### 9.3. Registration

- Thuộc tính chính: id, eventId, userId, shiftId, status, note, isAttended, volunteerHours, registeredAt.

### 9.4. WorkShift

- Thuộc tính chính: id, eventId, name, startTime, endTime, maxVolunteers.

### 9.5. Certificate

- Thuộc tính chính: id, userId, eventId, certificateCode/verifyCode, issuedAt, pdf/verify endpoint.

### 9.6. Sponsorship

- Thuộc tính chính: id, eventId, sponsorId, contributionType, amount, note, createdAt.

### 9.7. Rating

- Thuộc tính chính: id, eventId, raterId, targetId, score, comment, createdAt.

## 10. Yêu cầu giao diện

- Giao diện phải hỗ trợ desktop và mobile.
- Mobile không được tràn ngang ở các màn chính.
- Form tạo/sửa event và modal quản lý ca/milestone phải xếp 1 cột trên mobile, 2 cột từ breakpoint phù hợp.
- Public landing phải thể hiện rõ thương hiệu VolunteerHub và CTA chính.
- Các màn vận hành tại hiện trường như quản lý event, điểm danh, đăng ký phải có nút bấm dễ thao tác trên mobile.
- Text tiếng Việt phải hiển thị đúng dấu, không mojibake.
- UI phải hiển thị loading, empty state và error state cơ bản.

## 11. Yêu cầu phi chức năng

### NFR-01. Bảo mật

- API phải kiểm tra JWT và role ở mọi endpoint cần bảo vệ.
- Không truyền dữ liệu nhạy cảm không cần thiết về client.
- Thao tác nhạy cảm nên được ghi audit log.
- Dữ liệu cá nhân của volunteer phải được bảo vệ và chỉ hiển thị cho người có quyền.

### NFR-02. Minh bạch

- Thông tin event, organizer, sponsor và impact public phải rõ ràng với dữ liệu được phép công khai.
- Certificate phải có cơ chế verify độc lập.

### NFR-03. Hiệu năng

- Danh sách lớn phải hỗ trợ pagination/filter.
- Truy vấn event theo skill/vị trí cần được tối ưu khi dữ liệu tăng.
- Hệ thống nên có hướng mở rộng caching/rate limiting cho chiến dịch khẩn cấp.

### NFR-04. Khả dụng

- Frontend phải responsive.
- Các thao tác chính cần ít bước và có phản hồi rõ ràng.
- Hệ thống cần chạy ổn định qua gateway ở local/dev.

### NFR-05. Bảo trì

- API contract giữa frontend và backend phải được giữ nhất quán trong `api.js`, controller và service.
- Khi thay đổi route/status/payload, phải cập nhật reading guide hoặc tài liệu liên quan.
- Validation nên đồng bộ giữa frontend và backend.

## 12. Kiến trúc triển khai tham chiếu

- Frontend chính: `BaseCore.WebClient`, chạy ở `http://localhost:3000`.
- API Gateway: `BaseCore.ApiGateway`, chạy ở `http://localhost:5000`.
- Auth Service: `BaseCore.AuthService`, chạy ở `http://localhost:5002`.
- Core API Service: `BaseCore.APIService`, chạy ở `http://localhost:5001`.
- Repository/EF Core: `BaseCore.Repository`, DbContext tên `MySqlDbContext`, runtime dùng SQL Server.
- Frontend gọi API qua `/api` để đi qua gateway/reverse proxy.

## 13. Tiêu chí nghiệm thu tổng quát

1. Build backend pass không error.
2. Build frontend pass không error.
3. Người dùng từng vai trò đăng nhập được và bị chặn ở màn không có quyền.
4. Volunteer xem event, đăng ký, chọn ca, rút khi pending, xem đăng ký, xem passport/certificate/badge.
5. Organizer tạo event, admin duyệt, organizer quản lý registration, tạo ca, check-in, complete event, xem report.
6. Sponsor tài trợ event approved và xem danh sách tài trợ của mình.
7. Admin quản lý event/user/category/skill/export/monitoring.
8. Certificate được cấp sau complete event và verify/PDF hoạt động.
9. Rating hai chiều hoạt động đúng quyền sau completed event.
10. Public event detail hiển thị impact và share link.
11. Mobile viewport các màn chính không tràn ngang và các form quan trọng dễ thao tác.

## 14. Backlog ưu tiên đề xuất

1. Hoàn thiện workflow kiểm duyệt pháp lý organizer.
2. Bổ sung complaint/ticket workflow cho admin.
3. Nâng cấp certificate PDF với QR matrix thật.
4. Bổ sung realtime notification hoặc polling tối ưu.
5. Tách required skills sang bảng join nếu cần hiệu năng filter cao.
6. Bổ sung automated UI/E2E test ổn định cho các thao tác ghi chính.
7. Bổ sung caching/rate limiting/observability cho kịch bản chiến dịch khẩn cấp.
