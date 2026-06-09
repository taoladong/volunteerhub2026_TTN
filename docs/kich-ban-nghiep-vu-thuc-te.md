# Kịch bản nghiệp vụ thực tế - VolunteerHub

Tài liệu này mô tả các tình huống thực tế từ lúc tạo sự kiện đến khi volunteer tham gia, điểm danh, hoàn thành sự kiện, quyên góp cá nhân và tài trợ doanh nghiệp. Mục tiêu là giúp nhóm phát triển, tester hoặc người demo hiểu hệ thống đang vận hành theo nghiệp vụ nào.

> Tài khoản demo thường dùng: `admin/admin123`, `organizer/organizer123`, `volunteer/volunteer123`, `sponsor/sponsor123`.

## 0. Rule bắt buộc khi thực hiện

- Phải thực hiện lần lượt đến hết file này. Không dừng giữa chừng khi chưa đi qua toàn bộ các nhóm kịch bản.
- Mỗi kịch bản cần được đánh dấu kết quả sau khi chạy: `Đạt`, `Không đạt`, hoặc `Chưa áp dụng được`.
- Chỉ được test nghiệp vụ qua UI thực tế của hệ thống, giống cách người dùng thật thao tác trên trình duyệt.
- Không được gọi trực tiếp API bằng Swagger, Postman, curl, script SQL hoặc tool dev để thay thế thao tác UI.
- Chỉ được kiểm tra API/database/log sau khi đã thao tác qua UI, và chỉ dùng để đối chiếu kết quả nếu cần điều tra lỗi.
- Nếu UI chưa có màn hoặc nút để thực hiện một nghiệp vụ, đánh dấu kịch bản là `Không đạt` hoặc `Chưa áp dụng được`, không bypass bằng API.
- Khi phát hiện lỗi, ghi lại: mã kịch bản, vai trò đang test, URL/màn hình, thao tác đã làm, kết quả thực tế, kết quả mong đợi và ảnh chụp nếu có.

## 1. Nguyên tắc chung

- Organizer phải được admin xác minh pháp lý trước khi tạo sự kiện.
- Event sau khi tạo cần admin duyệt thì volunteer mới nhìn thấy và đăng ký.
- Event có thể không chia ca hoặc có chia ca.
- Nếu event không có ca, volunteer đăng ký trực tiếp vào event.
- Nếu event đã có ca, volunteer bắt buộc chọn một ca khi đăng ký.
- Organizer chỉ nên chia ca trước khi có volunteer đăng ký. Khi đã có đăng ký active, hệ thống không cho tạo ca mới.
- Sự kiện không phụ thuộc vào tài trợ. Không có ai tài trợ thì event vẫn có thể diễn ra, chỉ là không có dòng tiền/tài trợ ghi nhận trong hệ thống.
- Quyên góp cá nhân dành cho tài khoản volunteer.
- Tài trợ doanh nghiệp dành cho tài khoản sponsor và đi qua đề nghị/chấp nhận/ghi nhận thực nhận.

## 2. Vòng đời sự kiện cơ bản

### Kịch bản 2.1 - Organizer đã xác minh tạo event không chia ca

Vai trò: Organizer, Admin, Volunteer.

Luồng:

1. Organizer đăng nhập.
2. Organizer vào trang tạo sự kiện.
3. Nhập thông tin cơ bản: tên, mô tả, danh mục, kỹ năng yêu cầu nếu có.
4. Nhập địa điểm, tọa độ, bán kính điểm danh.
5. Nhập thời gian bắt đầu/kết thúc và sức chứa tối đa.
6. Chọn có yêu cầu KYC hay không.
7. Upload ảnh bìa.
8. Xem trước và gửi duyệt.
9. Admin vào danh sách sự kiện chờ duyệt.
10. Admin xem chi tiết, nếu hợp lệ thì duyệt.
11. Event chuyển sang `Approved` và xuất hiện trên danh sách public.

Kết quả mong đợi:

- Event public cho volunteer.
- Chưa có tab/luồng ca làm việc bắt buộc.
- Volunteer có thể đăng ký trực tiếp vào event.

### Kịch bản 2.2 - Organizer tạo event rồi chia ca trước khi có đăng ký

Vai trò: Organizer, Admin, Volunteer.

Luồng:

1. Organizer tạo event như bình thường.
2. Trước khi có volunteer đăng ký, organizer vào trang quản lý event.
3. Nếu chưa có đăng ký active, màn quản lý hiện nút `Chia ca`.
4. Organizer bấm `Chia ca`.
5. Tạo một hoặc nhiều ca, ví dụ:
   - `Ca sáng - Hậu cần`, 08:00-11:00, tối đa 10 người.
   - `Ca chiều - Truyền thông`, 13:00-16:00, tối đa 5 người.
6. Mỗi ca phải nằm trong thời gian tổng của event.
7. Sau khi có ca, tab `Ca làm việc` xuất hiện.
8. Admin duyệt event nếu event còn đang pending.
9. Volunteer vào event sẽ thấy danh sách ca và phải chọn một ca để đăng ký.

Kết quả mong đợi:

- Event chuyển sang kiểu đăng ký theo ca.
- Volunteer không thể đăng ký nếu chưa chọn ca.
- Điểm danh và tính giờ ưu tiên theo ca đã chọn.

### Kịch bản 2.3 - Organizer quên chia ca, event đã có người đăng ký

Vai trò: Organizer.

Luồng:

1. Event đã public và có volunteer đăng ký `Pending` hoặc `Confirmed`.
2. Organizer vào trang quản lý event.
3. Nút `Chia ca` không còn hiển thị.
4. Nếu gọi API tạo ca trực tiếp, backend trả lỗi.

Kết quả mong đợi:

- Không thể bật phân ca sau khi đã có đăng ký active.
- Event tiếp tục chạy theo kiểu không chia ca.
- Organizer quản lý điểm danh theo toàn bộ sự kiện.

Lý do nghiệp vụ:

- Tránh tình trạng volunteer đã đăng ký event rồi phải quay lại kiểm tra xem có bị yêu cầu chọn ca hay không.
- Tránh dữ liệu đăng ký bị lẫn giữa có ca và không có ca.

## 3. Đăng ký tham gia sự kiện

### Kịch bản 3.1 - Volunteer đăng ký event không chia ca

Vai trò: Volunteer.

Điều kiện:

- Event `Approved`.
- Event chưa bắt đầu.
- Event chưa đầy.
- Event không có ca.
- Nếu event yêu cầu KYC thì volunteer phải KYC verified.

Luồng:

1. Volunteer đăng nhập.
2. Vào trang chi tiết event.
3. Nhập ghi chú nếu cần.
4. Bấm `Đăng ký tham gia`.

Kết quả mong đợi:

- Registration được tạo với trạng thái `Pending`.
- Organizer nhận thông báo có người đăng ký.
- Event chưa tăng số người đã xác nhận cho đến khi organizer confirm.

### Kịch bản 3.2 - Volunteer đăng ký event có ca

Vai trò: Volunteer.

Điều kiện:

- Event `Approved`.
- Event có ít nhất một ca.
- Ca còn chỗ.
- Nếu ca yêu cầu kỹ năng, hồ sơ volunteer phải có kỹ năng tương ứng.

Luồng:

1. Volunteer mở trang chi tiết event.
2. Hệ thống hiển thị danh sách ca.
3. Volunteer chọn một ca phù hợp.
4. Nhập ghi chú nếu cần.
5. Bấm `Đăng ký tham gia`.

Kết quả mong đợi:

- Registration được tạo với `shiftId`.
- Nếu không chọn ca, frontend báo lỗi.
- Nếu request thiếu `shiftId`, backend từ chối.
- Organizer thấy volunteer đăng ký kèm tên ca.

### Kịch bản 3.3 - Volunteer chưa KYC đăng ký event yêu cầu KYC

Vai trò: Volunteer.

Luồng:

1. Volunteer chưa KYC hoặc KYC chưa verified.
2. Mở event có bật yêu cầu KYC.
3. Bấm đăng ký.

Kết quả mong đợi:

- Hệ thống chặn đăng ký.
- UI hướng volunteer về hồ sơ để gửi KYC.
- Không tạo registration.

## 4. Organizer duyệt người tham gia

### Kịch bản 4.1 - Organizer xác nhận volunteer

Vai trò: Organizer.

Luồng:

1. Organizer vào `Quản lý sự kiện`.
2. Mở tab `Danh sách đăng ký`.
3. Xem danh sách volunteer `Pending`.
4. Kiểm tra hồ sơ, kỹ năng, trạng thái KYC nếu có.
5. Bấm xác nhận.

Kết quả mong đợi:

- Registration chuyển từ `Pending` sang `Confirmed`.
- Số người đã xác nhận tăng.
- Volunteer nhận thông báo được chấp nhận.

### Kịch bản 4.2 - Organizer từ chối hoặc hủy đăng ký

Vai trò: Organizer.

Luồng:

1. Organizer mở danh sách đăng ký.
2. Chọn volunteer không phù hợp hoặc đăng ký nhầm.
3. Từ chối/hủy đăng ký.

Kết quả mong đợi:

- Registration chuyển sang `Cancelled`.
- Nếu trước đó đã confirmed thì sức chứa được giải phóng.
- Volunteer nhận thông báo.

### Kịch bản 4.3 - Volunteer xin hủy đăng ký

Vai trò: Volunteer, Organizer.

Luồng:

1. Volunteer vào đăng ký của tôi.
2. Gửi yêu cầu hủy, nhập lý do.
3. Organizer nhận thông báo.
4. Organizer chấp nhận hoặc xử lý yêu cầu.

Kết quả mong đợi:

- Hệ thống không hard-delete đăng ký.
- Lịch sử vẫn còn để audit.
- Nếu hủy thành công, đăng ký không còn được tính tham gia.

## 5. Điểm danh không chia ca

### Kịch bản 5.1 - Volunteer tự check-in bằng QR

Vai trò: Organizer, Volunteer.

Điều kiện:

- Event `Approved`.
- Volunteer đã được `Confirmed`.
- Event đang trong cửa sổ điểm danh hợp lệ.
- Event không chia ca.

Luồng:

1. Organizer mở màn quản lý event, tab `Điểm danh`.
2. Organizer hiển thị QR của event tại địa điểm.
3. Volunteer mở đăng ký của tôi.
4. Volunteer quét QR.
5. Hệ thống xác thực QR và thời gian.

Kết quả mong đợi:

- Registration được đánh dấu đã check-in.
- Volunteer nhận thông báo đã được ghi nhận.
- Giờ ban đầu có thể là 0 nếu hệ thống yêu cầu check-out để tính giờ thực.

### Kịch bản 5.2 - Organizer điểm danh thủ công

Vai trò: Organizer.

Luồng:

1. Organizer mở tab `Điểm danh`.
2. Chọn volunteer đã confirmed.
3. Nhập/scan mã nếu cần hoặc dùng thao tác điểm danh thủ công.
4. Xác nhận điểm danh.

Kết quả mong đợi:

- Volunteer được đánh dấu đã tham gia.
- Có audit log.
- Volunteer nhận thông báo để kiểm tra nếu có sai sót.

### Kịch bản 5.3 - Organizer walk-in volunteer

Vai trò: Organizer.

Luồng:

1. Một volunteer đến thực tế nhưng chưa đăng ký trước.
2. Organizer mở walk-in.
3. Chọn tài khoản volunteer.
4. Ghi chú lý do.
5. Xác nhận.

Kết quả mong đợi:

- Tạo hoặc khôi phục registration.
- Registration được xác nhận và ghi nhận tham gia.
- Nếu event không chia ca thì không cần chọn ca.

## 6. Điểm danh có chia ca

### Kịch bản 6.1 - Volunteer check-in đúng ca

Vai trò: Volunteer.

Điều kiện:

- Event có ca.
- Volunteer đã đăng ký và được confirmed vào một ca cụ thể.
- Thời gian hiện tại nằm trong cửa sổ điểm danh của ca.

Luồng:

1. Volunteer mở đăng ký.
2. Quét QR event.
3. Hệ thống kiểm tra QR.
4. Hệ thống kiểm tra thời gian theo ca, không theo toàn bộ event.

Kết quả mong đợi:

- Check-in thành công.
- Giờ tham gia được tính trong giới hạn thời gian của ca.

### Kịch bản 6.2 - Volunteer check-in sai giờ ca

Vai trò: Volunteer.

Luồng:

1. Volunteer đăng ký `Ca sáng`.
2. Đến `Ca chiều` mới check-in.

Kết quả mong đợi:

- Hệ thống từ chối vì ngoài cửa sổ điểm danh của ca.
- Không ghi nhận giờ sai.

### Kịch bản 6.3 - Organizer walk-in event có ca

Vai trò: Organizer.

Luồng:

1. Organizer mở walk-in.
2. Vì event có ca, form bắt buộc chọn ca.
3. Organizer chọn volunteer và ca tương ứng.
4. Xác nhận walk-in.

Kết quả mong đợi:

- Walk-in bị chặn nếu không chọn ca.
- Registration mới gắn đúng `shiftId`.
- Điểm danh/tính giờ theo ca.

## 7. Check-out và tính giờ

### Kịch bản 7.1 - Volunteer check-out sau khi hoàn thành

Vai trò: Volunteer hoặc Organizer.

Luồng:

1. Volunteer đã check-in.
2. Khi rời sự kiện, volunteer hoặc organizer thực hiện check-out.
3. Hệ thống tính giờ thực tế dựa trên thời gian check-in/check-out.
4. Nếu có ca, giờ được giới hạn theo khung ca.

Kết quả mong đợi:

- `VolunteerHours` được cập nhật.
- Tổng giờ trong hồ sơ volunteer được đồng bộ.
- Badge/certificate có thể dựa trên dữ liệu giờ đã cập nhật.

### Kịch bản 7.2 - Organizer chỉnh giờ thủ công sau sự kiện

Vai trò: Organizer.

Luồng:

1. Sau event, organizer phát hiện volunteer rời sớm hoặc thiếu check-out.
2. Organizer chỉnh giờ tham gia.
3. Nhập số giờ hợp lệ.

Kết quả mong đợi:

- Số giờ không vượt quá giới hạn hợp lý của event/ca.
- Hồ sơ volunteer được cập nhật.
- Badge được đánh giá lại nếu tổng giờ thay đổi.

## 8. Hoàn thành sự kiện và chứng chỉ

### Kịch bản 8.1 - Organizer hoàn thành event có người tham gia

Vai trò: Organizer.

Điều kiện:

- Event `Approved`.
- Event đã kết thúc hoặc organizer quyết định hoàn thành theo rule hiện tại.
- Có volunteer đã được điểm danh.

Luồng:

1. Organizer mở trang quản lý event.
2. Bấm `Hoàn thành`.
3. Nếu còn đăng ký pending/cancel-request, hệ thống cảnh báo.
4. Organizer xác nhận hoàn thành.

Kết quả mong đợi:

- Event chuyển sang `Completed`.
- Các đăng ký pending/cancel-request không được tính tham gia và chuyển sang trạng thái không tham gia/cancelled.
- Volunteer đã attended được ghi nhận passport/giờ.
- Certificate được tạo hoặc chờ worker tạo PDF.

### Kịch bản 8.2 - Hoàn thành event chưa có ai điểm danh

Vai trò: Organizer.

Luồng:

1. Organizer bấm hoàn thành khi chưa có volunteer attended.
2. Hệ thống cảnh báo rằng sẽ không cấp chứng chỉ.
3. Organizer vẫn xác nhận.

Kết quả mong đợi:

- Event có thể hoàn thành.
- Không có certificate cho volunteer.
- Các đăng ký chưa xử lý không được tính tham gia.

### Kịch bản 8.3 - Admin mở lại event đã hoàn thành

Vai trò: Admin.

Luồng:

1. Admin phát hiện event bị hoàn thành nhầm.
2. Admin dùng chức năng mở lại/uncomplete.

Kết quả mong đợi:

- Event quay về trạng thái có thể quản lý tiếp theo rule hệ thống.
- Certificate đã cấp có thể bị thu hồi/xóa theo rule hiện tại.
- Organizer/volunteer nên được thông báo nếu có thay đổi lớn.

## 9. Quyên góp cá nhân qua campaign

### Kịch bản 9.1 - Organizer tạo đợt kêu gọi ủng hộ

Vai trò: Organizer.

Điều kiện:

- Event đang `Approved`.
- Event chưa qua thời gian kết thúc.

Luồng:

1. Organizer vào quản lý event.
2. Mở tab `Kêu gọi ủng hộ`.
3. Tạo campaign với tiêu đề, mô tả, mục tiêu tiền, mức tối thiểu nếu có, thời gian nhận ủng hộ, thông tin nhận tiền.
4. Mở campaign.

Kết quả mong đợi:

- Campaign public cho volunteer.
- Campaign không được tạo nếu event đã kết thúc, bị hủy, bị từ chối hoặc completed.

### Kịch bản 9.2 - Volunteer ủng hộ tiền

Vai trò: Volunteer.

Luồng:

1. Volunteer mở event hoặc campaign.
2. Nhập số tiền ủng hộ.
3. Nhập thông tin liên hệ/chứng từ nếu cần.
4. Chọn ẩn danh nếu muốn.
5. Gửi ủng hộ.

Kết quả mong đợi:

- Donation ở trạng thái chờ organizer xác nhận.
- Số tiền phải lớn hơn 0 và không vượt giới hạn hệ thống.
- Nếu chọn ẩn danh, public không hiển thị tên/liên hệ.

### Kịch bản 9.3 - Organizer xác nhận donation

Vai trò: Organizer.

Luồng:

1. Organizer mở danh sách donation chờ xác nhận.
2. Đối chiếu sao kê/chứng từ.
3. Bấm xác nhận hoặc từ chối.

Kết quả mong đợi:

- Donation `Confirmed` được cộng vào số tiền đã nhận của campaign.
- Donation bị reject không được tính vào tổng.
- Volunteer nhận thông báo kết quả.

### Kịch bản 9.4 - Organizer báo cáo sử dụng tiền ủng hộ

Vai trò: Organizer.

Luồng:

1. Sau event hoặc sau khi đóng campaign, organizer nhập báo cáo.
2. Nhập số tiền đã sử dụng, mô tả sử dụng, chi tiết chi phí, file đính kèm nếu có.
3. Gửi báo cáo.

Kết quả mong đợi:

- Campaign chuyển sang trạng thái đã báo cáo.
- Admin/export finance nhìn thấy số liệu.
- Volunteer/donor có thể theo dõi tính minh bạch ở mức hệ thống hỗ trợ.

## 10. Tài trợ doanh nghiệp

### Kịch bản 10.1 - Sponsor đề nghị tài trợ event

Vai trò: Sponsor, Organizer.

Luồng:

1. Sponsor đăng nhập.
2. Mở event phù hợp.
3. Gửi đề nghị tài trợ với tiêu đề, nội dung, số tiền, mục đích, lợi ích mong muốn nếu có.
4. Organizer nhận proposal.

Kết quả mong đợi:

- Proposal ở trạng thái `Pending`.
- Organizer có thể accept/reject.
- Sponsor theo dõi proposal trong `Tài trợ của tôi`.

### Kịch bản 10.2 - Organizer mời sponsor tài trợ

Vai trò: Organizer, Sponsor.

Luồng:

1. Organizer vào quản lý event.
2. Mở tab `Tài trợ doanh nghiệp`.
3. Chọn sponsor hoặc nhập thông tin mời tài trợ.
4. Gửi lời mời.
5. Sponsor xem lời mời và accept/reject.

Kết quả mong đợi:

- Proposal thể hiện chiều `OrganizerRequest`.
- Sponsor quyết định có tài trợ hay không.
- Hai bên đều thấy trạng thái mới.

### Kịch bản 10.3 - Ghi nhận đã nhận tiền tài trợ

Vai trò: Organizer.

Luồng:

1. Proposal đã được accepted.
2. Sponsor chuyển tiền ngoài hệ thống.
3. Organizer vào proposal.
4. Nhập số tiền thực nhận.
5. Bấm ghi nhận đã nhận.

Kết quả mong đợi:

- Proposal chuyển sang `Received`.
- Số tiền thực nhận được tính vào báo cáo tài chính.
- Sponsor nhận thông báo số tiền đã được ghi nhận.

### Kịch bản 10.4 - Báo cáo sử dụng tài trợ doanh nghiệp

Vai trò: Organizer.

Luồng:

1. Sau khi sử dụng nguồn tài trợ, organizer nhập báo cáo.
2. Ghi rõ tiền dùng vào việc gì.
3. Gửi báo cáo.

Kết quả mong đợi:

- Proposal/case tài trợ chuyển sang trạng thái đã báo cáo.
- Admin export finance có dữ liệu.
- Sponsor có căn cứ theo dõi tác động tài trợ.

## 11. Event không có tài trợ hoặc không có quyên góp

### Kịch bản 11.1 - Event diễn ra không cần tiền

Vai trò: Organizer, Volunteer.

Luồng:

1. Organizer tạo event.
2. Không tạo campaign ủng hộ.
3. Không có sponsor proposal.
4. Volunteer vẫn đăng ký, được duyệt, điểm danh và nhận chứng chỉ.

Kết quả mong đợi:

- Event vẫn hoàn thành bình thường.
- Báo cáo tài chính có thể hiển thị 0 đồng hoặc không có dữ liệu tài chính.
- Không ảnh hưởng passport/certificate.

### Kịch bản 11.2 - Campaign có nhưng không ai ủng hộ

Vai trò: Organizer.

Luồng:

1. Organizer tạo campaign.
2. Không có donation nào.
3. Campaign hết hạn hoặc organizer đóng.

Kết quả mong đợi:

- Event vẫn có thể diễn ra.
- Campaign thể hiện 0 đồng.
- Organizer có thể hủy/đóng campaign theo rule.

## 12. Tình huống biên quan trọng

### Kịch bản 12.1 - Volunteer đăng ký khi event đã bắt đầu

Kết quả mong đợi:

- Hệ thống từ chối đăng ký mới.
- Nếu cần thêm người tại chỗ, organizer dùng walk-in.

### Kịch bản 12.2 - Event đã có ca nhưng volunteer gửi request không có shiftId

Kết quả mong đợi:

- Backend từ chối.
- Không tạo registration lỗi.

### Kịch bản 12.3 - Tạo ca sau khi có đăng ký

Kết quả mong đợi:

- UI không hiện nút `Chia ca`.
- Backend từ chối nếu gọi API trực tiếp.

### Kịch bản 12.4 - Donation số tiền âm hoặc quá lớn

Kết quả mong đợi:

- Backend từ chối.
- Không ảnh hưởng tổng tiền campaign.

### Kịch bản 12.5 - Sponsor hủy/rút proposal sau khi accepted

Kết quả mong đợi:

- Nếu tiền chưa nhận, proposal có thể bị cancel theo rule.
- Nếu đã received/reported, không nên cho hủy tùy tiện; cần admin hoặc báo cáo điều chỉnh.

### Kịch bản 12.6 - Organizer bị khóa tài khoản

Kết quả mong đợi:

- Các campaign/proposal active liên quan cần được xử lý/cảnh báo.
- Event đang approved cần admin quyết định hủy hoặc chuyển organizer.
- User bị khóa không nên tiếp tục thao tác bằng JWT cũ.

## 13. Luồng demo gợi ý

1. Admin đăng nhập, kiểm tra organizer đã verified.
2. Organizer tạo event không chia ca.
3. Admin duyệt event.
4. Volunteer đăng ký event.
5. Organizer xác nhận volunteer.
6. Organizer điểm danh volunteer.
7. Organizer hoàn thành event.
8. Volunteer xem passport/certificate.
9. Organizer tạo event thứ hai.
10. Organizer bấm `Chia ca`, tạo `Ca sáng` và `Ca chiều`.
11. Admin duyệt event thứ hai.
12. Volunteer đăng ký event thứ hai và bắt buộc chọn ca.
13. Organizer xác nhận volunteer theo ca.
14. Volunteer/organizer check-in đúng ca.
15. Organizer tạo campaign ủng hộ.
16. Volunteer ủng hộ tiền.
17. Organizer xác nhận donation và báo cáo sử dụng.
18. Sponsor gửi đề nghị tài trợ event.
19. Organizer accept, ghi nhận tiền đã nhận, gửi báo cáo tài trợ.
20. Admin xem export/monitoring/audit để tổng kết.

## 14. Tiêu chí đạt nghiệp vụ

- Tạo event không bắt organizer phải hiểu ca làm việc.
- Chỉ khi organizer chủ động bấm `Chia ca` thì event mới chuyển sang đăng ký theo ca.
- Volunteer không phải tự quay lại kiểm tra xem event có đổi sang chia ca hay không, vì hệ thống không cho bật chia ca sau khi đã có đăng ký.
- Event không có tài trợ vẫn chạy trọn vẹn.
- Tiền ủng hộ cá nhân và tài trợ doanh nghiệp tách biệt rõ.
- Mọi thay đổi trạng thái quan trọng đều có thông báo hoặc audit log tương ứng.
## 15. Tình huống quản trị bổ sung

Phần này cập nhật các tình huống thực tế sau khi bổ sung màn quản trị người dùng, sự kiện, danh mục, huy hiệu, xác minh và giám sát tài chính.

### Kịch bản 15.1 - Admin yêu cầu bổ sung KYC

1. Volunteer gửi hồ sơ KYC từ trang hồ sơ cá nhân.
2. Admin vào `/admin/volunteer-verifications`, mở tab KYC và xem hồ sơ.
3. Nếu thông tin chưa đủ, admin chọn `Yêu cầu bổ sung` và nhập lý do rõ ràng.
4. Hệ thống chuyển trạng thái KYC sang `ChangesRequested`, lưu ghi chú admin và gửi thông báo cho volunteer.
5. Volunteer cập nhật lại ảnh/thông tin KYC rồi gửi lại.
6. Hệ thống đưa hồ sơ về `PendingVerification` để admin duyệt lại.

Kỳ vọng: `ChangesRequested` không bị hiểu là từ chối vĩnh viễn. Volunteer vẫn có đường sửa và gửi lại.

### Kịch bản 15.2 - Admin yêu cầu bổ sung minh chứng kỹ năng

1. Volunteer thêm kỹ năng và gửi minh chứng.
2. Admin vào `/admin/volunteer-verifications`, mở tab kỹ năng.
3. Admin có ba lựa chọn: duyệt, từ chối, hoặc yêu cầu bổ sung.
4. Khi yêu cầu bổ sung, volunteer nhận thông báo và có thể gửi lại minh chứng từ hồ sơ cá nhân.
5. Organizer khi duyệt đăng ký event nhìn được kỹ năng nào là tự khai và kỹ năng nào đã xác minh.

Kỳ vọng: kỹ năng tự khai vẫn dùng để tham khảo, nhưng kỹ năng đã xác minh có độ tin cậy cao hơn khi organizer xét duyệt.

### Kịch bản 15.3 - Admin quản lý huy hiệu

1. Admin vào `/admin/badges`.
2. Admin tạo huy hiệu mới với tên, mô tả, icon và điều kiện nhận huy hiệu.
3. Admin sửa thông tin huy hiệu khi cần.
4. Nếu huy hiệu chưa cấp cho user nào, admin có thể xóa.
5. Nếu huy hiệu đã cấp, hệ thống chặn xóa để không làm mất lịch sử thành tích của volunteer.

Kỳ vọng: quản trị huy hiệu đủ thao tác thêm/sửa/xóa có điều kiện, nhưng không phá dữ liệu đã phát sinh.

### Kịch bản 15.4 - Admin giám sát tài chính

1. Admin vào `/admin/finance`.
2. Admin xem các donation đang chờ xác nhận quá lâu.
3. Admin xem campaign đã có tiền confirmed nhưng chưa báo cáo sau khi event kết thúc/hủy.
4. Admin xem các proposal tài trợ doanh nghiệp còn mở khi event đã qua.
5. Admin dùng thông tin này để nhắc organizer/sponsor xử lý, không sửa trực tiếp số tiền từ màn giám sát.

Kỳ vọng: màn finance là màn theo dõi và phát hiện việc cần xử lý, không phải màn chỉnh dữ liệu tài chính.

### Kịch bản 15.5 - Admin xóa cứng dữ liệu có điều kiện

1. Admin chỉ xóa cứng event khi event chưa có registration, campaign, sponsor, channel hoặc certificate.
2. Event đã phát sinh nghiệp vụ phải dùng hủy, hoàn thành, mở lại hoặc transfer organizer thay vì xóa.
3. Campaign có donation không xóa cứng; dùng close/cancel/report theo trạng thái.
4. Sponsorship proposal đã qua accepted/received không xóa cứng; dùng cancel/revert có lý do.
5. Audit log, monitoring và export chỉ xem/tải, không sửa/xóa trong UI demo.

Kỳ vọng: hệ thống giữ được lịch sử giao dịch và lịch sử tham gia để phục vụ báo cáo, chứng chỉ và kiểm toán.
## 16. Chốt nghiệp vụ lõi hiện tại

### 16.1. Tạo event và ca làm việc

1. Organizer tạo event với thông tin cơ bản, thời gian, địa điểm, kỹ năng, yêu cầu KYC nếu cần.
2. Organizer không phải tạo ca trong wizard tạo event.
3. Sau khi event được tạo, nếu chưa có ai đăng ký, organizer có thể vào quản lý event và bật `Chia ca`.
4. Khi đã bật chia ca, organizer tạo các ca nằm trong khoảng thời gian event.
5. Từ thời điểm event có ca, volunteer bắt buộc chọn ca khi đăng ký.
6. Nếu event đã có registration, hệ thống không cho bật chia ca để tránh volunteer phải quay lại kiểm tra và chọn lại.

### 16.2. Đăng ký và duyệt tham gia

1. Volunteer đăng ký event public đã `Approved`.
2. Nếu event yêu cầu KYC, volunteer chưa verified bị chặn.
3. Nếu event yêu cầu ca, volunteer phải chọn ca còn chỗ.
4. Organizer xem hồ sơ volunteer, kỹ năng tự khai/đã xác minh, KYC nếu event yêu cầu, rồi confirm/reject.
5. `CurrentParticipants` hiển thị số người đã `Confirmed`, không tính pending.

### 16.3. Điểm danh và tính giờ

1. Organizer hoặc volunteer thực hiện check-in tại hiện trường.
2. QR là phương thức chính; GPS chỉ hỗ trợ khi event không có QR hoặc theo fallback được cấu hình.
3. Nếu registration thuộc ca, check-in phải nằm trong cửa sổ ca.
4. Check-in chỉ ghi nhận thời điểm vào, chưa cộng full giờ.
5. Khi check-out, hệ thống tính giờ thực tế theo thời gian từ check-in đến check-out, giới hạn trong khung event/shift.
6. Organizer có thể bổ sung điểm danh hoặc điều chỉnh giờ sau event trong cửa sổ cho phép, có audit.

### 16.4. Hoàn thành event

1. Organizer/admin có thể hoàn thành event `Approved`.
2. Hệ thống cảnh báo nếu còn registration `Pending` hoặc request hủy chưa xử lý.
3. Nếu vẫn xác nhận hoàn thành, các registration chưa xử lý bị bỏ khỏi kết quả tham gia.
4. Chỉ volunteer đã attended và có giờ hợp lệ mới nhận certificate/passport hours/badge progress.
5. Không dùng số người tối thiểu như điều kiện cứng để chặn hoàn thành.

### 16.5. Ủng hộ cá nhân

1. Organizer chỉ tạo campaign khi event hợp lệ và chưa kết thúc/hủy.
2. Volunteer donate tiền vào campaign `Open`.
3. Organizer confirm/reject donation sau khi đối soát tiền ngoài hệ thống.
4. Chỉ donation `Confirmed` được tính vào tổng công khai.
5. Campaign có thể không có donation; event vẫn vận hành độc lập.

### 16.6. Tài trợ doanh nghiệp

1. Sponsor doanh nghiệp dùng proposal, không dùng donation cá nhân.
2. Sponsor có thể đề nghị tài trợ; organizer cũng có thể mời sponsor.
3. Bên nhận proposal accept/reject.
4. Organizer mark received khi thực nhận tiền, nhập số tiền thực nhận.
5. Organizer report việc sử dụng tài trợ.
6. Proposal đã received/reported không xóa cứng; điều chỉnh phải có lý do và audit.
