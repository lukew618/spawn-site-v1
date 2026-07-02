if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      connectedCallback() {
        this.mainProduct = document.querySelector('product-info[id^="MainProduct-"]');
        if (!this.mainProduct) return;

        this.mainButtons = this.mainProduct.querySelector('.product-form__buttons');
        this.mainSubmit = this.mainProduct.querySelector('.product-form__submit');
        this.button = this.querySelector('[data-sticky-submit]');
        this.buttonText = this.querySelector('[data-sticky-submit-text]');
        this.priceContainer = this.mainProduct.querySelector('[id^="price-"]');
        this.price = this.querySelector('[data-sticky-price]');
        if (!this.mainButtons || !this.mainSubmit || !this.button) return;

        this.button.addEventListener('click', this.submitMainForm.bind(this));

        // IntersectionObserver misses jump-scrolls that skip the visible state
        // (anchor links, End key), so track the buttons' position directly.
        this.updateVisibility = this.updateVisibility.bind(this);
        this.onScroll = this.onScroll.bind(this);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onScroll, { passive: true });
        this.updateVisibility();

        // Variant changes re-render the main price and submit button; mirror them.
        this.mutationObserver = new MutationObserver(this.syncFromMainProduct.bind(this));
        this.mutationObserver.observe(this.mainSubmit, {
          attributes: true,
          attributeFilter: ['disabled'],
          childList: true,
          subtree: true,
          characterData: true,
        });
        if (this.priceContainer) {
          this.mutationObserver.observe(this.priceContainer, { childList: true, subtree: true, characterData: true });
        }
        this.syncFromMainProduct();
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onScroll);
        if (this.mutationObserver) this.mutationObserver.disconnect();
      }

      onScroll() {
        if (this.scrollScheduled) return;
        this.scrollScheduled = true;
        requestAnimationFrame(() => {
          this.scrollScheduled = false;
          this.updateVisibility();
        });
      }

      updateVisibility() {
        const scrolledPast = this.mainButtons.getBoundingClientRect().bottom < 0;
        this.toggleAttribute('hidden', !scrolledPast);
      }

      syncFromMainProduct() {
        this.button.toggleAttribute('disabled', this.mainSubmit.hasAttribute('disabled'));
        const mainLabel = this.mainSubmit.querySelector('span');
        if (mainLabel && this.buttonText) this.buttonText.textContent = mainLabel.textContent.trim();
        if (this.priceContainer && this.price) {
          const mainPrice = this.priceContainer.querySelector('.price');
          if (mainPrice) this.price.innerHTML = mainPrice.outerHTML;
        }
      }

      submitMainForm() {
        if (this.button.hasAttribute('disabled')) return;
        const form = this.mainProduct.querySelector('form[data-type="add-to-cart-form"]');
        if (form) form.requestSubmit();
      }
    }
  );
}
