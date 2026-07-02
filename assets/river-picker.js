class RiverPicker extends HTMLElement {
  connectedCallback() {
    this.trigger = this.querySelector('.river-picker__trigger');
    this.panel = this.querySelector('.river-picker__panel');
    this.search = this.querySelector('.river-picker__search');
    this.items = Array.from(this.querySelectorAll('[data-picker-item]'));
    this.groups = Array.from(this.querySelectorAll('[data-picker-group]'));
    this.emptyState = this.querySelector('.river-picker__empty');
    if (!this.trigger || !this.panel) return;

    this.isOpen = false;
    this.activeIndex = -1;

    this.trigger.addEventListener('click', () => this.toggle());
    this.trigger.addEventListener('keydown', this._onTriggerKeydown.bind(this));
    this.search.addEventListener('input', this._onSearch.bind(this));
    this.search.addEventListener('keydown', this._onSearchKeydown.bind(this));
    this.panel.addEventListener('keydown', this._onPanelKeydown.bind(this));
    document.addEventListener('click', this._onDocumentClick.bind(this));
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.panel.hidden = false;
    this.classList.add('is-open');
    this.trigger.setAttribute('aria-expanded', 'true');
    // Focus search on open
    setTimeout(() => this.search?.focus(), 30);
  }

  close() {
    this.isOpen = false;
    this.panel.hidden = true;
    this.classList.remove('is-open');
    this.trigger.setAttribute('aria-expanded', 'false');
    this._clearActive();
  }

  _onDocumentClick(e) {
    if (!this.isOpen) return;
    if (!this.contains(e.target)) this.close();
  }

  _onTriggerKeydown(e) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open();
    }
  }

  _onSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const visibleItems = [];

    this.items.forEach((item) => {
      if (!query) {
        item.hidden = false;
        visibleItems.push(item);
        return;
      }
      const name = item.dataset.riverName || '';
      const region = item.dataset.riverRegion || '';
      const match = name.includes(query) || region.includes(query);
      item.hidden = !match;
      if (match) visibleItems.push(item);
    });

    // Hide groups with no visible items
    this.groups.forEach((group) => {
      const hasVisible = !!group.querySelector('[data-picker-item]:not([hidden])');
      group.hidden = !hasVisible;
    });

    this.emptyState.hidden = visibleItems.length > 0;
    this._clearActive();
  }

  _onSearchKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._moveActive(1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      this.trigger.focus();
    } else if (e.key === 'Enter') {
      const items = this._visibleItems();
      if (items.length === 1) {
        e.preventDefault();
        items[0].querySelector('.river-picker__link')?.click();
      } else if (this.activeIndex >= 0) {
        e.preventDefault();
        items[this.activeIndex]?.querySelector('.river-picker__link')?.click();
      }
    }
  }

  _onPanelKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      this.trigger.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._moveActive(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      this._setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      const items = this._visibleItems();
      this._setActive(items.length - 1);
    }
  }

  _visibleItems() {
    return this.items.filter((i) => !i.hidden);
  }

  _clearActive() {
    this.items.forEach((i) => i.classList.remove('river-picker__item--active'));
    this.activeIndex = -1;
  }

  _setActive(index) {
    const items = this._visibleItems();
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    this._clearActive();
    this.activeIndex = clamped;
    const target = items[clamped];
    target.classList.add('river-picker__item--active');
    target.querySelector('.river-picker__link')?.scrollIntoView({ block: 'nearest' });
  }

  _moveActive(delta) {
    const items = this._visibleItems();
    if (items.length === 0) return;
    const next = this.activeIndex < 0 ? (delta > 0 ? 0 : items.length - 1) : this.activeIndex + delta;
    const wrapped = ((next % items.length) + items.length) % items.length;
    this._setActive(wrapped);
  }
}

if (!customElements.get('river-picker')) {
  customElements.define('river-picker', RiverPicker);
}
