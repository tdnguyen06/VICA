import { useId } from 'react';
import { regionalImages } from '../scenarios';
import { StoryVisual } from './StoryCard';
import type { RegionalImage } from '../content/regional-types';

function RegionalVisual({ image }: { image: RegionalImage }) {
  const gradient = useId();
  const motif = image.motif;
  const postcard = motif.startsWith('postcard');
  return <figure className="overflow-hidden rounded-2xl border border-clay-300 bg-clay-50 clay-soft">
    <svg role="img" aria-label={'Minh họa ' + image.label + ' — ' + image.province} viewBox="0 0 640 360" className="block aspect-video w-full">
      <defs><linearGradient id={gradient} x2="1" y2="1"><stop stopColor="#0f172a" /><stop offset="1" stopColor={image.accent} stopOpacity=".6" /></linearGradient></defs>
      <rect width="640" height="360" fill={'url(#' + gradient + ')'} />
      <circle cx="528" cy="73" r="31" fill={image.accent} opacity=".8" />
      <path d="M0 287 Q160 254 320 285 T640 273 V360 H0Z" fill="#0f172a" opacity=".6" />
      {motif === 'karst' ? <g fill={image.accent} opacity=".8"><path d="M65 285 Q80 94 137 142 Q167 72 190 285Z" /><path d="M255 285 Q262 124 303 166 Q335 96 377 285Z" /><path d="M435 285 Q459 179 505 197 L550 285Z" /></g> : null}
      {motif === 'hills' ? <g><path d="M0 286 Q120 51 270 220 Q350 80 640 256 V360 H0Z" fill={image.accent} opacity=".65" /><path d="M0 312 Q190 158 310 276 Q450 169 640 295V360H0Z" fill="#14532d" /><path d="M138 273v-80m-28 39 28-48 28 48m-24-4-37 44h72Z" fill="#064e3b" stroke="#064e3b" strokeWidth="7" /></g> : null}
      {motif === 'river' || motif === 'beach' || motif === 'harbour' ? <g>
        <path d="M0 241 Q160 212 320 245 T640 234V360H0Z" fill={image.accent} opacity=".6" />
        {[266,296,326].map(y => <path key={y} d={'M30 '+y+'Q160 '+(y-25)+' 290 '+y+'T610 '+y} stroke="#e0f2fe" fill="none" strokeWidth="4" opacity=".6" />)}
        {motif === 'harbour' ? <g><path d="M166 250h207l-36 42H209Z" fill="#7c2d12" /><path d="M271 139v111m8-105 70 82h-70Z" fill="#fff7ed" stroke="#fff7ed" strokeWidth="5" /><path d="M98 226V118h75v108M448 225V156h62v69" fill="#334155" /></g>
          : motif === 'river' ? <path d="M125 241 Q320 80 520 241M190 203v38m64-76v76m65-92v92m66-76v76m65-39v39" fill="none" stroke="#fde68a" strokeWidth="10" /> : <path d="M96 273Q122 188 108 113m0 0Q61 91 38 136m70-23q52-26 86 18m-86-18q-14-48-50-52" fill="none" stroke="#d9f99d" strokeWidth="10" />}
      </g> : null}
      {motif === 'palace' ? <g fill="#fde68a"><path d="M125 171h390l-74-53H199Z" /><path d="M177 184h286v99H177Z" opacity=".5" />{[200,260,380,440].map(x=><rect key={x} x={x} y="185" width="12" height="99" />)}<path d="M289 285v-62q31-38 62 0v62Z" fill="#1e293b" /><path d="M107 292h428" stroke="#fde68a" strokeWidth="10" /></g> : null}
      {motif === 'city' || motif === 'old-town' ? <g fill={image.accent}>
        {(motif === 'city' ? [100,180,265,360,450] : [100,210,320,430]).map((x,i)=><g key={x}>
          <path d={'M'+x+' 282V'+(motif==='city'?130-(i%3)*20:180)+'h75v'+(motif==='city'?152+(i%3)*20:102)+'Z'} opacity=".8" />
          {motif === 'old-town' ? <path d={'M'+(x-10)+' 184l48-53 48 53Z'} fill="#9a3412" /> : null}
          <path d={'M'+(x+18)+' 220h15m10 0h15m-40 25h15m10 0h15'} stroke="#0f172a" strokeWidth="10" /></g>)}
      </g> : null}
      {motif === 'market' ? <g>{[85,245,405].map((x,i)=><g key={x}><path d={'M'+x+' 175h140l-17-48H'+(x+17)+'Z'} fill={i===1?'#fdba74':image.accent} /><path d={'M'+(x+8)+' 183v102h124V183m-137 52h145'} fill="none" stroke="#fef3c7" strokeWidth="8" />{[32,64,96].map(offset=><circle key={offset} cx={x+offset} cy="224" r="12" fill={i===1?'#86efac':'#fb923c'} />)}</g>)}</g> : null}
      {motif === 'meal' ? <g><ellipse cx="320" cy="271" rx="188" ry="29" fill="#0f172a" /><path d="M167 167h306q-17 119-153 119T167 167" fill="#e2e8f0" /><ellipse cx="320" cy="169" rx="152" ry="36" fill="#fed7aa" /><path d="M211 170q50-24 90 0t95 0m-155 12q50-24 100 0" fill="none" stroke="#fffbeb" strokeWidth="7" /><path d="M403 160q-29-51 8-57 33 8-8 57m-180 0q-35-37-4-45 25 10 4 45" fill="#4ade80" /><path d="M434 132 521 75m-74 71 88-57" stroke="#78350f" strokeWidth="8" /></g> : null}
      {postcard ? <g transform="rotate(-4 320 190)"><rect x="130" y="85" width="380" height="225" rx="9" fill="#fff7ed" /><rect x="153" y="108" width="334" height="150" rx="4" fill={image.accent} opacity=".4" />
        {motif === 'postcard-scene' ? <><circle cx="416" cy="142" r="20" fill={image.accent} /><path d="M154 239 238 143l86 95 58-52 104 70H154Z" fill={image.accent} /><path d="M159 272h174m-174 14h103" stroke="#94a3b8" strokeWidth="6" /></> :
          <>{[0,1,2,3,4].map(i=><rect key={i} x={163+i*65} y={125+(i%2)*18} width="51" height={107-(i%2)*18} rx="8" fill={i%2?image.accent:'#fb923c'} opacity={.45+i*.1} />)}<path d="M159 273h216" stroke="#94a3b8" strokeWidth="6" /></>}
      </g> : null}
    </svg>
    <figcaption className="space-y-1 p-4 text-xs leading-5 text-clay-600"><p className="font-semibold text-clay-800">{image.label} · {image.province}</p><p>Minh họa SVG do VICA tạo · không phải ảnh tư liệu hay mô phỏng chính xác địa điểm/món ăn.</p></figcaption>
  </figure>;
}

export function PendingRegionalVisual(props: { theme: string; motif?: string; assetId?: string | null }) {
  const image = props.assetId ? regionalImages[props.assetId] : undefined;
  return image ? <RegionalVisual image={image} /> : <StoryVisual {...props} />;
}
