export interface MaritimeTerritory {
  id: string;
  name: string;
  adminUnit: string;
  lng: number;
  lat: number;
  description: string;
  culturalLandmark: string;
  islands: string[];
}

export const VIETNAM_MARITIME_TERRITORIES: MaritimeTerritory[] = [
  {
    id: 'hoang-sa',
    name: 'QUẦN ĐẢO HOÀNG SA',
    adminUnit: 'Huyện đảo Hoàng Sa, TP. Đà Nẵng, Việt Nam',
    lng: 112.0,
    lat: 16.5,
    description: 'Quần đảo Hoàng Sa là lãnh thổ thiêng liêng không thể tách rời của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Các chúa Nguyễn và triều đình phong kiến Việt Nam đã thực thi chủ quyền liên tục và hòa bình từ thế kỷ 17.',
    culturalLandmark: 'Bia Chủ quyền Hoàng Sa & Nhà Trưng bày Tư liệu Hoàng Sa',
    islands: ['Đảo Hoàng Sa', 'Đảo Phú Lâm', 'Đảo Tri Tôn', 'Đảo Cây', 'Đảo Linh Côn', 'Đảo Quang Hòa', 'Bãi Cát Vàng'],
  },
  {
    id: 'truong-sa',
    name: 'QUẦN ĐẢO TRƯỜNG SA',
    adminUnit: 'Huyện đảo Trường Sa, Tỉnh Khánh Hòa, Việt Nam',
    lng: 114.3,
    lat: 10.0,
    description: 'Quần đảo Trường Sa là phần lãnh thổ máu thịt thiêng liêng của Tổ quốc Việt Nam trên Biển Đông, trực thuộc tỉnh Khánh Hòa, được các thế hệ người Việt gìn giữ và bảo vệ qua hàng trăm năm lịch sử.',
    culturalLandmark: 'Cột mốc Chủ quyền Quốc gia trên Đảo Trường Sa Lớn',
    islands: ['Đảo Trường Sa Lớn', 'Đảo Song Tử Tây', 'Đảo Sinh Tồn', 'Đảo Nam Yết', 'Đảo Sơn Ca', 'Đảo Phan Vinh', 'Đảo An Bang', 'Đảo Thuyền Chài'],
  },
  {
    id: 'con-dao',
    name: 'QUẦN ĐẢO CÔN ĐẢO',
    adminUnit: 'Huyện Côn Đảo, Tỉnh Bà Rịa - Vũng Tàu, Việt Nam',
    lng: 106.6,
    lat: 8.68,
    description: 'Quần đảo tiền tiêu phía Đông Nam của Tổ quốc với 16 hòn đảo, di tích lịch sử quốc gia đặc biệt ghi dấu tinh thần bất khuất của dân tộc.',
    culturalLandmark: 'Di tích Lịch sử Quốc gia đặc biệt Nhà tù Côn Đảo & Nghĩa trang Hàng Dương',
    islands: ['Côn Lôn', 'Hòn Bảy Cạnh', 'Hòn Cau', 'Hòn Bà'],
  },
  {
    id: 'phu-quoc',
    name: 'ĐẢO PHÚ QUỐC',
    adminUnit: 'TP. Phú Quốc, Tỉnh Kiên Giang, Việt Nam',
    lng: 103.96,
    lat: 10.22,
    description: 'Đảo ngọc lớn nhất Việt Nam tại vùng biển Tây Nam, trung tâm du lịch sinh thái và văn hóa biển đảo trù phú.',
    culturalLandmark: 'Di tích Lịch sử Nhà tù Phú Quốc & Đảo ngọc Nam Bộ',
    islands: ['Đảo Phú Quốc', 'Quần đảo An Thới', 'Quần đảo Thổ Chu'],
  },
  {
    id: 'ly-son',
    name: 'ĐẢO LÝ SƠN',
    adminUnit: 'Huyện đảo Lý Sơn, Tỉnh Quảng Ngãi, Việt Nam',
    lng: 109.12,
    lat: 15.38,
    description: 'Quê hương của Đội hùng binh Hoàng Sa kiêm quản Trường Sa năm xưa, nơi lưu giữ nhiều bằng chứng lịch sử và Di sản văn hóa phi vật thể quốc gia: Lễ khao lề thế lính Hoàng Sa (nghi lễ tri ân và tế hình nhân thế mạng cho các binh phu vượt biển cắm mốc chủ quyền).',
    culturalLandmark: 'Di tích Âm Linh Tự & Nhà trưng bày Đội Hoàng Sa kiêm quản Bắc Hải',
    islands: ['Đảo Lớn (Cù Lao Ré)', 'Đảo Bé (Cù Lao Bờ Bãi)', 'Hòn Mù Cu'],
  },
  {
    id: 'bach-long-vi',
    name: 'ĐẢO BẠCH LONG VĨ',
    adminUnit: 'Huyện đảo Bạch Long Vĩ, TP. Hải Phòng, Việt Nam',
    lng: 107.73,
    lat: 20.13,
    description: 'Đảo tiền tiêu giữa vịnh Bắc Bộ của Việt Nam, giữ vị trí chiến lược đặc biệt quan trọng trong việc bảo vệ chủ quyền an ninh biển đảo.',
    culturalLandmark: 'Ngọn Hải đăng Bạch Long Vĩ & Đền thờ Bạch Long Vĩ',
    islands: ['Đảo Bạch Long Vĩ'],
  },
];
