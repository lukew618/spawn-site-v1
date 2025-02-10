class HeaderScroll extends HTMLElement {
  constructor() {
    super();
    this.header = document.querySelector(".header");
    this.scrollThreshold = 50;
    this.isHomepage = document.body.classList.contains("template-index");
    this.handleScroll = this.handleScroll.bind(this);

    // Always initialize scroll state
    this.handleScroll();

    // Always add scroll listener
    window.addEventListener("scroll", this.handleScroll);

    // Clean up event listener when component is removed
    this.disconnectedCallback = () => {
      window.removeEventListener("scroll", this.handleScroll);
    };
  }

  handleScroll() {
    if (!this.isHomepage) return;

    if (window.scrollY > this.scrollThreshold) {
      document.body.classList.add("scrolled-past-header");
    } else {
      document.body.classList.remove("scrolled-past-header");
    }
  }
}

customElements.define("header-scroll", HeaderScroll);

document.addEventListener("DOMContentLoaded", function () {
  const homepageHeader = document.querySelector(".site-header--homepage");
  if (!homepageHeader) return;

  window.addEventListener("scroll", function () {
    if (window.scrollY > 0) {
      homepageHeader.classList.add("scrolled");
    } else {
      homepageHeader.classList.remove("scrolled");
    }
  });
});
