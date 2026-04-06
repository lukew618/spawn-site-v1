const ORIGINS = [
  'https://spawn-fly-fish.myshopify.com',
  'https://spawnflyfish.com',
  'https://www.spawnflyfish.com',
];
const TTL = 900;
const STATION_RE = /^\d{5,15}$/;

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const allowed = ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o) ? o : ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function param(observations, code) {
  const o = observations.find(o => o.properties?.parameterCode === code);
  const v = o?.properties?.result ?? null;
  return v !== null ? Number(v) : null;
}

function toF(c) {
  return c === null ? null : Math.round((c * 9 / 5 + 32) * 10) / 10;
}

function json(body, status, req, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(req), ...extra },
  });
}

function withCors(res, req) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors(req))) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

async function usgs(stationId) {
  const url = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items/USGS-${stationId}/observations?limit=1&parameterCode=00060,00010,00065`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await res.json();
  const obs = data?.features ?? data?.items ?? [];
  return obs.length ? obs : null;
}

function shape(obs, stale = false) {
  return {
    flow_cfs: param(obs, '00060'),
    temp_f: toF(param(obs, '00010')),
    gage_height_ft: param(obs, '00065'),
    updated_at: obs.find(o => o.properties?.phenomenonTime)?.properties?.phenomenonTime ?? null,
    stale,
  };
}

function cacheKeyFor(url, pathname) {
  return new Request(new URL(url).origin + pathname, { method: 'GET' });
}

export default {
  async fetch(req, _env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });

    const parsed = new URL(req.url);
    const match = parsed.pathname.match(/^\/api\/river\/([^/]+)$/);
    if (!match) return json({ error: 'Not found' }, 404, req);

    const stationId = match[1];
    if (!STATION_RE.test(stationId)) return json({ error: 'Invalid station ID' }, 400, req);

    const cache = caches.default;
    const cacheKey = cacheKeyFor(req.url, match[0]);

    const fresh = await cache.match(cacheKey);
    if (fresh) return withCors(fresh, req);

    try {
      const obs = await usgs(stationId);
      if (!obs) return json({ error: 'Station not found' }, 404, req);

      const res = json(shape(obs), 200, req, { 'Cache-Control': `public, max-age=${TTL}` });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (_) {
      try {
        const stale = await cache.match(cacheKey);
        if (stale) {
          const data = await stale.json();
          return json({ ...data, stale: true }, 200, req);
        }
      } catch (_) { /* stale read failed, fall through to 503 */ }
      return json({ error: 'Service unavailable' }, 503, req);
    }
  },
};
