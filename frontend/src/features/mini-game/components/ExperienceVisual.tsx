import { useState } from 'react';
import { regionalImages } from '../scenarios';
import { resolveRegionalPhoto } from '../regional-photo';
import { StoryVisual } from './StoryCard';
import { PendingRegionalVisual } from './RegionalIllustration';

function RegionalPhoto({ assetId, selectedMorningChoiceId }: { assetId: string; selectedMorningChoiceId?: string }) {
  const binding = resolveRegionalPhoto(assetId, selectedMorningChoiceId);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = binding?.photo;
  const isPostcard = binding?.role === 'postcard-scene' || binding?.role === 'postcard-colour';
  const hasImage = photo && failedSrc !== photo.src;
  return <figure className={'overflow-hidden rounded-2xl border border-clay-300 ' + (isPostcard ? 'bg-amber-50 p-3' : 'bg-clay-50')}>
    <div className={'aspect-video overflow-hidden ' + (isPostcard ? 'rounded-lg bg-clay-200' : '')}>
      {hasImage ? <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" width={photo.width} height={photo.height}
        className="h-full w-full object-cover" style={{ objectPosition: photo.objectPosition }} onError={() => setFailedSrc(photo.src)} />
        : <div role="img" aria-label="Ảnh tạm thời không tải được" className="flex h-full items-center justify-center bg-clay-100 p-6 text-center text-sm leading-6 text-clay-700">Ảnh tạm thời không tải được. Bạn vẫn có thể đọc và tiếp tục hành trình.</div>}
    </div>
    {binding?.role === 'postcard-colour' ? <div aria-label="Bảng màu gợi ý của nhân vật" className="mt-3 flex gap-2">
      {['#0f172a', binding.accent, '#fef3c7', '#64748b'].map(colour => <span key={colour} className="h-5 flex-1 rounded" style={{backgroundColor:colour}} />)}
    </div> : null}
    <figcaption className={'space-y-2 px-4 py-3 text-xs leading-5 ' + (isPostcard ? 'text-clay-300' : 'text-clay-600')}>
      {photo ? <p>{photo.caption}</p> : null}
      {isPostcard ? <p>Ảnh từ chặng sáng làm gợi ý cho bố cục/màu sắc. Đây không phải ảnh thành phẩm bưu thiếp của nhân vật.</p>
        : binding?.role === 'pause' ? <p>Ảnh gợi lại chặng sáng đã chọn; không xác nhận địa điểm của chỗ nghỉ hư cấu.</p>
        : binding?.role === 'meal-preview' ? <p>Ảnh gợi ý một món trong các lựa chọn, chưa ghi nhận món ăn vào hành trình.</p> : null}
      {photo ? <details>
        <summary className={'cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ' + (isPostcard ? 'text-amber-900' : 'text-amber-700')}>Nguồn ảnh và quyền sử dụng</summary>
        <div className="mt-2 space-y-1 break-words">
          <p>Ảnh: {photo.author} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Wikimedia Commons</a></p>
          <p>Giấy phép: {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a> : photo.license}</p>
          <p>{photo.changes}</p>
          <p>Đối chiếu nguồn ngày {photo.reviewedOn}. Ảnh không xác nhận quán, dịch vụ hoặc nhân vật trong truyện.</p>
        </div>
      </details> : null}
    </figcaption>
  </figure>;
}
export function ExperienceVisual(props: { theme: string; motif?: string; assetId?: string | null; selectedMorningChoiceId?: string }) {
  if (props.assetId && regionalImages[props.assetId]) return resolveRegionalPhoto(props.assetId, props.selectedMorningChoiceId) ? <RegionalPhoto assetId={props.assetId} selectedMorningChoiceId={props.selectedMorningChoiceId} /> : <PendingRegionalVisual {...props} />;
  return <StoryVisual {...props} />;
}
