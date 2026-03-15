// assets/drawer-menu.js

document.addEventListener("DOMContentLoaded", () => {
  const drawerMenu = document.getElementById("drawer-menu");
  const drawerOverlay = document.getElementById("drawer-menu-overlay");
  const drawerCloseBtn = document.getElementById("drawer-menu-close");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const drawerTriggers = document.querySelectorAll("[data-opens-drawer]");

  function closeDrawer() {
    drawerMenu.classList.add("hidden");
    document.documentElement.classList.remove("no-scroll");
    drawerTriggers.forEach((t) => t.setAttribute("aria-expanded", "false"));
    if (mobileMenuToggle) {
      mobileMenuToggle.classList.remove("is-open");
      mobileMenuToggle.setAttribute("aria-label", "Open Navigation");
    }
  }

  // Open drawer when any desktop nav item with children is clicked
  drawerTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      drawerMenu.classList.remove("hidden");
      document.documentElement.classList.add("no-scroll");
      trigger.setAttribute("aria-expanded", "true");
    });
  });

  // Open/close drawer via mobile hamburger
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!drawerMenu.classList.contains("hidden")) {
        closeDrawer();
      } else {
        drawerMenu.classList.remove("hidden");
        document.documentElement.classList.add("no-scroll");
        mobileMenuToggle.classList.add("is-open");
        mobileMenuToggle.setAttribute("aria-label", "Close Navigation");
      }
    });
  }

  // Close via overlay click
  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", closeDrawer);
  }

  // Close via close button
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener("click", closeDrawer);
  }

  // Close when clicking outside the drawer
  document.addEventListener("click", (event) => {
    if (
      !drawerMenu.classList.contains("hidden") &&
      !drawerMenu.contains(event.target) &&
      event.target !== mobileMenuToggle
    ) {
      closeDrawer();
    }
  });

  // Collapsible submenus inside the drawer
  document
    .querySelectorAll(".drawer-menu__link[aria-expanded]")
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const isExpanded = link.getAttribute("aria-expanded") === "true";
        const submenu = document.getElementById(link.getAttribute("aria-controls"));
        link.setAttribute("aria-expanded", !isExpanded);
        submenu.classList.toggle("is-visible", !isExpanded);
      });
    });
});
