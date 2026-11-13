-- Demo content for one province. Every entry has at least one traceable source.
INSERT INTO culture_sources (title, author, publisher, source_type, url, published_year) VALUES
 ('Central Sector of the Imperial Citadel of Thang Long - Hanoi', NULL, 'UNESCO World Heritage Centre',
  'UNESCO', 'https://whc.unesco.org/en/list/1328', 2010),
 ('Giong festival of Phu Dong and Soc temples', NULL, 'UNESCO Intangible Cultural Heritage',
  'UNESCO', 'https://ich.unesco.org/en/RL/giong-festival-of-phu-djong-and-soc-temples-00443', 2010),
 ('Đại Việt sử ký toàn thư', 'Ngô Sĩ Liên và các sử thần triều Lê', 'NXB Khoa học Xã hội', 'BOOK', NULL, 1998),
 ('Lĩnh Nam chích quái', 'Trần Thế Pháp (biên soạn)', NULL, 'BOOK', NULL, NULL),
 ('Quyết định số 2328/QĐ-BVHTTDL đưa Phở Hà Nội vào Danh mục Di sản văn hóa phi vật thể quốc gia',
  NULL, 'Bộ Văn hóa, Thể thao và Du lịch', 'GOV_DOCUMENT', NULL, 2024);

INSERT INTO province_culture_profiles (province_slug, overview) VALUES
 ('ha-noi', 'Thăng Long – Hà Nội là kinh đô của nhiều triều đại từ năm 1010, hội tụ di sản cung đình, '
         || 'lễ hội làng và văn hóa ẩm thực đô thị.');

INSERT INTO culture_entries (slug, province_slug, entry_type, category, name, summary, description,
                             verification_status, historical_period, latitude, longitude, featured) VALUES
 ('hoang-thanh-thang-long', 'ha-noi', 'HERITAGE', 'TANGIBLE', 'Khu trung tâm Hoàng thành Thăng Long',
  'Di sản Văn hóa Thế giới UNESCO (2010)',
  'Quần thể di tích gắn với kinh thành Thăng Long qua nhiều thời kỳ, được UNESCO ghi danh năm 2010.',
  'VERIFIED', 'Thế kỷ 7 – 19', 21.0341, 105.8400, TRUE),
 ('hoi-giong-phu-dong-soc', 'ha-noi', 'HERITAGE', 'INTANGIBLE', 'Hội Gióng đền Phù Đổng và đền Sóc',
  'Di sản phi vật thể đại diện của nhân loại (2010)',
  'Lễ hội tưởng nhớ Thánh Gióng, được UNESCO ghi danh vào Danh sách Di sản văn hóa phi vật thể đại diện của nhân loại.',
  'VERIFIED', NULL, NULL, NULL, TRUE),
 ('le-hoi-giong-phu-dong', 'ha-noi', 'FESTIVAL', NULL, 'Lễ hội Gióng Phù Đổng',
  'Diễn ra mùng 9 tháng 4 âm lịch tại đền Phù Đổng',
  'Lễ hội tái hiện truyền thuyết Thánh Gióng đánh giặc Ân với nghi thức rước và diễn xướng dân gian.',
  'VERIFIED', NULL, 21.0560, 105.9540, FALSE),
 ('ly-thai-to', 'ha-noi', 'FIGURE', NULL, 'Lý Thái Tổ (Lý Công Uẩn)',
  'Vị vua dời đô về Thăng Long năm 1010',
  'Người sáng lập nhà Lý, ban Chiếu dời đô từ Hoa Lư ra thành Đại La, đổi tên là Thăng Long.',
  'VERIFIED', 'Nhà Lý (1009 – 1028)', NULL, NULL, TRUE),
 ('thanh-giong', 'ha-noi', 'FIGURE', NULL, 'Thánh Gióng',
  'Nhân vật truyền thuyết thời Hùng Vương',
  'Theo truyền thuyết, cậu bé làng Phù Đổng lớn vụt lên, cưỡi ngựa sắt đánh tan giặc Ân rồi bay về trời.',
  'LEGEND', 'Thời Hùng Vương (truyền thuyết)', NULL, NULL, TRUE),
 ('ho-hoan-kiem', 'ha-noi', 'PLACE', NULL, 'Hồ Hoàn Kiếm',
  'Hồ nước trung tâm Hà Nội, gắn với sự tích trả gươm',
  'Hồ nằm ở trung tâm quận Hoàn Kiếm, nơi có đền Ngọc Sơn và tháp Rùa.',
  'VERIFIED', NULL, 21.0287, 105.8524, TRUE),
 ('su-tich-tra-guom', 'ha-noi', 'HERITAGE', 'INTANGIBLE', 'Sự tích trả gươm hồ Hoàn Kiếm',
  'Truyền thuyết Lê Lợi trả gươm cho Rùa Thần',
  'Truyền thuyết kể rằng sau khi đánh thắng quân Minh, vua Lê Lợi trả gươm báu cho Rùa Vàng tại hồ Tả Vọng.',
  'LEGEND', 'Thế kỷ 15 (truyền thuyết)', NULL, NULL, FALSE),
 ('pho-ha-noi', 'ha-noi', 'CUISINE', NULL, 'Phở Hà Nội',
  'Di sản văn hóa phi vật thể quốc gia',
  'Món ăn gồm bánh phở, nước dùng hầm xương và thịt bò hoặc gà, là biểu tượng ẩm thực của Hà Nội.',
  'VERIFIED', 'Đầu thế kỷ 20', NULL, NULL, TRUE);

-- Link entries to sources by natural keys (slug/title), not by guessed ids.
INSERT INTO culture_entry_sources (entry_id, source_id, citation_note)
SELECT e.id, s.id, x.note
FROM (VALUES
  ('hoang-thanh-thang-long', 'Central Sector of the Imperial Citadel of Thang Long - Hanoi', 'Mục mô tả di sản'),
  ('hoi-giong-phu-dong-soc', 'Giong festival of Phu Dong and Soc temples', NULL),
  ('le-hoi-giong-phu-dong',  'Giong festival of Phu Dong and Soc temples', NULL),
  ('ly-thai-to',             'Đại Việt sử ký toàn thư', 'Bản kỷ, Kỷ nhà Lý'),
  ('thanh-giong',            'Lĩnh Nam chích quái', 'Truyện Đổng Thiên Vương'),
  ('su-tich-tra-guom',       'Lĩnh Nam chích quái', NULL),
  ('ho-hoan-kiem',           'Đại Việt sử ký toàn thư', NULL),
  ('pho-ha-noi',             'Quyết định số 2328/QĐ-BVHTTDL đưa Phở Hà Nội vào Danh mục Di sản văn hóa phi vật thể quốc gia', 'Báo Nhân Dân đưa tin ngày 12/08/2024')
) AS x(entry_slug, source_title, note)
JOIN culture_entries e ON e.slug = x.entry_slug
JOIN culture_sources s ON s.title = x.source_title;