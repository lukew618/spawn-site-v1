if (!customElements.get('spawn-collection-sort')) {
  customElements.define('spawn-collection-sort', class SpawnCollectionSort extends HTMLElement {
    static restoreFocusId = null;

    connectedCallback() {
      this.select = this.querySelector('select[name="sort_by"]');
      this.trigger = this.querySelector('.cp-sort__trigger');
      this.list = this.querySelector('.cp-sort__list');
      this.options = [...this.querySelectorAll('[role="option"]')];
      if (!this.select || !this.trigger || !this.options.length) return;
      this.events = new AbortController();
      const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler, { ...options, signal: this.events.signal });
      this.querySelector('.cp-sort__native').hidden = true;
      this.trigger.hidden = false;
      this.syncSelection();
      listen(this.trigger, 'click', () => this.opened ? this.close() : this.open());
      listen(this.trigger, 'keydown', (event) => this.onKeydown(event));
      listen(this.list, 'mousedown', (event) => event.preventDefault());
      listen(this.list, 'pointermove', (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) this.activate(this.options.indexOf(option), false);
      });
      listen(this.list, 'click', (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) this.choose(this.options.indexOf(option));
      });
      listen(this.select, 'change', () => this.syncSelection());
      listen(document, 'pointerdown', (event) => {
        if (this.contains(event.target)) return;
        this.close();
        if (SpawnCollectionSort.restoreFocusId === this.id) SpawnCollectionSort.restoreFocusId = null;
      });
      listen(this, 'focusout', () => queueMicrotask(() => {
        if (this.isConnected && !this.contains(document.activeElement)) this.close();
      }));
      listen(window, 'resize', () => this.opened && this.positionMenu(), { passive: true });
      listen(window, 'scroll', () => this.opened && this.positionMenu(), { passive: true });
      if (SpawnCollectionSort.restoreFocusId === this.id) {
        SpawnCollectionSort.restoreFocusId = null;
        requestAnimationFrame(() => {
          if (this.isConnected && document.activeElement === document.body) this.trigger.focus({ preventScroll: true });
        });
      }
    }

    disconnectedCallback() { this.events?.abort(); }

    syncSelection() {
      this.querySelector('.cp-sort__value').textContent = this.select.selectedOptions[0].textContent.trim();
      this.options.forEach((option) => option.setAttribute('aria-selected', String(option.dataset.value === this.select.value)));
      this.activeIndex = this.options.findIndex((option) => option.dataset.value === this.select.value);
    }

    open() {
      this.opened = true;
      this.trigger.focus({ preventScroll: true });
      this.trigger.setAttribute('aria-expanded', 'true');
      this.list.hidden = false;
      this.positionMenu();
      this.activate(Math.max(0, this.activeIndex));
    }

    close() {
      this.opened = false;
      this.list.hidden = true;
      this.trigger.setAttribute('aria-expanded', 'false');
      this.trigger.removeAttribute('aria-activedescendant');
      this.search = '';
      this.syncSelection();
    }

    positionMenu() {
      const rect = this.trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return this.close();
      const below = window.innerHeight - rect.bottom - 20;
      const headerBottom = document.querySelector('.sh-masthead')?.getBoundingClientRect().bottom || 0;
      const above = rect.top - Math.max(20, headerBottom + 12);
      const up = below < 240 && above > below;
      this.toggleAttribute('data-open-up', up);
      this.style.setProperty('--cp-sort-max-height', `${Math.max(88, Math.min(410, up ? above : below))}px`);
    }

    activate(index, scroll = true) {
      this.activeIndex = Math.max(0, Math.min(index, this.options.length - 1));
      this.options.forEach((option, i) => option.toggleAttribute('data-active', i === this.activeIndex));
      const active = this.options[this.activeIndex];
      this.trigger.setAttribute('aria-activedescendant', active.id);
      if (scroll) {
        const top = active.offsetTop;
        const bottom = top + active.offsetHeight;
        if (top < this.list.scrollTop) this.list.scrollTop = top;
        else if (bottom > this.list.scrollTop + this.list.clientHeight) this.list.scrollTop = bottom - this.list.clientHeight;
      }
    }

    choose(index) {
      const next = this.options[index].dataset.value;
      const changed = this.select.value !== next;
      this.select.value = next;
      this.close();
      this.trigger.focus({ preventScroll: true });
      if (!changed) return;
      // Dawn replaces .sorting after its AJAX response. Restore focus only if the user stayed here.
      SpawnCollectionSort.restoreFocusId = this.id;
      this.select.dispatchEvent(new Event('input', { bubbles: true }));
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    onKeydown(event) {
      const key = event.key;
      if (key === 'Tab') {
        SpawnCollectionSort.restoreFocusId = null;
        this.close();
        return;
      }
      if (key === 'Escape') {
        if (this.opened) { event.preventDefault(); event.stopPropagation(); this.close(); }
        return;
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.opened ? this.choose(this.activeIndex) : this.open();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
        event.preventDefault();
        const wasOpen = this.opened;
        if (!wasOpen) this.open();
        if (key === 'Home') this.activate(0);
        else if (key === 'End') this.activate(this.options.length - 1);
        else if (wasOpen) this.activate(this.activeIndex + (key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (!this.opened) this.open();
      const now = performance.now();
      this.search = now - (this.searchTime || 0) < 650 ? (this.search || '') + key.toLowerCase() : key.toLowerCase();
      this.searchTime = now;
      const term = [...this.search].every((letter) => letter === this.search[0]) ? this.search[0] : this.search;
      const start = term.length > 1 ? 0 : 1;
      for (let step = start; step < this.options.length + start; step++) {
        const index = (this.activeIndex + step) % this.options.length;
        if (this.options[index].textContent.trim().toLowerCase().startsWith(term)) {
          this.activate(index);
          break;
        }
      }
    }
  });
}
