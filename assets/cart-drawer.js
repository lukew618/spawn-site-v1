class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    this.querySelector("#CartDrawer-Overlay").addEventListener(
      "click",
      this.close.bind(this)
    );
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLinks = document.querySelectorAll(
      "#cart-icon-bubble, #cart-icon-bubble-mobile"
    );
    cartLinks.forEach((cartLink) => {
      if (!cartLink) return;

      cartLink.setAttribute("role", "button");
      cartLink.setAttribute("aria-haspopup", "dialog");
      cartLink.setAttribute("aria-controls", "CartDrawer");
      cartLink.setAttribute("aria-expanded", "false");
      cartLink.addEventListener("click", (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener("keydown", (event) => {
        if (event.code.toUpperCase() === "SPACE") {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role"))
      this.setSummaryAccessibility(cartDrawerNote);
    // Give the drawer a visible frame before focusing its controls, including with reduced motion.
    clearTimeout(this.openTimer);
    cancelAnimationFrame(this.focusFrame);
    this.openTimer = setTimeout(() => {
      this.classList.add("animate", "active");
      this.focusFrame = requestAnimationFrame(() => {
        this.focusFrame = requestAnimationFrame(() => {
          if (this.classList.contains('active')) trapFocus(this.querySelector(".drawer__inner"), this.querySelector(".drawer__close"));
        });
      });
    });
    document.querySelectorAll('#cart-icon-bubble, #cart-icon-bubble-mobile').forEach(link => link.setAttribute('aria-expanded', 'true'));

    document.body.classList.add("overflow-hidden");
  }

  close() {
    clearTimeout(this.openTimer);
    cancelAnimationFrame(this.focusFrame);
    this.classList.remove("active");
    document.querySelectorAll('#cart-icon-bubble, #cart-icon-bubble-mobile').forEach(link => link.setAttribute('aria-expanded', 'false'));
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute("role", "button");
    cartDrawerNote.setAttribute("aria-expanded", "false");

    if (cartDrawerNote.nextElementSibling.getAttribute("id")) {
      cartDrawerNote.setAttribute(
        "aria-controls",
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    });

    cartDrawerNote.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector(".drawer__inner").classList.contains("is-empty") &&
      this.querySelector(".drawer__inner").classList.remove("is-empty");
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    this.classList.toggle("is-empty", Boolean(this.querySelector(".drawer__inner-empty")));
    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay").addEventListener(
        "click",
        this.close.bind(this)
      );
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-drawer",
        selector: "#CartDrawer",
      },
      {
        id: "cart-icon-bubble",
      },
    ];
  }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-drawer", CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "CartDrawer",
        section: "cart-drawer",
        selector: ".drawer__inner",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
    ];
  }
}

customElements.define("cart-drawer-items", CartDrawerItems);
