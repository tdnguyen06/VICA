import { regionalSources } from './regional-sources.js';

export interface CulturalSource {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly reviewedOn: string;
  readonly scope: string;
}

export const culturalSources: Readonly<Record<string, CulturalSource>> = {
  ...regionalSources,
  'heritage-hoan-kiem': {
    id: 'heritage-hoan-kiem',
    title: 'Di tích lịch sử và danh lam thắng cảnh hồ Hoàn Kiếm và đền Ngọc Sơn',
    publisher: 'Cục Di sản văn hóa',
    url: 'https://dsvh.gov.vn/di-tich-lich-su-va-danh-lam-thang-canh-ho-hoan-kiem-va-den-ngoc-son-2978',
    reviewedOn: '2026-11-12',
    scope: 'Truyền thuyết Lê Lợi trả gươm; việc xếp hạng di tích năm 2013. Không coi truyền thuyết là sự kiện đã chứng minh.',
  },
  'tourism-photo-etiquette': {
    id: 'tourism-photo-etiquette',
    title: 'Vietnamese etiquette for travellers — Ask before taking photographs',
    publisher: 'Vietnam Tourism',
    url: 'https://vietnam.travel/things-to-do/vietnamese-etiquette-travellers/',
    reviewedOn: '2026-11-12',
    scope: 'Khuyến nghị hỏi trước khi chụp người khác và tôn trọng riêng tư; không phải tư vấn pháp luật.',
  },
  'tourism-hanoi-food': {
    id: 'tourism-hanoi-food',
    title: 'Famous Ha Noi Food and International Fine Dining — Pho Ha Noi; Bun cha',
    publisher: 'Vietnam Tourism',
    url: 'https://vietnam.travel/things-to-do/famous-ha-noi-food-and-international-fine-dining/',
    reviewedOn: '2026-11-12',
    scope: 'Thành phần cơ bản của phở và bún chả. Không sử dụng giá, địa chỉ, giờ mở cửa hoặc nhận xét tuyệt đối về cách ăn.',
  },
};
