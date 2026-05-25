# Repo-wide Agent Skill

File này là hướng dẫn chung cho mọi agent làm việc trong repository. Áp dụng cho toàn bộ dự án, không chỉ riêng `AuthService`.

Mỗi lần nhận yêu cầu, agent phải đi theo chu trình:

```text
Spec -> Plan -> Build -> Test -> Review -> Simplify -> Ship
```

## 1. Spec

Trước khi làm, agent phải hiểu rõ yêu cầu.

Agent cần xác định:

- Mục tiêu cuối cùng của yêu cầu.
- Phạm vi cần làm.
- Phạm vi không làm.
- File/module/service bị ảnh hưởng.
- Output mong muốn: code, tài liệu, cấu hình, test, migration, hoặc hướng dẫn chạy.
- Ràng buộc của user, ví dụ: không tạo báo cáo, không tạo biên bản, không push, không commit.

Nếu yêu cầu mơ hồ nhưng có thể tự kiểm tra bằng repo, agent phải đọc code/tài liệu trước khi hỏi lại user.

Chỉ hỏi user khi:

- Có nhiều cách làm khác nhau và chọn sai sẽ gây lệch hướng.
- Cần thông tin không thể suy ra từ repo.
- Thay đổi có nguy cơ phá schema, public API, dữ liệu, lịch sử git hoặc workflow của nhóm.

## 2. Plan

Trước khi sửa file, agent phải lập kế hoạch ngắn.

Plan cần có:

- Việc sẽ làm.
- File dự kiến thêm/sửa/xóa.
- API/schema/config có bị ảnh hưởng không.
- Test hoặc verification sẽ chạy.
- Rủi ro chính nếu có.

Với task nhỏ, plan có thể là 2-5 dòng. Với task lớn, chia thành checklist rõ ràng.

Không bắt đầu build/code khi chưa kiểm tra ít nhất:

```powershell
git status --short
```

## 3. Build

Khi thực hiện thay đổi:

- Giữ diff nhỏ và đúng phạm vi.
- Ưu tiên pattern hiện có trong repo.
- Không refactor lan rộng nếu user không yêu cầu.
- Không xóa hoặc revert thay đổi không do agent tạo.
- Không tạo file biên bản, báo cáo, slide hoặc tài liệu nộp bài nếu user không yêu cầu rõ.
- Không commit, stage, push hoặc tạo PR nếu user không yêu cầu rõ.
- Không đổi public API, schema database, migration, package reference hoặc config contract nếu chưa được nêu trong yêu cầu.

Nếu task là documentation:

- Viết trực tiếp vào đúng file tài liệu kỹ thuật.
- Không tạo thêm file phụ không cần thiết.
- Tránh lặp lại nội dung giữa nhiều file.

Nếu task là code:

- Sửa đúng module/service liên quan.
- Đặt tên class, method, route, DTO theo convention hiện có.
- Tách logic vừa đủ, không over-engineer.
- Thêm comment chỉ khi logic khó hiểu.

## 4. Test

Sau khi làm, agent phải verify phù hợp với loại thay đổi.

Documentation-only:

- Đọc lại file đã sửa.
- Chạy `git status --short`.

.NET backend:

```powershell
dotnet build <ProjectName>.csproj --no-restore -p:UseAppHost=false
```

Frontend:

```powershell
npm run build
```

Nếu có test project hoặc script test sẵn, chạy test liên quan.

Nếu không thể chạy test, agent phải nói rõ lý do và rủi ro còn lại.

## 5. Review

Trước khi kết thúc, agent phải tự review thay đổi.

Checklist review:

- Có đúng yêu cầu user không.
- Có tạo file ngoài phạm vi không.
- Có vô tình sửa code/schema/config không.
- Có giữ naming và structure nhất quán không.
- Có xóa hoặc đụng file không liên quan không.
- Có còn file biên bản/báo cáo ngoài ý muốn không nếu user đã cấm.
- `git status --short` có đúng với phạm vi mong đợi không.

Nếu phát hiện thay đổi ngoài phạm vi do agent tạo, agent phải tự sửa lại trước khi trả lời.

## 6. Simplify

Trước khi ship, agent phải đơn giản hóa kết quả.

Nguyên tắc:

- Giữ số file ít nhất có thể.
- Gộp nội dung trùng lặp.
- Xóa phần mô tả dài dòng không giúp triển khai.
- Không tạo abstraction khi chưa cần.
- Không thêm dependency nếu có cách dùng thư viện/pattern hiện có.
- Với tài liệu, ưu tiên checklist, bảng contract và tiêu chí hoàn thành.

## 7. Ship

Khi hoàn thành, agent trả lời ngắn gọn:

- Đã thêm/sửa/xóa gì.
- File liên quan.
- Verification đã chạy.
- Việc gì chưa làm và vì sao nếu có.
- Trạng thái git quan trọng nếu có file ignored/untracked.

Không nói đã commit/push nếu chưa thực hiện.

## Default behavior

Nếu user không nói rõ:

- Không stage.
- Không commit.
- Không push.
- Không tạo PR.
- Không tạo báo cáo hoặc biên bản.
- Không tự mở rộng scope sang service khác.
- Ưu tiên hoàn thành đúng phần user giao trước.

## Git safety

Agent phải coi working tree là tài sản chung của user.

- Không dùng `git reset --hard`.
- Không dùng `git checkout -- <file>` để xóa thay đổi nếu user chưa yêu cầu.
- Không revert file có thay đổi không do agent tạo.
- Nếu thấy file ignored nhưng user muốn dùng để push, báo rõ để user quyết định có sửa ignore/exclude không.

## Quality bar

Một task được coi là xong khi:

- Output đáp ứng yêu cầu.
- Repo không có thay đổi ngoài phạm vi do agent tạo.
- Verification phù hợp đã chạy hoặc được giải thích rõ nếu không chạy.
- Final reply đủ ngắn để user biết chính xác mình nhận được gì.
