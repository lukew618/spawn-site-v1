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

function latestReading(series, code) {
  const t = series.find(s => s.variable?.variableCode?.[0]?.value === code);
  const vals = t?.values?.[0]?.value ?? [];
  const last = vals[vals.length - 1];
  if (!last || last.value === undefined || last.value === '' || last.value === '-999999') return null;
  const n = Number(last.value);
  return Number.isFinite(n) ? n : null;
}

function latestTime(series) {
  for (const s of series) {
    const vals = s?.values?.[0]?.value ?? [];
    const last = vals[vals.length - 1];
    if (last?.dateTime) return last.dateTime;
  }
  return null;
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
  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${stationId}&parameterCd=00060,00010,00065&period=P7D&format=json&siteStatus=active`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await res.json();
  const series = data?.value?.timeSeries ?? [];
  return series.length ? series : null;
}

function dailyHistory(series, code) {
  const t = series.find(s => s.variable?.variableCode?.[0]?.value === code);
  const vals = t?.values?.[0]?.value ?? [];
  const byDay = new Map();
  for (const v of vals) {
    if (!v?.dateTime || v.value === undefined || v.value === '' || v.value === '-999999') continue;
    const n = Number(v.value);
    if (!Number.isFinite(n)) continue;
    const day = v.dateTime.slice(0, 10);
    const existing = byDay.get(day);
    if (!existing || v.dateTime > existing.dateTime) byDay.set(day, { dateTime: v.dateTime, value: n });
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, { value }]) => ({ date, cfs: value }));
}

function shape(series, stale = false) {
  return {
    flow_cfs: latestReading(series, '00060'),
    temp_f: toF(latestReading(series, '00010')),
    gage_height_ft: latestReading(series, '00065'),
    flow_history_7d: dailyHistory(series, '00060'),
    updated_at: latestTime(series),
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
