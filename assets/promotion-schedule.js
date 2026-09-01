if (!customElements.get('promotion-schedule')) {
  customElements.define(
    'promotion-schedule',
    class PromotionSchedule extends HTMLElement {
      connectedCallback() {
        const now = Date.now();
        const startsAt = Date.parse(this.dataset.startsAt);
        const endsAt = Date.parse(this.dataset.endsAt);

        this.querySelector('[data-promotion-scheduled]')?.toggleAttribute('hidden', now >= startsAt);
        this.querySelector('[data-promotion-active]')?.toggleAttribute(
          'hidden',
          now < startsAt || now > endsAt
        );
      }
    }
  );
}
