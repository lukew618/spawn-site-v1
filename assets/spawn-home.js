/* Homepage interactions. Product links and scrolling work without JavaScript. */
class SpawnProductRail extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('.sh-product-track');
    this.controls = this.querySelector('.sh-rail-controls');
    this.position = this.querySelector('.sh-rail-position');
    this.previous = this.querySelector('[data-direction="previous"]');
    this.next = this.querySelector('[data-direction="next"]');
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    this.update = () => {
      const max = this.track.scrollWidth - this.track.clientWidth;
      this.controls.hidden = max < 4;
      this.previous.disabled = this.track.scrollLeft < 4;
      this.next.disabled = this.track.scrollLeft >= max - 4;
      const items = [...this.track.children];
      const bounds = this.track.getBoundingClientRect();
      const visible = items.map((item, index) => ({ index, rect: item.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left < bounds.right - 20 && rect.right > bounds.left + 20);
      if (visible.length) {
        const label = `${visible[0].index + 1}–${visible.at(-1).index + 1} / ${items.length}`;
        if (this.position.textContent !== label) this.position.textContent = label;
      }
    };
    this.controls.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-direction]');
      if (!button) return;
      this.track.scrollBy({ left: this.track.clientWidth * (button.dataset.direction === 'next' ? 1 : -1), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, options);
    this.track.addEventListener('scroll', () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(this.update);
    }, { ...options, passive: true });
    this.observer = new ResizeObserver(this.update);
    this.observer.observe(this.track);
    this.update();
  }
  disconnectedCallback() { this.abort?.abort(); this.observer?.disconnect(); cancelAnimationFrame(this.frame); }
}
class SpawnHomeHeader extends HTMLElement {
  connectedCallback() {
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    const menus = [...this.querySelectorAll('.sh-nav details')];
    const desktopHover = matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
    const updateHeader = () => this.classList.toggle('is-scrolled', window.scrollY > 50);
    updateHeader();
    window.addEventListener('scroll', () => {
      cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = requestAnimationFrame(updateHeader);
    }, { ...options, passive: true });
    const drawer = this.querySelector('#drawer-menu');
    const toggle = this.querySelector('#mobile-menu-toggle');
    this.drawerObserver = new MutationObserver(() => {
      toggle.setAttribute('aria-expanded', String(!drawer.classList.contains('hidden')));
    });
    this.drawerObserver.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    matchMedia('(min-width: 1100px)').addEventListener('change', event => {
      if (event.matches && !drawer.classList.contains('hidden')) this.querySelector('#drawer-menu-close').click();
      if (!event.matches) menus.forEach(menu => { menu.open = false; });
    }, options);
    menus.forEach(menu => {
      menu.addEventListener('pointerenter', () => {
        if (!desktopHover.matches) return;
        clearTimeout(menu.closeTimer);
        if (!menu.open) { menu.open = true; menu.openedByHover = true; }
      }, options);
      menu.addEventListener('pointerleave', () => {
        if (!desktopHover.matches) return;
        menu.closeTimer = setTimeout(() => { menu.open = false; menu.openedByHover = false; }, 150);
      }, options);
      menu.querySelector('summary').addEventListener('click', event => {
        if (event.detail && menu.openedByHover && menu.open) {
          event.preventDefault();
          menu.openedByHover = false;
        }
      }, options);
      menu.addEventListener('toggle', () => {
        if (menu.open) menus.filter(other => other !== menu).forEach(other => { other.open = false; });
      }, options);
      menu.addEventListener('focusout', event => {
        if (!menu.contains(event.relatedTarget)) menu.open = false;
      }, options);
    });
    document.addEventListener('click', event => {
      menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
    }, options);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const active = menus.find(menu => menu.open);
      if (active) { active.open = false; active.querySelector('summary').focus(); }
    }, options);
  }
  disconnectedCallback() {
    this.abort?.abort(); this.drawerObserver?.disconnect(); cancelAnimationFrame(this.scrollFrame);
    this.querySelectorAll('.sh-nav details').forEach(menu => clearTimeout(menu.closeTimer));
  }
}
if (!customElements.get('spawn-product-rail')) customElements.define('spawn-product-rail', SpawnProductRail);
if (!customElements.get('spawn-home-header')) customElements.define('spawn-home-header', SpawnHomeHeader);

function setupSpawnFooter() {
  const menus = document.querySelectorAll('.sh-footer-menu');
  const desktop = matchMedia('(min-width: 750px)');
  const setMenus = () => menus.forEach(menu => { menu.open = desktop.matches; });
  setMenus();
  desktop.addEventListener('change', setMenus);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupSpawnFooter, { once: true });
else setupSpawnFooter();
