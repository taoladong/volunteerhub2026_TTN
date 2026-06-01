-- ============================================================
-- VolunteerHub Sample Data Seed Script (SQL Server)
-- Database: BaseCoreSales
-- ============================================================

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRY
  BEGIN TRANSACTION;

  -- ============================================================
  -- 1. EVENT CATEGORIES
  -- ============================================================
  SET IDENTITY_INSERT EventCategories ON;
  IF NOT EXISTS (SELECT 1 FROM EventCategories WHERE Id = 5)
      INSERT INTO EventCategories (Id, Name, Description, Icon) VALUES
      (5, N'Hiến máu', N'Hoạt động hiến máu nhân đạo',           N'droplet'),
      (6, N'Bảo tồn',  N'Bảo tồn thiên nhiên, đa dạng sinh học', N'leaf'),
      (7, N'Cộng đồng',N'Xây dựng và phát triển cộng đồng',      N'people-group');
  SET IDENTITY_INSERT EventCategories OFF;

  -- ============================================================
  -- 2. SKILLS
  -- ============================================================
  SET IDENTITY_INSERT Skills ON;
  IF NOT EXISTS (SELECT 1 FROM Skills WHERE Id = 8)
      INSERT INTO Skills (Id, Name, Category) VALUES
      (8,  N'Sơ cứu',           N'Y tế'),
      (9,  N'Nhiếp ảnh',         N'Sáng tạo'),
      (10, N'Tổ chức sự kiện',  N'Vận hành');
  SET IDENTITY_INSERT Skills OFF;

  -- ============================================================
  -- 3. BADGES
  -- ============================================================
  SET IDENTITY_INSERT Badges ON;
  IF NOT EXISTS (SELECT 1 FROM Badges WHERE Id = 4)
      INSERT INTO Badges (Id, Name, Description, IconUrl, Condition) VALUES
      (4, N'Người tiên phong',   N'Đăng ký tình nguyện trước 7 ngày sự kiện', N'', N'{"early_bird":true}'),
      (5, N'Ngôi sao cộng đồng', N'Được đánh giá 5 sao bởi 3 ban tổ chức',   N'', N'{"min_5star":3}'),
      (6, N'Đại thụ xanh',       N'Tham gia 3 sự kiện trồng cây',             N'', N'{"category":1,"min_events":3}');
  SET IDENTITY_INSERT Badges OFF;

  -- ============================================================
  -- 4. EVENTS (ID 4 – 13)
  -- ============================================================
  -- Events 1-3: EF-baseline events (kept by reset; only insert if wiped entirely)
  IF NOT EXISTS (SELECT 1 FROM Events WHERE Id = 1)
  BEGIN
      SET IDENTITY_INSERT Events ON;
      INSERT INTO Events
          (Id, Title, Description, Location, Latitude, Longitude,
           StartDate, EndDate, MaxParticipants, CurrentParticipants,
           Status, CategoryId, OrganizerId, ImageUrl, QrCode, RequiredSkillIds, CreatedAt)
      VALUES
      (1,  N'Trồng cây xanh Hà Nội 2026',
           N'Chiến dịch trồng 1000 cây xanh tại các tuyến phố Hà Nội nhằm cải thiện môi trường và chất lượng không khí.',
           N'Hà Nội', 21.0285, 105.8542,
           '2026-08-15 07:00:00', '2026-08-15 17:00:00', 50, 0, N'Pending', 1, 2,
           N'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
           N'', N'[4]', '2026-07-01'),
      (2,  N'Dọn sạch bãi biển Đà Nẵng',
           N'Vệ sinh bãi biển Mỹ Khê và tuyên truyền bảo vệ môi trường biển.',
           N'Đà Nẵng', 16.0544, 108.2022,
           '2026-09-05 06:00:00', '2026-09-05 12:00:00', 100, 0, N'Approved', 2, 2,
           N'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
           N'EVT-2026-0002', N'[]', '2026-07-10'),
      (3,  N'Dạy kỹ năng số cho người cao tuổi',
           N'Hướng dẫn người cao tuổi sử dụng điện thoại thông minh và internet tại TP.HCM.',
           N'TP. Hồ Chí Minh', 10.8231, 106.6297,
           '2025-06-01 08:00:00', '2025-06-30 17:00:00', 30, 0, N'Completed', 4, 2,
           N'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=800',
           N'EVT-2025-0003', N'[3,6]', '2025-05-01');
      SET IDENTITY_INSERT Events OFF;
  END

  -- Events 4-13: seed events (deleted by reset each run)
  IF NOT EXISTS (SELECT 1 FROM Events WHERE Id = 4)
  BEGIN
      SET IDENTITY_INSERT Events ON;
      INSERT INTO Events
          (Id, Title, Description, Location, Latitude, Longitude,
           StartDate, EndDate, MaxParticipants, CurrentParticipants,
           Status, CategoryId, OrganizerId, ImageUrl, QrCode, RequiredSkillIds, CreatedAt)
      VALUES
      (4,  N'Từ thiện trẻ em vùng cao Hà Giang',
           N'Mang sách vở, quần áo và nhu yếu phẩm đến với các em học sinh nghèo tại huyện Đồng Văn, Hà Giang.',
           N'Đồng Văn, Hà Giang', 23.2740, 105.3670,
           '2026-10-12 06:00:00', '2026-10-13 20:00:00', 60, 0, N'Approved', 3, 2,
           N'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
           N'EVT-2026-0004', N'[]', '2026-08-01'),

      (5,  N'Hiến máu nhân đạo Đà Nẵng – Mùa hè 2026',
           N'Ngày hội hiến máu tình nguyện tại Cung thể thao Tiên Sơn. Mỗi lần hiến máu có thể cứu sống 3 người.',
           N'Cung thể thao Tiên Sơn, Đà Nẵng', 16.0692, 108.2209,
           '2026-09-20 07:00:00', '2026-09-20 17:00:00', 200, 0, N'Approved', 5, 2,
           N'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
           N'EVT-2026-0005', N'[8]', '2026-08-05'),

      (6,  N'Phục hồi rừng ngập mặn Cà Mau',
           N'Trồng và chăm sóc cây đước tại khu bảo tồn rừng ngập mặn Mũi Cà Mau.',
           N'Vườn Quốc gia Mũi Cà Mau, Cà Mau', 8.5990, 104.7279,
           '2026-11-02 06:00:00', '2026-11-02 18:00:00', 80, 0, N'Approved', 6, 2,
           N'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
           N'EVT-2026-0006', N'[4]', '2026-08-10'),

      (7,  N'Dọn rác công viên Tao Đàn – TP.HCM',
           N'Hoạt động dọn vệ sinh và trồng hoa tại công viên Tao Đàn, kết hợp tuyên truyền ý thức môi trường.',
           N'Công viên Tao Đàn, Quận 1, TP.HCM', 10.7749, 106.6950,
           '2026-09-28 06:30:00', '2026-09-28 11:00:00', 40, 0, N'Approved', 2, 2,
           N'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
           N'EVT-2026-0007', N'[]', '2026-08-12'),

      (8,  N'Tiếng Anh miễn phí cho thanh niên nông thôn',
           N'Lớp học tiếng Anh giao tiếp cơ bản dành cho thanh niên 15–25 tuổi tại huyện Củ Chi.',
           N'Huyện Củ Chi, TP.HCM', 11.0046, 106.5028,
           '2026-10-05 08:00:00', '2026-12-28 11:00:00', 30, 0, N'Approved', 4, 2,
           N'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
           N'EVT-2026-0008', N'[2,6]', '2026-08-15'),

      (9,  N'Ngày hội hiến sách – Thư viện cho em',
           N'Quyên góp sách giáo khoa, truyện và tài liệu học tập để xây dựng tủ sách cộng đồng ở Bình Phước.',
           N'Bình Phước', 11.7512, 106.7235,
           '2026-10-18 08:00:00', '2026-10-18 16:00:00', 50, 0, N'Approved', 3, 2,
           N'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
           N'EVT-2026-0009', N'[]', '2026-08-20'),

      (10, N'Sơn lại trường làng Quảng Nam',
           N'Cùng sơn sửa lại các phòng học, vẽ tranh tường tại trường Tiểu học Phước Hà, Quảng Nam.',
           N'Tiên Phước, Quảng Nam', 15.4589, 108.3118,
           '2026-11-15 07:00:00', '2026-11-16 17:00:00', 35, 0, N'Pending', 3, 2,
           N'https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800',
           N'', N'[]', '2026-09-01'),

      (11, N'Làm sạch sông Sài Gòn – Đoạn Thủ Đức',
           N'Thu gom rác thải trên mặt sông và hai bờ kênh rạch khu vực phường Linh Đông, TP. Thủ Đức.',
           N'Phường Linh Đông, TP. Thủ Đức, TP.HCM', 10.8410, 106.7563,
           '2026-12-07 06:00:00', '2026-12-07 12:00:00', 70, 0, N'Pending', 2, 2,
           N'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800',
           N'', N'[]', '2026-09-05'),

      (12, N'Tết thiếu nhi vùng khó 2025',
           N'Tổ chức Tết thiếu nhi cho 200 em nhỏ tại các gia đình hoàn cảnh khó khăn: vui chơi, quà tặng, khám bệnh.',
           N'Long An', 10.5438, 106.4105,
           '2025-05-31 08:00:00', '2025-05-31 17:00:00', 45, 0, N'Completed', 3, 2,
           N'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800',
           N'EVT-2025-0012', N'[4,5]', '2025-04-01'),

      (13, N'Trồng cây trên đảo Lý Sơn',
           N'Chiến dịch trồng cây phủ xanh đất trống trên đảo Lý Sơn kết hợp dọn rác bãi biển.',
           N'Đảo Lý Sơn, Quảng Ngãi', 15.3784, 109.1189,
           '2025-04-22 06:00:00', '2025-04-23 18:00:00', 55, 0, N'Completed', 1, 2,
           N'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800',
           N'EVT-2025-0013', N'[4,5]', '2025-03-01');
      SET IDENTITY_INSERT Events OFF;
  END

  -- ============================================================
  -- 5. WORK SHIFTS
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM WorkShifts WHERE EventId = 4)
  BEGIN
      SET IDENTITY_INSERT WorkShifts ON;
      INSERT INTO WorkShifts (Id, EventId, Name, StartTime, EndTime, MaxVolunteers, RequiredSkillId) VALUES
      (1, 4,  N'Ca vận chuyển hàng hóa',    '2026-10-12 06:00:00', '2026-10-12 10:00:00', 20, 4),
      (2, 4,  N'Ca phân phát quà tặng',      '2026-10-12 10:00:00', '2026-10-12 14:00:00', 20, NULL),
      (3, 4,  N'Ca tổng kết & dọn dẹp',      '2026-10-12 14:00:00', '2026-10-13 18:00:00', 15, NULL),
      (4, 5,  N'Ca sáng – Đội hỗ trợ y tế', '2026-09-20 07:00:00', '2026-09-20 12:00:00', 50, 8),
      (5, 5,  N'Ca chiều – Đội hỗ trợ y tế','2026-09-20 12:00:00', '2026-09-20 17:00:00', 50, 8),
      (6, 6,  N'Ca trồng cây buổi sáng',     '2026-11-02 06:00:00', '2026-11-02 12:00:00', 40, 4),
      (7, 6,  N'Ca chăm sóc cây buổi chiều', '2026-11-02 12:00:00', '2026-11-02 18:00:00', 40, 4);
      SET IDENTITY_INSERT WorkShifts OFF;
  END

  -- ============================================================
  -- 6. CHANNELS
  -- ============================================================
  -- Channels 1-2 are EF-baseline (events 2-3) and get wiped by the reset; re-seed them.
  IF NOT EXISTS (SELECT 1 FROM Channels WHERE Id = 1)
  BEGIN
      SET IDENTITY_INSERT Channels ON;
      INSERT INTO Channels (Id, EventId, Name, CreatedAt, IsActive) VALUES
      (1,  2,  N'Kênh trao đổi - Dọn sạch bãi biển Đà Nẵng',        '2025-07-11', 1),
      (2,  3,  N'Kênh trao đổi - Dạy kỹ năng số cho người cao tuổi', '2025-05-02', 1);
      SET IDENTITY_INSERT Channels OFF;
  END

  IF NOT EXISTS (SELECT 1 FROM Channels WHERE EventId = 4)
  BEGIN
      SET IDENTITY_INSERT Channels ON;
      INSERT INTO Channels (Id, EventId, Name, CreatedAt, IsActive) VALUES
      (3,  4,  N'Kênh – Từ thiện trẻ em vùng cao Hà Giang', '2025-08-01', 1),
      (4,  5,  N'Kênh – Hiến máu nhân đạo Đà Nẵng',         '2025-08-05', 1),
      (5,  6,  N'Kênh – Phục hồi rừng ngập mặn Cà Mau',     '2025-08-10', 1),
      (6,  7,  N'Kênh – Dọn rác công viên Tao Đàn',          '2025-08-12', 1),
      (7,  8,  N'Kênh – Tiếng Anh miễn phí Củ Chi',          '2025-08-15', 1),
      (8,  9,  N'Kênh – Ngày hội hiến sách',                  '2025-08-20', 1),
      (9,  12, N'Kênh – Tết thiếu nhi vùng khó 2025',        '2025-04-01', 1),
      (10, 13, N'Kênh – Trồng cây đảo Lý Sơn',               '2025-03-01', 1);
      SET IDENTITY_INSERT Channels OFF;
  END

  -- ============================================================
  -- 7. POSTS (thêm LikeCount và UpdatedAt)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM Posts WHERE ChannelId = 1)
  BEGIN
      SET IDENTITY_INSERT Posts ON;
      INSERT INTO Posts (Id, ChannelId, AuthorId, Content, ImageUrl, LikeCount, CreatedAt, UpdatedAt) VALUES
      (1,  1, 2, N'Chào mừng mọi người đến với kênh sự kiện Dọn sạch bãi biển Đà Nẵng! Hãy chuẩn bị tinh thần nhé!', N'', 3, '2025-07-11 09:00:00', '2025-07-11 09:00:00'),
      (2,  1, 4, N'Mình đã đăng ký rồi! Mình có thể mang thêm găng tay và túi đựng rác cho mọi người không?',          N'', 1, '2025-07-12 10:30:00', '2025-07-12 10:30:00'),
      (3,  1, 2, N'Cảm ơn bạn! Ban tổ chức sẽ chuẩn bị đủ dụng cụ. Mọi người chỉ cần mang theo tinh thần là được!',   N'', 2, '2025-07-12 11:00:00', '2025-07-12 11:00:00'),
      (4,  3, 2, N'Chúng ta sẽ khởi hành từ Hà Nội lúc 5h sáng ngày 12/10. Ai cần thông tin xe chung nhắn ban tổ chức!', N'', 5, '2025-08-02 08:00:00', '2025-08-02 08:00:00'),
      (5,  3, 2, N'Đồ cần chuẩn bị: quần áo ấm, giày chắc chắn, thuốc cá nhân. Chuyến đi sẽ rất đáng nhớ!',           N'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600', 8, '2025-08-03 09:00:00', '2025-08-03 09:00:00'),
      (6,  4, 2, N'Nhắc nhở: trước khi hiến máu 24h hãy ngủ đủ giấc, không uống rượu bia, ăn uống đầy đủ.',            N'', 4, '2025-09-19 08:00:00', '2025-09-19 08:00:00'),
      (7,  4, 2, N'Điểm tập kết tại cổng chính Cung thể thao Tiên Sơn. Ban tổ chức phát số thứ tự từ 7h sáng.',         N'', 6, '2025-09-19 10:00:00', '2025-09-19 10:00:00'),
      (8,  5, 2, N'Rừng ngập mặn Cà Mau là khu bảo tồn sinh quyển thế giới, hệ sinh thái vô cùng quý giá!',             N'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600', 7, '2025-08-11 09:00:00', '2025-08-11 09:00:00'),
      (9,  9, 2, N'Tết thiếu nhi thành công! 200 em nhỏ đã được nhận quà. Cảm ơn 32 tình nguyện viên đã tham gia!',     N'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600', 15, '2025-06-01 20:00:00', '2025-06-01 20:00:00'),
      (10, 9, 4, N'Lần đầu tham gia từ thiện, cảm xúc rất khó tả khi thấy các em vui. Hẹn gặp ở sự kiện tiếp theo!',   N'', 9,  '2025-06-02 08:00:00', '2025-06-02 08:00:00'),
      (11,10, 2, N'Lý Sơn kết thúc đẹp! 48 tình nguyện viên trồng 1.200 cây và thu 2 tấn rác bãi biển. Tuyệt vời!',     N'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600', 20, '2025-04-23 21:00:00', '2025-04-23 21:00:00');
      SET IDENTITY_INSERT Posts OFF;
  END

  -- ============================================================
  -- 8. REGISTRATIONS
  -- ============================================================
  -- EF-baseline registrations (for events 2-3) also wiped by reset; restore them.
  IF NOT EXISTS (SELECT 1 FROM Registrations WHERE Id = 1)
  BEGIN
      SET IDENTITY_INSERT Registrations ON;
      INSERT INTO Registrations
          (Id, EventId, UserId, Status, Note, RegisteredAt, ConfirmedAt, IsAttended, AttendedAt, VolunteerHours, ShiftId)
      VALUES
      (1, 2, 4, N'Confirmed', NULL, '2025-07-12', '2025-07-13', 0, NULL, 0, NULL),
      (2, 3, 4, N'Confirmed', NULL, '2025-05-05', '2025-05-06', 1, '2025-06-01 08:00:00', 8, NULL);
      SET IDENTITY_INSERT Registrations OFF;
  END

  IF NOT EXISTS (SELECT 1 FROM Registrations WHERE Id = 3)
  BEGIN
      SET IDENTITY_INSERT Registrations ON;
      INSERT INTO Registrations
          (Id, EventId, UserId, Status, Note, RegisteredAt, ConfirmedAt, IsAttended, AttendedAt, VolunteerHours, ShiftId)
      VALUES
      (3, 4,  4, N'Confirmed', N'Mình muốn giúp đỡ các em nhỏ vùng cao', '2025-08-05', '2025-08-06', 0, NULL, 0, NULL),
      (4, 5,  4, N'Confirmed', N'', '2025-08-10', '2025-08-11', 0, NULL, 0, 4),
      (5, 6,  4, N'Pending',   N'Rất muốn trải nghiệm trồng cây rừng ngập mặn', '2025-09-01', NULL, 0, NULL, 0, NULL),
      (6, 7,  4, N'Confirmed', N'', '2025-08-20', '2025-08-21', 0, NULL, 0, NULL),
      (7, 12, 4, N'Confirmed', N'', '2025-04-05', '2025-04-06', 1, '2025-05-31 08:00:00', 8,  NULL),
      (8, 13, 4, N'Confirmed', N'', '2025-03-05', '2025-03-06', 1, '2025-04-22 06:00:00', 12, NULL);
      SET IDENTITY_INSERT Registrations OFF;
  END

  -- ============================================================
  -- 9. CẬP NHẬT CurrentParticipants
  -- ============================================================
  UPDATE Events SET CurrentParticipants =
      (SELECT COUNT(*) FROM Registrations WHERE EventId = Events.Id AND Status IN (N'Confirmed', N'Pending'))
  WHERE Id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);

  -- ============================================================
  -- 10. CERTIFICATES
  -- ============================================================
  -- EF-baseline cert 1 (event 3) is also wiped by reset; restore it.
  IF NOT EXISTS (SELECT 1 FROM Certificates WHERE Id = 1)
  BEGIN
      SET IDENTITY_INSERT Certificates ON;
      INSERT INTO Certificates (Id, UserId, EventId, CertificateCode, IssuedAt, VolunteerHours, PdfUrl) VALUES
      (1, 4, 3, N'CERT-2025-0001', '2025-07-01', 8, N'');
      SET IDENTITY_INSERT Certificates OFF;
  END

  IF NOT EXISTS (SELECT 1 FROM Certificates WHERE Id = 2)
  BEGIN
      SET IDENTITY_INSERT Certificates ON;
      INSERT INTO Certificates (Id, UserId, EventId, CertificateCode, IssuedAt, VolunteerHours, PdfUrl) VALUES
      (2, 4, 12, N'CERT-2025-0002', '2025-06-15', 8,  N''),
      (3, 4, 13, N'CERT-2025-0003', '2025-05-01', 12, N'');
      SET IDENTITY_INSERT Certificates OFF;
  END

  -- ============================================================
  -- 11. VOLUNTEER PROFILE – cập nhật tổng giờ
  -- ============================================================
  UPDATE VolunteerProfiles
  SET TotalVolunteerHours = (
      SELECT ISNULL(SUM(r.VolunteerHours), 0)
      FROM Registrations r
      WHERE r.UserId = VolunteerProfiles.UserId AND r.IsAttended = 1
  )
  WHERE UserId = 4;

  -- ============================================================
  -- 12. USER BADGES
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM UserBadges WHERE UserId = 4 AND BadgeId = 1)
  BEGIN
      SET IDENTITY_INSERT UserBadges ON;
      INSERT INTO UserBadges (Id, UserId, BadgeId, AwardedAt) VALUES
      (1, 4, 1, '2025-06-01'),
      (2, 4, 6, '2025-05-01');
      SET IDENTITY_INSERT UserBadges OFF;
  END

  -- ============================================================
  -- 13. VOLUNTEER SKILLS
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM VolunteerSkills WHERE UserId = 4)
  BEGIN
      SET IDENTITY_INSERT VolunteerSkills ON;
      INSERT INTO VolunteerSkills (Id, UserId, SkillId, Level) VALUES
      (1, 4, 4, N'Trung cấp'),
      (2, 4, 6, N'Thành thạo'),
      (3, 4, 9, N'Cơ bản');
      SET IDENTITY_INSERT VolunteerSkills OFF;
  END

  -- ============================================================
  -- 14. NOTIFICATIONS
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM Notifications WHERE UserId = 4)
  BEGIN
      SET IDENTITY_INSERT Notifications ON;
      INSERT INTO Notifications (Id, UserId, Title, Message, Type, IsRead, CreatedAt) VALUES
      (1, 4, N'Đăng ký thành công',    N'Bạn đã đăng ký sự kiện "Dọn sạch bãi biển Đà Nẵng".',          N'Registration', 1, '2025-07-12 10:31:00'),
      (2, 4, N'Đăng ký được xác nhận', N'Ban tổ chức đã xác nhận đăng ký cho sự kiện "Dọn sạch bãi biển".', N'Registration', 1, '2025-07-13 09:00:00'),
      (3, 4, N'Chứng chỉ đã được cấp', N'Bạn nhận chứng chỉ tình nguyện cho sự kiện "Tết thiếu nhi vùng khó".', N'Certificate', 1, '2025-06-15 08:00:00'),
      (4, 4, N'Huy hiệu mới!',          N'Bạn đạt huy hiệu "Chiến sĩ xanh" – Tham gia sự kiện đầu tiên.',   N'Badge',        1, '2025-06-01 20:00:00'),
      (5, 4, N'Sự kiện sắp diễn ra',   N'Sự kiện "Từ thiện Hà Giang" sẽ diễn ra sau 7 ngày.',              N'Reminder',     0, '2025-10-05 08:00:00'),
      (6, 4, N'Đăng ký được xác nhận', N'Ban tổ chức đã xác nhận tham gia sự kiện "Từ thiện Hà Giang".',   N'Registration', 0, '2025-08-06 09:00:00');
      SET IDENTITY_INSERT Notifications OFF;
  END

  -- Reset identity counters so new inserts don't collide with seeded IDs
  DBCC CHECKIDENT ('EventCategories', RESEED, 7);
  DBCC CHECKIDENT ('Skills',          RESEED, 10);
  DBCC CHECKIDENT ('Badges',          RESEED, 6);
  DBCC CHECKIDENT ('Events',          RESEED, 13);
  DBCC CHECKIDENT ('WorkShifts',      RESEED, 7);
  DBCC CHECKIDENT ('Channels',        RESEED, 10);
  DBCC CHECKIDENT ('Posts',           RESEED, 11);
  DBCC CHECKIDENT ('Registrations',   RESEED, 8);
  DBCC CHECKIDENT ('Certificates',    RESEED, 3);
  DBCC CHECKIDENT ('UserBadges',      RESEED, 2);
  DBCC CHECKIDENT ('VolunteerSkills', RESEED, 3);
  DBCC CHECKIDENT ('Notifications',   RESEED, 6);

  COMMIT TRANSACTION;
  PRINT N'Seed data thanh cong!';
  PRINT N'  + 13 events (ID 1-13)';
  PRINT N'  + 7 work shifts';
  PRINT N'  + 10 channels (ID 1-10)';
  PRINT N'  + 11 posts';
  PRINT N'  + 8 registrations (ID 1-8)';
  PRINT N'  + 3 certificates (ID 1-3)';
  PRINT N'  + 2 user badges';
  PRINT N'  + 3 volunteer skills';
  PRINT N'  + 6 notifications';

END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  PRINT N'LOI: ' + ERROR_MESSAGE() + N' (Line ' + CAST(ERROR_LINE() AS NVARCHAR) + N')';
END CATCH
