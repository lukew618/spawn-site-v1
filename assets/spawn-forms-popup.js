(() => {
  const script = document.currentScript;
  const stylesheetUrl = script?.dataset.stylesheetUrl;
  const elementName = 'shopify-forms-embed';
  const marker = 'data-spawn-popup-styles';

  if (!stylesheetUrl) return;

  const attachStyles = (host) => {
    const root = host.shadowRoot;

    if (!root || root.querySelector(`link[${marker}]`)) return;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetUrl;
    stylesheet.setAttribute(marker, '');
    root.appendChild(stylesheet);
  };

  const scan = () => {
    document.querySelectorAll(elementName).forEach(attachStyles);
  };

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  customElements.whenDefined(elementName).then(scan);
  scan();
})();
