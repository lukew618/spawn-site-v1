const WORKER_URL = 'https://usgs-proxy.doss-fpmo.workers.dev';

const FISHABILITY_LABEL = {
  PRIME:     'Prime',
  GOOD:      'Good',
  FAIR:      'Fair',
  MARGINAL:  'Marginal',
  BLOWN_OUT: 'Blown out',
  LOW_FLOW:  'Low flow',
  UNKNOWN:   '—'
};

class RiversIndex extends HTMLElement {
  connectedCallback() {
    this.search = this.querySelector('[data-rivers-search]');
    this.chips = Array.from(this.querySelectorAll('[data-region-filter]'));
    this.cards = Array.from(this.querySelectorAll('[data-river-card]'));
    this.noResults = this.querySelector('.rivers-index__no-results');

    this.activeRegion = '';
    this.query = '';

    this.search?.addEventListener('input', this._onSearch.bind(this));
    this.chips.forEach((chip) => chip.addEventListener('click', this._onChipClick.bind(this)));

    this._fetchLiveDataForAllCards();
  }

  _onSearch(e) {
    this.query = e.target.value.trim().toLowerCase();
    this._applyFilters();
  }

  _onChipClick(e) {
    const region = e.currentTarget.dataset.regionFilter || '';
    this.activeRegion = region;
    this.chips.forEach((c) => c.classList.toggle(
      'rivers-index__chip--active',
      (c.dataset.regionFilter || '') === region
    ));
    this._applyFilters();
  }

  _applyFilters() {
    let visible = 0;
    this.cards.forEach((card) => {
      const name = card.dataset.riverName || '';
      const region = card.dataset.riverRegion || '';
      const matchesQuery = !this.query || name.includes(this.query) || region.includes(this.query);
      const matchesRegion = !this.activeRegion || region === this.activeRegion;
      const show = matchesQuery && matchesRegion;
      card.hidden = !show;
      if (show) visible++;
    });
    if (this.noResults) this.noResults.hidden = visible > 0;
  }

  _fetchLiveDataForAllCards() {
    this.cards.forEach((card) => {
      const stationId = card.dataset.stationId;
      const slug = card.dataset.riverSlug;
      if (!stationId) return;

      fetch(`${WORKER_URL}/api/river/${stationId}`, { signal: AbortSignal.timeout(8000) })
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then((data) => this._renderCardLive(card, slug, data))
        .catch(() => this._renderCardFallback(card));
    });
  }

  _renderCardLive(card, slug, data) {
    const flowEl = card.querySelector('[data-live-flow]');
    const tempEl = card.querySelector('[data-live-temp]');
    const badgeEl = card.querySelector('[data-fishability-badge]');

    const flowMetric = flowEl?.closest('.rivers-index__card-metric');
    const tempMetric = tempEl?.closest('.rivers-index__card-metric');

    if (flowEl) {
      if (data.flow_cfs != null) {
        flowEl.textContent = Number(data.flow_cfs).toLocaleString('en-US');
      } else {
        flowEl.textContent = '—';
      }
    }
    if (tempEl) {
      if (data.temp_f != null) {
        tempEl.textContent = Number(data.temp_f).toFixed(0);
      } else {
        tempEl.textContent = '—';
      }
    }

    flowMetric?.classList.remove('rivers-index__card-metric--loading');
    tempMetric?.classList.remove('rivers-index__card-metric--loading');

    if (badgeEl && window.SPAWN_RIVERS?.computeFishability) {
      const level = window.SPAWN_RIVERS.computeFishability(slug, data.flow_cfs, data.temp_f);
      const label = FISHABILITY_LABEL[level] || FISHABILITY_LABEL.UNKNOWN;
      if (level !== 'UNKNOWN') {
        badgeEl.textContent = label;
        badgeEl.dataset.level = level.toLowerCase().replace('_', '-');
        badgeEl.hidden = false;
      }
    }
  }

  _renderCardFallback(card) {
    card.querySelectorAll('.rivers-index__card-metric--loading').forEach((m) => {
      m.classList.remove('rivers-index__card-metric--loading');
      m.classList.add('rivers-index__card-metric--offline');
    });
  }
}

if (!customElements.get('rivers-index')) {
  customElements.define('rivers-index', RiversIndex);
}
