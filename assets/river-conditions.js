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
  }
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

    // Analytics: page view
    this._dispatchAnalytics('river_page_view', { slug: this.config.slug });

    // Product click tracking within this section
    this._attachProductClickTracking();

    // Cart event tracking
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
      this.enhanceHatches(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[RiverConditions] Fetch failed:', err);
      this.renderFallback();
    }
  }

  renderConditions(data) {
    const flowCard = this.querySelector('[data-condition="flow"]');
    if (flowCard) {
      flowCard.querySelector('.river-condition-card__value').textContent =
        data.flow_cfs != null ? Number(data.flow_cfs).toLocaleString('en-US') : 'N/A';
      flowCard.classList.remove('river-condition-card--loading');
    }

    const tempCard = this.querySelector('[data-condition="temp"]');
    if (tempCard) {
      tempCard.querySelector('.river-condition-card__value').textContent =
        data.temp_f != null ? `${data.temp_f}\u00b0` : 'N/A';
      tempCard.classList.remove('river-condition-card--loading');
    }

    const gageCard = this.querySelector('[data-condition="gage"]');
    if (gageCard) {
      gageCard.querySelector('.river-condition-card__value').textContent =
        data.gage_height_ft != null ? String(data.gage_height_ft) : 'N/A';
      gageCard.classList.remove('river-condition-card--loading');
    }

    const timeEl = this.querySelector('.river-conditions__updated');
    if (timeEl && data.updated_at) {
      const date = new Date(data.updated_at);
      if (!isNaN(date.getTime())) {
        timeEl.textContent = `Updated ${this.timeAgo(date)}`;
        if (data.stale) {
          timeEl.textContent += ' (stale)';
          timeEl.classList.add('river-conditions__updated--stale');
        }
      }
    }
  }

  renderFishability(data) {
    const badge = this.querySelector('.river-fishability-badge');
    if (!badge) return;

    const level = this.computeFishability(data.flow_cfs, data.temp_f);
    const labels = {
      PRIME:     'Prime',
      GOOD:      'Good',
      FAIR:      'Fair',
      MARGINAL:  'Marginal',
      BLOWN_OUT: 'Blown Out',
      LOW_FLOW:  'Low Flow'
    };

    badge.textContent = labels[level] || level;
    badge.dataset.level = level.toLowerCase().replace('_', '-');
    if (data.stale) badge.textContent += ' (stale)';
    badge.hidden = false;
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
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const currentMonth = pacificTime.getMonth() + 1;
    const currentHour = pacificTime.getHours();
    const currentMinute = pacificTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    const hatchCards = this.querySelectorAll('.river-hatch-card');
    hatchCards.forEach((card) => {
      const idx = parseInt(card.dataset.hatchIndex, 10);
      const hatch = this.hatches[idx];
      if (!hatch) return;

      let inSeason = false;
      if (hatch.season_start_month <= hatch.season_end_month) {
        inSeason = currentMonth >= hatch.season_start_month && currentMonth <= hatch.season_end_month;
      } else {
        // Wraps year-end (e.g. Nov–Feb)
        inSeason = currentMonth >= hatch.season_start_month || currentMonth <= hatch.season_end_month;
      }

      let inTempRange = true;
      if (data.temp_f != null && hatch.min_water_temp_f && hatch.max_water_temp_f) {
        inTempRange = data.temp_f >= hatch.min_water_temp_f && data.temp_f <= hatch.max_water_temp_f;
      }

      let inPeakTime = false;
      if (hatch.peak_time_start && hatch.peak_time_end) {
        if (hatch.peak_time_start <= hatch.peak_time_end) {
          inPeakTime = currentTimeStr >= hatch.peak_time_start && currentTimeStr <= hatch.peak_time_end;
        } else {
          inPeakTime = currentTimeStr >= hatch.peak_time_start || currentTimeStr <= hatch.peak_time_end;
        }
      }

      if (inSeason && inTempRange) {
        card.classList.add('river-hatch-card--active');
        card.classList.remove('river-hatch-card--inactive');
        if (inPeakTime && !card.querySelector('.river-hatch-card__badge')) {
          const badge = document.createElement('span');
          badge.className = 'river-hatch-card__badge';
          badge.textContent = 'Active Now';
          card.querySelector('.river-hatch-card__name').appendChild(badge);
        }
      } else {
        card.classList.add('river-hatch-card--inactive');
        card.classList.remove('river-hatch-card--active');
      }
    });
  }

  renderFallback() {
    const fallback = this.querySelector('.river-conditions__fallback');
    if (fallback) fallback.hidden = false;
    const fishWrapper = this.querySelector('.river-fishability-wrapper');
    if (fishWrapper) fishWrapper.hidden = true;
    this.querySelectorAll('.river-condition-card--loading').forEach(el => { el.hidden = true; });
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

  // ─── Analytics helpers ────────────────────────────────────────────────────

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

    // Listen for form submits on add-to-cart forms inside this element
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
