export interface PhotoAsset {
  readonly id: string;
  readonly kind: 'photo';
  readonly src: string;
  readonly author: string;
  readonly caption: string;
  readonly alt: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly licenseUrl: string | null;
  readonly sha256: string;
  readonly objectPosition: string;
  readonly width: number;
  readonly height: number;
  readonly reviewedOn: string;
  readonly changes: string;
}

export interface IllustrationAsset {
  readonly id: string;
  readonly kind: 'svg';
  readonly caption: string;
  readonly alt: string;
}

export type VisualAsset = PhotoAsset | IllustrationAsset;

// Review covers source-page licensing metadata and visible image content, not cultural claims.
const photos: readonly PhotoAsset[] = [
  {
    "id": "hanoi-lake",
    "kind": "photo",
    "src": "/mini-game/hanoi/hanoi-lake.jpg",
    "author": "Tranhuutukkt",
    "caption": "Hồ Gươm, ảnh chụp năm 2019.",
    "alt": "Tháp Rùa giữa Hồ Gươm, mặt nước và hàng cây ven hồ.",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hoan_Kiem_Lake_photo.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "sha256": "44a933b9cb0fe160de2f08bbacdb5cf67c8ba7eb61ba9da1d4de9280825849cf",
    "objectPosition": "50% 50%",
    "width": 1280,
    "height": 720,
    "reviewedOn": "2026-11-12",
    "changes": "Bản thu nhỏ 1280 px từ Wikimedia Commons; hiển thị cắt khung bằng CSS, không sửa file ảnh."
  },
  {
    "id": "hanoi-morning-walk",
    "kind": "photo",
    "src": "/mini-game/hanoi/hanoi-morning-walk.jpg",
    "author": "Prof MK",
    "caption": "Một góc ven Hồ Gươm, tháng 9/2014; minh họa bối cảnh đi dạo.",
    "alt": "Hàng cây và lối đi ven Hồ Gươm, nhìn ra mặt hồ.",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hoan_Kiem_Lake_in_the_morning,_September_2014.jpeg",
    "license": "Public domain",
    "licenseUrl": null,
    "sha256": "2fbac1a180db7878d5ac60208fb1bb1c9d6dae49fd66747b5c9ee9757c2eb75a",
    "objectPosition": "50% 65%",
    "width": 1280,
    "height": 960,
    "reviewedOn": "2026-11-12",
    "changes": "Bản thu nhỏ 1280 px từ Wikimedia Commons; hiển thị cắt khung bằng CSS, không sửa file ảnh."
  },
  {
    "id": "hanoi-bun-cha",
    "kind": "photo",
    "src": "/mini-game/hanoi/hanoi-bun-cha.jpg",
    "author": "Weetjesman",
    "caption": "Bún chả và các món ăn kèm; ảnh minh họa, không quy định cách ăn.",
    "alt": "Bún, chả, rau và các món ăn kèm đặt trên bàn.",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bun_cha_Hanoi.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "sha256": "92e18a431fff36f48e3d1dc44111c7cd94cfe61dd367adfe18675c017efaf61e",
    "objectPosition": "50% 50%",
    "width": 1280,
    "height": 721,
    "reviewedOn": "2026-11-12",
    "changes": "Bản thu nhỏ 1280 px từ Wikimedia Commons; hiển thị cắt khung bằng CSS, không sửa file ảnh."
  },
  {
    "id": "hanoi-pho",
    "kind": "photo",
    "src": "/mini-game/hanoi/hanoi-pho.jpg",
    "author": "Fransiscatatumnc095",
    "caption": "Phở gà Hà Nội; ảnh minh họa cho lựa chọn phở.",
    "alt": "Bát phở gà với bánh phở, thịt gà và rau thơm.",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Pho-ga-ha-noi.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "sha256": "9cf3d8c17ec53e0beeaa45c06b4a651f22dcd7414f22ebdc7a4889adb81cd55b",
    "objectPosition": "50% 72%",
    "width": 1280,
    "height": 1707,
    "reviewedOn": "2026-11-12",
    "changes": "Bản thu nhỏ 1280 px từ Wikimedia Commons; hiển thị cắt khung bằng CSS, không sửa file ảnh."
  },
  {
    "id": "hanoi-cafe",
    "kind": "photo",
    "src": "/mini-game/hanoi/hanoi-cafe.jpg",
    "author": "Alexkom000 (Alexey Komarov)",
    "caption": "Một quán cà phê ở Hà Nội, ảnh năm 2024; không xác nhận địa điểm của câu chuyện hư cấu.",
    "alt": "Mặt tiền một quán cà phê với bàn ghế hướng ra phố.",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:2024-11-03_A_cafe_in_Hanoi%27s_Old_Quarter.jpg",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sha256": "c99d788ddab79cf34c83f5d27bea847e91abdaef5c4bff35d6ab9ec8e0e7ebc7",
    "objectPosition": "50% 65%",
    "width": 1280,
    "height": 853,
    "reviewedOn": "2026-11-12",
    "changes": "Bản thu nhỏ 1280 px từ Wikimedia Commons; hiển thị cắt khung bằng CSS, không sửa file ảnh."
  }
];

const illustrations: readonly IllustrationAsset[] = [
  { id: 'cup-blank', kind: 'svg', caption: 'Minh họa SVG: cốc đã tạo hình, chờ trang trí.', alt: 'Minh họa chiếc cốc trơn chưa có họa tiết.' },
  { id: 'cup-geometric', kind: 'svg', caption: 'Minh họa SVG: họa tiết hình học; không phải sản phẩm thực tế.', alt: 'Cốc minh họa với họa tiết hình học.' },
  { id: 'cup-leaves', kind: 'svg', caption: 'Minh họa SVG: họa tiết cây lá; không phải sản phẩm thực tế.', alt: 'Cốc minh họa với họa tiết cây lá.' },
  { id: 'lunch-table', kind: 'svg', caption: 'Minh họa SVG: bàn ăn trước khi chọn món.', alt: 'Bàn ăn minh họa với bát và đũa.' },
];

export const hanoiVisuals: Readonly<Record<string, VisualAsset>> = Object.fromEntries(
  [...photos, ...illustrations].map(asset => [asset.id, asset]),
);
