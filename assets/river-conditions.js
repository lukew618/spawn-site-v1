// River fishability thresholds — one entry per river slug
const RIVER_CONFIG = {
  yakima: {
    prime:    { flow_min: 800,   flow_max: 2500,  temp_min: 48, temp_max: 62 },
    good:     { flow_min: 2500,  flow_max: 4000,  temp_min: 44, temp_max: 48 },
    fair:     { flow_min: 4000,  flow_max: 6000,  temp_min: 42, temp_max: 65 },
    marginal: { flow_min: 6000,  flow_max: 8000 },
    blown:    { flow_min: 8000 }
  },
  skagit: {
    prime:    { flow_min: 5000,  flow_max: 12000, temp_min: 45, temp_max: 58 },
    good:     { flow_min: 12000, flow_max: 18000, temp_min: 40, temp_max: 45 },
    fair:     { flow_min: 18000, flow_max: 25000, temp_min: 38, temp_max: 60 },
    marginal: { flow_min: 25000, flow_max: 35000 },
    blown:    { flow_min: 35000 }
  },
  skykomish: {
    prime:    { flow_min: 1000,  flow_max: 4000,  temp_min: 45, temp_max: 58 },
    good:     { flow_min: 4000,  flow_max: 8000,  temp_min: 40, temp_max: 45 },
    fair:     { flow_min: 8000,  flow_max: 12000, temp_min: 38, temp_max: 60 },
    marginal: { flow_min: 12000, flow_max: 18000 },
    blown:    { flow_min: 18000 }
  },
  snoqualmie: {
    prime:    { flow_min: 500,   flow_max: 2000,  temp_min: 46, temp_max: 60 },
    good:     { flow_min: 2000,  flow_max: 4000,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 4000,  flow_max: 6000,  temp_min: 40, temp_max: 62 },
    marginal: { flow_min: 6000,  flow_max: 9000 },
    blown:    { flow_min: 9000 }
  },
  klickitat: {
    prime:    { flow_min: 800,   flow_max: 2000,  temp_min: 48, temp_max: 60 },
    good:     { flow_min: 2000,  flow_max: 3500,  temp_min: 44, temp_max: 48 },
    fair:     { flow_min: 3500,  flow_max: 5000,  temp_min: 42, temp_max: 62 },
    marginal: { flow_min: 5000,  flow_max: 7000 },
    blown:    { flow_min: 7000 }
  },
  cowlitz: {
    prime:    { flow_min: 2000,  flow_max: 6000,  temp_min: 45, temp_max: 58 },
    good:     { flow_min: 6000,  flow_max: 10000, temp_min: 40, temp_max: 45 },
    fair:     { flow_min: 10000, flow_max: 15000, temp_min: 38, temp_max: 60 },
    marginal: { flow_min: 15000, flow_max: 22000 },
    blown:    { flow_min: 22000 }
  },
  lewis: {
    prime:    { flow_min: 2000,  flow_max: 5000,  temp_min: 46, temp_max: 58 },
    good:     { flow_min: 5000,  flow_max: 8000,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 8000,  flow_max: 12000, temp_min: 40, temp_max: 60 },
    marginal: { flow_min: 12000, flow_max: 18000 },
    blown:    { flow_min: 18000 }
  },
  toutle: {
    prime:    { flow_min: 300,   flow_max: 1200,  temp_min: 46, temp_max: 58 },
    good:     { flow_min: 1200,  flow_max: 2500,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 2500,  flow_max: 4000,  temp_min: 40, temp_max: 60 },
    marginal: { flow_min: 4000,  flow_max: 6000 },
    blown:    { flow_min: 6000 }
  },
  solduc: {
    prime:    { flow_min: 300,   flow_max: 1500,  temp_min: 45, temp_max: 56 },
    good:     { flow_min: 1500,  flow_max: 3000,  temp_min: 40, temp_max: 45 },
    fair:     { flow_min: 3000,  flow_max: 5000,  temp_min: 38, temp_max: 58 },
    marginal: { flow_min: 5000,  flow_max: 8000 },
    blown:    { flow_min: 8000 }
  },
  deschutes_wa: {
    prime:    { flow_min: 200,   flow_max: 800,   temp_min: 48, temp_max: 60 },
    good:     { flow_min: 800,   flow_max: 1500,  temp_min: 44, temp_max: 48 },
    fair:     { flow_min: 1500,  flow_max: 2500,  temp_min: 42, temp_max: 62 },
    marginal: { flow_min: 2500,  flow_max: 4000 },
    blown:    { flow_min: 4000 }
  },
  sauk: {
    prime:    { flow_min: 1000,  flow_max: 4000,  temp_min: 42, temp_max: 54 },
    good:     { flow_min: 4000,  flow_max: 8000,  temp_min: 38, temp_max: 42 },
    fair:     { flow_min: 8000,  flow_max: 12000, temp_min: 36, temp_max: 56 },
    marginal: { flow_min: 12000, flow_max: 18000 },
    blown:    { flow_min: 18000 }
  },
  stillaguamish: {
    prime:    { flow_min: 600,   flow_max: 2500,  temp_min: 44, temp_max: 56 },
    good:     { flow_min: 2500,  flow_max: 5000,  temp_min: 40, temp_max: 44 },
    fair:     { flow_min: 5000,  flow_max: 8000,  temp_min: 38, temp_max: 58 },
    marginal: { flow_min: 8000,  flow_max: 12000 },
    blown:    { flow_min: 12000 }
  },
  methow: {
    prime:    { flow_min: 400,   flow_max: 1800,  temp_min: 46, temp_max: 58 },
    good:     { flow_min: 1800,  flow_max: 3500,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 3500,  flow_max: 5000,  temp_min: 40, temp_max: 60 },
    marginal: { flow_min: 5000,  flow_max: 7500 },
    blown:    { flow_min: 7500 }
  },
  wenatchee: {
    prime:    { flow_min: 800,   flow_max: 3000,  temp_min: 46, temp_max: 60 },
    good:     { flow_min: 3000,  flow_max: 5500,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 5500,  flow_max: 8000,  temp_min: 40, temp_max: 62 },
    marginal: { flow_min: 8000,  flow_max: 12000 },
    blown:    { flow_min: 12000 }
  },
  spokane: {
    prime:    { flow_min: 1500,  flow_max: 6000,  temp_min: 46, temp_max: 62 },
    good:     { flow_min: 6000,  flow_max: 10000, temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 10000, flow_max: 15000, temp_min: 40, temp_max: 64 },
    marginal: { flow_min: 15000, flow_max: 25000 },
    blown:    { flow_min: 25000 }
  },
  grande_ronde: {
    prime:    { flow_min: 500,   flow_max: 2000,  temp_min: 46, temp_max: 60 },
    good:     { flow_min: 2000,  flow_max: 4000,  temp_min: 42, temp_max: 46 },
    fair:     { flow_min: 4000,  flow_max: 6500,  temp_min: 40, temp_max: 62 },
    marginal: { flow_min: 6500,  flow_max: 9000 },
    blown:    { flow_min: 9000 }
  }
};

const FISHABILITY_COPY = {
  PRIME:     { rating: 'Prime.',     subtitle: 'Hit the water. Conditions are lined up.' },
  GOOD:      { rating: 'Good.',      subtitle: 'Fishable. Dry-dropper weather.' },
  FAIR:      { rating: 'Fair.',      subtitle: 'Workable. Pick your water carefully.' },
  MARGINAL:  { rating: 'Marginal.',  subtitle: 'Tough day ahead. Go small and slow.' },
  BLOWN_OUT: { rating: 'Blown out.', subtitle: 'High and off-color. Wait it out.' },
  LOW_FLOW:  { rating: 'Low.',       subtitle: 'Skinny water. Stealth or skip it.' },
  UNKNOWN:   { rating: 'Unknown.',   subtitle: 'Sensor data unavailable right now.' }
};

class RiverConditions extends HTMLElement {
  connectedCallback() {
    const sectionId = this.dataset.sectionId || '';
    const configEl = document.getElementById(`river-config-data-${sectionId}`) || document.getElementById('river-config-data');
    const hatchesEl = document.getElementById(`river-hatches-data-${sectionId}`) || document.getElementById('river-hatches-data');
    if (!configEl) return;

    try {
      this.config = JSON.parse(configEl.textContent);
      this.hatches = hatchesEl ? JSON.parse(hatchesEl.textContent) : [];
    } catch (e) {
      console.error('[RiverConditions] Failed to parse config JSON', e);
      return;
    }

    this.riverConfig = RIVER_CONFIG[this.config.slug];
    this._abortController = new AbortController();

    this._dispatchAnalytics('river_page_view', { slug: this.config.slug });
    this._attachProductClickTracking();
    this._attachCartTracking();

    this.fetchConditions();
  }

  disconnectedCallback() {
    if (this._abortController) this._abortController.abort();
  }

  async fetchConditions() {
    const url = `${this.config.worker_url}/api/river/${this.config.station_id}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.renderConditions(data);
      if (this.riverConfig) this.renderFishability(data);
      this.renderFlowChart(data);
      this.enhanceHatches(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[RiverConditions] Fetch failed:', err);
      this.renderFallback();
    }
  }

  renderConditions(data) {
    // Hero metric: flow
    const flowEl = this.querySelector('[data-condition="flow"]');
    if (flowEl) {
      const value = flowEl.querySelector('.river-metric__value');
      const sub = flowEl.querySelector('.river-metric__sub');
      if (data.flow_cfs != null) {
        value.textContent = Number(data.flow_cfs).toLocaleString('en-US');
      } else {
        value.textContent = 'N/A';
      }
      if (sub && this.riverConfig) {
        const inPrime = data.flow_cfs != null
          && data.flow_cfs >= this.riverConfig.prime.flow_min
          && data.flow_cfs < this.riverConfig.prime.flow_max;
        sub.innerHTML = inPrime
          ? `cubic feet per second · <strong>in prime window</strong> (${this.riverConfig.prime.flow_min.toLocaleString()}–${this.riverConfig.prime.flow_max.toLocaleString()} cfs)`
          : `cubic feet per second · prime window ${this.riverConfig.prime.flow_min.toLocaleString()}–${this.riverConfig.prime.flow_max.toLocaleString()} cfs`;
      }
      flowEl.classList.remove('river-metric--loading');
    }

    // Secondary rows
    const gageRow = this.querySelector('[data-condition="gage"]');
    if (gageRow) {
      const v = gageRow.querySelector('.river-secondary-row__value');
      if (data.gage_height_ft != null) {
        v.innerHTML = `${Number(data.gage_height_ft).toFixed(2)}<span class="unit">ft</span>`;
      } else {
        v.innerHTML = `—<span class="unit">ft</span>`;
        gageRow.classList.add('river-secondary-row--na');
      }
    }

    const tempRow = this.querySelector('[data-condition="temp"]');
    if (tempRow) {
      const v = tempRow.querySelector('.river-secondary-row__value');
      if (data.temp_f != null) {
        v.innerHTML = `${data.temp_f}<span class="unit">°F</span>`;
      } else {
        v.innerHTML = `— <span class="unit">sensor offline</span>`;
        tempRow.classList.add('river-secondary-row--na');
      }
    }
  }

  renderFishability(data) {
    const banner = this.querySelector('.river-fishability');
    if (!banner) return;

    const level = this.computeFishability(data.flow_cfs, data.temp_f);
    const copy = FISHABILITY_COPY[level] || FISHABILITY_COPY.UNKNOWN;

    banner.querySelector('.river-fishability__rating').textContent = copy.rating;
    banner.querySelector('.river-fishability__subtitle').textContent = copy.subtitle;

    const updated = banner.querySelector('.river-fishability__updated');
    if (updated && data.updated_at) {
      const date = new Date(data.updated_at);
      if (!isNaN(date.getTime())) {
        updated.textContent = `Updated ${this.timeAgo(date)}${data.stale ? ' (stale)' : ''}`;
        if (data.stale) updated.classList.add('river-fishability__updated--stale');
      }
    }

    banner.dataset.level = level.toLowerCase().replace('_', '-');
    banner.hidden = false;
  }

  renderFlowChart(data) {
    const host = this.querySelector('[data-flow-chart]');
    if (!host) return;
    const history = Array.isArray(data.flow_history_7d) ? data.flow_history_7d : [];
    if (history.length < 2) {
      host.classList.remove('river-flow__chart--loading');
      host.innerHTML = '';
      return;
    }

    const W = 800, H = 260;
    const padL = 60, padR = 20, padT = 20, padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const values = history.map(d => d.cfs);
    const maxVal = Math.max(...values);
    const rawMax = maxVal * 1.15;
    // Round y-axis max up to a clean number
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const yMax = Math.ceil(rawMax / magnitude) * magnitude;
    const y = v => padT + plotH - (v / yMax) * plotH;
    const x = i => padL + (i * plotW) / (history.length - 1);

    const prime = this.riverConfig?.prime;
    const blown = this.riverConfig?.blown;

    const primeBand = prime
      ? `<rect x="${padL}" y="${y(Math.min(prime.flow_max, yMax))}" width="${plotW}" height="${y(prime.flow_min) - y(Math.min(prime.flow_max, yMax))}" fill="#2D5F3F" opacity="0.08" />
         <text x="${W - padR}" y="${y(Math.min(prime.flow_max, yMax)) + 10}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="1.5" fill="#2D5F3F" opacity="0.75">PRIME ${prime.flow_min.toLocaleString()}–${prime.flow_max.toLocaleString()}</text>`
      : '';

    const blownLine = blown && blown.flow_min < yMax
      ? `<line x1="${padL}" y1="${y(blown.flow_min)}" x2="${W - padR}" y2="${y(blown.flow_min)}" stroke="#8B2E1F" stroke-width="1" stroke-dasharray="4 3" opacity="0.6" />`
      : '';

    // Y-axis ticks: 4 ticks 0, yMax/3, 2yMax/3, yMax
    const yTicks = [0, yMax / 3, (2 * yMax) / 3, yMax].map(v => Math.round(v));
    const gridLines = yTicks.map((v, i) => {
      const yPos = y(v);
      const stroke = (i === 0 || i === yTicks.length - 1) ? '#1A1915' : '#D8D1BE';
      const dash = (i === 0 || i === yTicks.length - 1) ? '' : 'stroke-dasharray="2 3"';
      return `<line x1="${padL}" y1="${yPos}" x2="${W - padR}" y2="${yPos}" stroke="${stroke}" stroke-width="1" ${dash} />`;
    }).join('');
    const yLabels = yTicks.map(v =>
      `<text x="${padL - 8}" y="${y(v) + 3}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#6B6558">${v.toLocaleString()}</text>`
    ).join('');

    // X-axis date labels
    const xLabels = history.map((d, i) => {
      const [, mm, dd] = d.date.split('-');
      return `<text x="${x(i)}" y="${H - padB + 18}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#6B6558" letter-spacing="1">${mm}.${dd}</text>`;
    }).join('');

    // Line + area
    const pts = history.map((d, i) => `${x(i)},${y(d.cfs)}`).join(' ');
    const areaPts = `${pts} ${x(history.length - 1)},${padT + plotH} ${padL},${padT + plotH}`;

    const dots = history.slice(0, -1).map((d, i) =>
      `<circle cx="${x(i)}" cy="${y(d.cfs)}" r="3" fill="#F4F1EB" stroke="#2D5F3F" stroke-width="1.5" />`
    ).join('');

    const lastI = history.length - 1;
    const last = history[lastI];
    const today = `
      <circle cx="${x(lastI)}" cy="${y(last.cfs)}" r="6" fill="#2D5F3F" stroke="#F4F1EB" stroke-width="2" />
      <line x1="${x(lastI)}" y1="${y(last.cfs)}" x2="${x(lastI)}" y2="${padT}" stroke="#2D5F3F" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
      <text x="${x(lastI) - 6}" y="${padT - 4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#1F4A2E" letter-spacing="1">TODAY · ${Math.round(last.cfs).toLocaleString()}</text>
    `;

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Discharge over the past ${history.length} days" style="width:100%;height:auto;display:block;">
        ${primeBand}
        ${gridLines}
        ${blownLine}
        ${yLabels}
        ${xLabels}
        <polygon points="${areaPts}" fill="#2D5F3F" opacity="0.06" />
        <polyline points="${pts}" fill="none" stroke="#2D5F3F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        ${dots}
        ${today}
      </svg>
    `;
    host.classList.remove('river-flow__chart--loading');

    // Trend sentence
    const trend = this.querySelector('[data-flow-trend]');
    if (trend && history.length >= 2) {
      const first = history[0].cfs;
      const change = ((last.cfs - first) / first) * 100;
      const dir = change > 3 ? 'up' : change < -3 ? 'down' : 'flat';
      const pct = Math.abs(Math.round(change));
      let phrase;
      if (dir === 'up') phrase = `<strong>+${pct}% over ${history.length} days.</strong> Rising.`;
      else if (dir === 'down') phrase = `<strong>−${pct}% over ${history.length} days.</strong> Falling.`;
      else phrase = `<strong>Steady.</strong> Flow holding within ${pct}% over ${history.length} days.`;
      trend.innerHTML = phrase;
      trend.hidden = false;
    }
  }

  computeFishability(flow, temp) {
    const c = this.riverConfig;
    if (flow == null) return 'UNKNOWN';
    if (flow < c.prime.flow_min) return 'LOW_FLOW';
    if (flow >= c.blown.flow_min) return 'BLOWN_OUT';

    const levels = ['prime', 'good', 'fair', 'marginal'];
    for (const level of levels) {
      const r = c[level];
      if (!r) continue;
      const flowMatch = flow >= r.flow_min && flow < r.flow_max;
      if (temp == null) {
        if (flowMatch) return level.toUpperCase();
        continue;
      }
      const hasTemp = r.temp_min != null && r.temp_max != null;
      if (level === 'prime' || level === 'good') {
        if (flowMatch && (!hasTemp || (temp >= r.temp_min && temp < r.temp_max))) {
          return level.toUpperCase();
        }
      } else {
        if (flowMatch) return level.toUpperCase();
      }
    }
    return 'FAIR';
  }

  enhanceHatches(data) {
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const month = pacific.getMonth() + 1;
    const timeStr = `${String(pacific.getHours()).padStart(2, '0')}:${String(pacific.getMinutes()).padStart(2, '0')}`;

    this.querySelectorAll('.river-hatch').forEach((card) => {
      const idx = parseInt(card.dataset.hatchIndex, 10);
      const hatch = this.hatches[idx];
      if (!hatch) return;

      let inSeason;
      if (hatch.season_start_month <= hatch.season_end_month) {
        inSeason = month >= hatch.season_start_month && month <= hatch.season_end_month;
      } else {
        inSeason = month >= hatch.season_start_month || month <= hatch.season_end_month;
      }

      let inTempRange = true;
      if (data.temp_f != null && hatch.min_water_temp_f && hatch.max_water_temp_f) {
        inTempRange = data.temp_f >= hatch.min_water_temp_f && data.temp_f <= hatch.max_water_temp_f;
      }

      let inPeakTime = false;
      if (hatch.peak_time_start && hatch.peak_time_end) {
        if (hatch.peak_time_start <= hatch.peak_time_end) {
          inPeakTime = timeStr >= hatch.peak_time_start && timeStr <= hatch.peak_time_end;
        } else {
          inPeakTime = timeStr >= hatch.peak_time_start || timeStr <= hatch.peak_time_end;
        }
      }

      const statusEl = card.querySelector('[data-hatch-status]');
      if (!inSeason) {
        card.classList.add('river-hatch--inactive');
        if (statusEl) statusEl.textContent = 'Off-season';
      } else if (!inTempRange) {
        card.classList.add('river-hatch--inactive');
        if (statusEl) statusEl.textContent = 'Off temp';
      } else if (inPeakTime) {
        card.classList.remove('river-hatch--inactive');
        if (statusEl) statusEl.textContent = 'Active now';
      } else {
        card.classList.remove('river-hatch--inactive');
        if (statusEl) statusEl.textContent = 'In window';
      }
    });
  }

  renderFallback() {
    const fallback = this.querySelector('.river-conditions__fallback');
    if (fallback) fallback.hidden = false;
    const banner = this.querySelector('.river-fishability');
    if (banner) banner.hidden = true;
    this.querySelectorAll('.river-metric--loading').forEach(el => el.classList.remove('river-metric--loading'));
    const chart = this.querySelector('[data-flow-chart]');
    if (chart) { chart.classList.remove('river-flow__chart--loading'); chart.innerHTML = ''; }
  }

  timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  _dispatchAnalytics(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }));
  }

  _attachProductClickTracking() {
    this.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="/products/"]');
      if (!link) return;
      const handle = link.href.split('/products/')[1]?.split('?')[0];
      if (handle) {
        this._dispatchAnalytics('river_product_click', {
          slug: this.config.slug,
          handle
        });
      }
    });
  }

  _attachCartTracking() {
    const signal = this._abortController.signal;
    this.addEventListener('submit', (e) => {
      const form = e.target.closest('form[action*="/cart/add"]');
      if (!form) return;
      const handle = form.closest('[data-product-handle]')?.dataset?.productHandle;
      if (handle) {
        this._dispatchAnalytics('river_add_to_cart', {
          slug: this.config.slug,
          handle
        });
      }
    }, { signal });
  }
}

if (!customElements.get('river-conditions')) {
  customElements.define('river-conditions', RiverConditions);
}

// Shared helpers for other pages (picker, rivers index)
window.SPAWN_RIVERS = window.SPAWN_RIVERS || {
  RIVER_CONFIG,
  FISHABILITY_COPY,
  computeFishability(slug, flow, temp) {
    const c = RIVER_CONFIG[slug];
    if (!c) return 'UNKNOWN';
    if (flow == null) return 'UNKNOWN';
    if (flow < c.prime.flow_min) return 'LOW_FLOW';
    if (flow >= c.blown.flow_min) return 'BLOWN_OUT';
    const levels = ['prime', 'good', 'fair', 'marginal'];
    for (const level of levels) {
      const r = c[level];
      if (!r) continue;
      const flowMatch = flow >= r.flow_min && flow < r.flow_max;
      if (temp == null) {
        if (flowMatch) return level.toUpperCase();
        continue;
      }
      const hasTemp = r.temp_min != null && r.temp_max != null;
      if (level === 'prime' || level === 'good') {
        if (flowMatch && (!hasTemp || (temp >= r.temp_min && temp < r.temp_max))) {
          return level.toUpperCase();
        }
      } else {
        if (flowMatch) return level.toUpperCase();
      }
    }
    return 'FAIR';
  }
};
