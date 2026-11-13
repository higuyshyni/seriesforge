(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.matchMedia("(hover: none)").matches) document.body.classList.add("touch-device");

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  const lightButtons = Array.from(document.querySelectorAll("[data-light-switch]"));
  const setLights = (on) => {
    document.body.classList.toggle("lights-on", on);
    document.body.classList.toggle("lights-off", !on);
    lightButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(on));
      const label = button.querySelector("[data-light-label]");
      if (label) label.textContent = on ? "LIGHTS ON" : "LIGHTS OFF";
    });
  };
  lightButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLights(!document.body.classList.contains("lights-on"));
    });
  });

  document.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--flash-x", event.clientX + "px");
    document.documentElement.style.setProperty("--flash-y", event.clientY + "px");
  }, { passive: true });
  document.addEventListener("pointerdown", (event) => {
    document.documentElement.style.setProperty("--flash-x", event.clientX + "px");
    document.documentElement.style.setProperty("--flash-y", event.clientY + "px");
  }, { passive: true });

  if (!reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        element.style.setProperty("--tilt-x", ((0.5 - y) * 3.2).toFixed(2) + "deg");
        element.style.setProperty("--tilt-y", ((x - 0.5) * 4.5).toFixed(2) + "deg");
      });
      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--tilt-x", "0deg");
        element.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();