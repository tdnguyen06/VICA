import { culturalSources } from '../content/sources';

export function CulturalReferences({ sourceIds }: { sourceIds: readonly string[] }) {
  const sources = [...new Set(sourceIds)].flatMap(id => culturalSources[id] ? [culturalSources[id]] : []);
  if (!sources.length) return null;
  return <aside className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-xs leading-5 text-slate-300">
    <h3 className="mb-2 font-semibold text-amber-200">Nguồn đối chiếu</h3>
    <ul className="space-y-2">{sources.map(source => <li key={source.id}>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline break-words">{source.title}</a>
      <p>{source.publisher} · đối chiếu ngày {source.reviewedOn}</p>
      <p className="text-slate-400">{source.scope}</p>
    </li>)}</ul>
  </aside>;
}
