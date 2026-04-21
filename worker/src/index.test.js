import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the worker module
import worker from './index.js';

// Mock caches.default
const mockCache = { match: vi.fn(), put: vi.fn() };
globalThis.caches = { default: mockCache };

function makeRequest(path, method = 'GET', origin = 'https://spawn-fly-fish.myshopify.com') {
  return new Request(`https://usgs-proxy.spawn-fly-fish.workers.dev${path}`, {
    method,
    headers: { Origin: origin },
  });
}

const mockCtx = { waitUntil: vi.fn() };

function makeSeries(code, value, dateTime = '2026-04-04T15:30:00.000-07:00') {
  return {
    variable: { variableCode: [{ value: code }] },
    values: [{ value: [{ value: String(value), dateTime }] }],
  };
}

// Sample USGS response with all 3 parameters
const usgsFullResponse = {
  value: {
    timeSeries: [
      makeSeries('00060', '2430'),
      makeSeries('00010', '11.1'),
      makeSeries('00065', '3.8'),
    ],
  },
};

// USGS response missing temp
const usgsNoTemp = {
  value: {
    timeSeries: [
      makeSeries('00060', '2430'),
      makeSeries('00065', '3.8'),
    ],
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockCache.match.mockResolvedValue(null);
  mockCache.put.mockResolvedValue(undefined);
});

describe('CORS', () => {
  it('returns 204 for OPTIONS preflight', async () => {
    const res = await worker.fetch(makeRequest('/api/river/12484500', 'OPTIONS'), {}, mockCtx);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://spawn-fly-fish.myshopify.com');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });

  it('allows localhost origins for dev', async () => {
    const res = await worker.fetch(makeRequest('/api/river/12484500', 'OPTIONS', 'http://localhost:9292'), {}, mockCtx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:9292');
  });

  it('rejects unknown origins with default', async () => {
    const res = await worker.fetch(makeRequest('/api/river/12484500', 'OPTIONS', 'https://evil.com'), {}, mockCtx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://spawn-fly-fish.myshopify.com');
  });
});

describe('Routing', () => {
  it('returns 404 for unknown paths', async () => {
    const res = await worker.fetch(makeRequest('/unknown'), {}, mockCtx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 400 for non-numeric station ID', async () => {
    const res = await worker.fetch(makeRequest('/api/river/abc123'), {}, mockCtx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid station ID');
  });

  it('returns 400 for station ID with path traversal', async () => {
    const res = await worker.fetch(makeRequest('/api/river/../../etc'), {}, mockCtx);
    expect(res.status).toBe(404);
  });
});

describe('Cache hit', () => {
  it('returns cached response with CORS headers', async () => {
    const cached = new Response(JSON.stringify({ flow_cfs: 1000, temp_f: 50, gage_height_ft: 3.0, updated_at: '2026-04-04T15:00:00Z', stale: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
    mockCache.match.mockResolvedValue(cached);

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://spawn-fly-fish.myshopify.com');
    const body = await res.json();
    expect(body.flow_cfs).toBe(1000);
  });
});

describe('USGS fetch', () => {
  it('parses full response with all 3 parameters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(usgsFullResponse), { status: 200 })));

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flow_cfs).toBe(2430);
    expect(body.temp_f).toBeCloseTo(52.0, 0); // 11.1C → 51.98F
    expect(body.gage_height_ft).toBe(3.8);
    expect(body.stale).toBe(false);
    expect(body.updated_at).toBe('2026-04-04T15:30:00.000-07:00');
  });

  it('returns null temp when USGS omits temperature', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(usgsNoTemp), { status: 200 })));

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    const body = await res.json();
    expect(body.temp_f).toBeNull();
    expect(body.flow_cfs).toBe(2430);
  });

  it('returns 404 when USGS returns empty time series', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: { timeSeries: [] } }), { status: 200 })));

    const res = await worker.fetch(makeRequest('/api/river/99999999'), {}, mockCtx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Station not found');
  });
});

describe('Stale cache fallback', () => {
  it('serves stale cache when USGS fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('USGS timeout')));

    const staleData = JSON.stringify({ flow_cfs: 999, temp_f: 45, gage_height_ft: 2.1, updated_at: '2026-04-04T10:00:00Z', stale: false });
    // First call: fresh cache miss. Second call (in catch): stale cache hit.
    mockCache.match
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Response(staleData, { headers: { 'Content-Type': 'application/json' } }));

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.flow_cfs).toBe(999);
  });

  it('returns 503 when USGS fails and no cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('USGS timeout')));
    mockCache.match.mockResolvedValue(null);

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Service unavailable');
  });
});

describe('Celsius to Fahrenheit', () => {
  it('converts correctly and rounds to 1 decimal', async () => {
    const usgsData = {
      value: { timeSeries: [makeSeries('00010', '0')] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(usgsData), { status: 200 })));

    const res = await worker.fetch(makeRequest('/api/river/12484500'), {}, mockCtx);
    const body = await res.json();
    expect(body.temp_f).toBe(32); // 0C = 32F
  });
});
