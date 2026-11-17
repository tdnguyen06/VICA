import base from '../../vite.config.ts';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const registry = JSON.parse(readFileSync(new URL('../../src/data/provinces-v1.json', import.meta.url), 'utf8'));
let mode = 'normal';
let conversation = 100;
const sessions = new Map<number, { uuid: string; token: string }>();
const requests: unknown[] = [];
const key = 'vica:minigame:hanoi:current';
const fixture = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Mini-game QA</title></head>
<body style="font:18px system-ui;background:#0f172a;color:white;padding:24px">
<h1>Mini-game QA local — không gọi LLM thật</h1>
<button onclick="localStorage.removeItem('${key}'); location.href='/experiences/ha-noi'">Xóa save QA và mở game</button>
<button onclick="localStorage.setItem('${key}','{'); location.href='/experiences/ha-noi'">Save QA hỏng</button>
<button onclick="fetch('/__qa/mode/normal').then(()=>location.href='/experiences/ha-noi')">AI giả lập thành công</button>
<button onclick="fetch('/__qa/mode/ai-error').then(()=>location.href='/experiences/ha-noi?view=play')">AI giả lập lỗi</button>
<button onclick="fetch('/__qa/mode/ai-delay').then(()=>location.href='/experiences/ha-noi?view=play')">AI giả lập chậm</button>
<button onclick="fetch('/__qa/mode/write-failure').then(()=>location.href='/experiences/ha-noi')">Lỗi ghi QA</button>
<button onclick="fetch('/__qa/mode/read-failure').then(()=>location.href='/experiences/ha-noi')">Chặn storage QA</button>
<button onclick="fetch('/__qa/mode/photo-error').then(()=>location.href='/experiences/da-nang?view=play')">Ảnh vùng lỗi giả lập</button>
<p><a href="/" style="color:#fbbf24">Mở bản đồ QA</a></p><div id="image-fixture"></div>
<script type="module">import React from 'react';import{createRoot}from'react-dom/client';import{StoryVisual}from'/src/features/mini-game/components/StoryCard.tsx';createRoot(document.getElementById('image-fixture')).render(React.createElement(StoryVisual,{theme:'intro',src:'/__qa/missing-image.png',alt:'Ảnh QA lỗi'}));</script>
</body></html>`;

export default {
  ...base,
  // Override even when .env.local points to a real backend.
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
  server: { host: '127.0.0.1', port: 15176, strictPort: true },
  plugins: [...base.plugins, {
    name: 'mini-game-isolated-qa',
    transform(code: string, id: string) {
      if (!id.replaceAll('\\', '/').endsWith('/MapViewer.tsx')) return;
      return { code: code.replace(/https:\/\/basemaps\.cartocdn\.com\/gl\/[^'"]+\/style\.json/g, '/__qa/map-style.json'), map: null };
    },
    transformIndexHtml(html: string) {
      if (html.includes('Mini-game QA local') || !['read-failure', 'write-failure'].includes(mode)) return html;
      const script = mode === 'read-failure'
        ? "Object.defineProperty(window,'localStorage',{get(){throw new Error('QA denied')}});"
        : "const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='" + key + "')throw new Error('QA quota');return original.call(this,k,v)};";
      return html.replace('<head>', '<head><script>' + script + '</script>');
    },
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const json = (data: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        if (path.startsWith('/__qa/mode/')) { mode = path.split('/').at(-1) ?? 'normal'; json({ mode }); return; }
        if (path === '/__qa/requests') { json(requests); return; }
        if (mode === 'photo-error' && path.startsWith('/mini-game/regions/') && path.endsWith('.jpg')) { res.statusCode = 404; res.end(); return; }
        if (path === '/__qa/missing-image.png') { res.statusCode = 404; res.end(); return; }
        if (path === '/__qa/map-style.json') {
          json({ version: 8, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbeafe' } }] }); return;
        }
        if (path === '/__qa/hanoi-photos') {
          const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Ảnh thật Hà Nội — QA</title></head><body style="background:#020617;color:white;padding:24px"><h1>Ảnh thật Hà Nội — kiểm tra minh họa</h1><div id="photo-review"></div><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import '/src/index.css';import{StoryVisual}from'/src/features/mini-game/components/StoryCard.tsx';createRoot(document.getElementById('photo-review')).render(React.createElement('div',{className:'grid gap-6 md:grid-cols-2 max-w-5xl mx-auto'},...['lunch-table','cup-blank','cup-geometric','cup-leaves'].map(id=>React.createElement('section',{key:id},React.createElement('h2',null,id),React.createElement(StoryVisual,{assetId:id,theme:id.startsWith('cup')?'pottery':'lunch'})))));</script></body></html>`;
          res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await server.transformIndexHtml(path,html));return;
        }
        if (path === '/__qa') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(await server.transformIndexHtml(path, fixture)); return; }
        if (!path.startsWith('/api/')) { next(); return; }
        let body = ''; for await (const chunk of req) body += chunk;
        const request = JSON.parse(body || '{}');
        if (path.endsWith('/assistant/chat')) {
          requests.push({ conversationId: request.conversationId, provinceSlug: request.provinceSlug,
            message: request.message, hasAuthorization: Boolean(req.headers.authorization), hasGuestToken: Boolean(req.headers['x-guest-token']) });
          if (mode === 'ai-error') { res.statusCode = 503; json({ success: false }); return; }
          if (mode === 'ai-delay') await new Promise(resolve => setTimeout(resolve, 5000));
          let id = request.conversationId;
          let credentials = null;
          if (!id) {
            id = ++conversation;
            const guest = { uuid: randomUUID(), token: 'qa-only-token-' + id };
            sessions.set(id, guest);
            credentials = { guestSessionUuid: guest.uuid, guestToken: guest.token };
          } else if (!sessions.has(id) || sessions.get(id)?.token !== req.headers['x-guest-token']) {
            res.statusCode = 403; json({ success: false }); return;
          }
          json({ success: true, data: { conversationId: id, messageId: id + 1000, role: 'ASSISTANT',
            content: 'Phản hồi QA giả lập: AI chỉ giải thích cảnh hiện tại, không chuyển cảnh. Đây không phải kết quả LLM thật.',
            provinceSlug: request.provinceSlug, credentials, citations: [], suggestedQuestions: [] } }); return;
        }
        let data: unknown = [];
        if (path.endsWith('/geo/identify')) data = registry.provinces.find((province: {slug: string}) => province.slug === (request.latitude >= 20 && request.latitude <= 22 ? 'ha-noi' : 'da-nang'));
        else if (path.includes('/geo/provinces/')) data = registry.provinces.find((province: {slug: string}) => province.slug === path.split('/').at(-1));
        else if (path.endsWith('/geo/provinces')) data = registry.provinces;
        json({ success: true, data, message: 'QA fixture' });
      });
    },
  }],
};
