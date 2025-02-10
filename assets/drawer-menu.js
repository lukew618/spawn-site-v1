// assets/drawer-menu.js

document.addEventListener("DOMContentLoaded", () => {
  // Get the shop-button which should trigger the drawer menu
  const shopButton = document.getElementById("shop-button");
  const drawerMenu = document.getElementById("drawer-menu");
  const drawerOverlay = document.getElementById("drawer-menu-overlay");
  const drawerCloseBtn = document.getElementById("drawer-menu-close");

  // Open drawer when the shop button is clicked (desktop)
  if (shopButton) {
    shopButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent the click from bubbling to document
      drawerMenu.classList.remove("hidden");
      document.documentElement.classList.add("no-scroll");
    });
  }

  // Open drawer when the mobile menu (hamburger) is clicked
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", (event) => {
      event.stopPropagation();

      // Check if drawer is already open
      if (!drawerMenu.classList.contains("hidden")) {
        // Close the drawer if it's open
        drawerMenu.classList.add("hidden");
        document.documentElement.classList.remove("no-scroll");
        mobileMenuToggle.classList.remove("is-open");
        mobileMenuToggle.setAttribute("aria-label", "Open Navigation");
      } else {
        // Open the drawer if it's closed
        drawerMenu.classList.remove("hidden");
        document.documentElement.classList.add("no-scroll");
        mobileMenuToggle.classList.add("is-open");
        mobileMenuToggle.setAttribute("aria-label", "Close Navigation");
      }
    });
  }

  // Close drawer by overlay click
  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", () => {
      drawerMenu.classList.add("hidden");
      document.documentElement.classList.remove("no-scroll");
      mobileMenuToggle.classList.remove("is-open"); // Remove class for animation
      mobileMenuToggle.setAttribute("aria-label", "Open Navigation");
    });
  }

  // Close drawer by close button
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener("click", () => {
      drawerMenu.classList.add("hidden");
      document.documentElement.classList.remove("no-scroll");
      mobileMenuToggle.classList.remove("is-open"); // Remove class for animation
      mobileMenuToggle.setAttribute("aria-label", "Open Navigation");
    });
  }

  // Close drawer when user clicks outside the drawer container
  document.addEventListener("click", (event) => {
    if (
      !drawerMenu.classList.contains("hidden") &&
      !drawerMenu.contains(event.target) &&
      event.target !== mobileMenuToggle // Don't close if clicking the toggle button
    ) {
      drawerMenu.classList.add("hidden");
      document.documentElement.classList.remove("no-scroll");
      mobileMenuToggle.classList.remove("is-open"); // Remove class for animation
      mobileMenuToggle.setAttribute("aria-label", "Open Navigation");
    }
  });

  // Add collapsible functionality for mobile menu
  const collapsibleLinks = document.querySelectorAll(
    ".drawer-menu__link[aria-expanded]"
  );

  collapsibleLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const isExpanded = link.getAttribute("aria-expanded") === "true";
      const submenuId = link.getAttribute("aria-controls");
      const submenu = document.getElementById(submenuId);

      // Toggle the expanded state
      link.setAttribute("aria-expanded", !isExpanded);

      // Toggle the submenu visibility
      if (!isExpanded) {
        submenu.classList.add("is-visible");
      } else {
        submenu.classList.remove("is-visible");
      }
    });
  });
});
