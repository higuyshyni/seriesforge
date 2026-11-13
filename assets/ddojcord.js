(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const demo = document.querySelector("#demo-window");
  if (demo) {
    document.querySelectorAll("[data-skin-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const skin = button.getAttribute("data-skin-choice");
        demo.setAttribute("data-skin", skin);
        document.querySelectorAll("[data-skin-choice]").forEach((item) => {
          item.setAttribute("aria-pressed", String(item === button));
        });
      });
    });

    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-toggle");
        const active = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(active));
        demo.setAttribute("data-" + key, active ? "on" : "off");
      });
    });
  }

  if (!reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        element.style.setProperty("--tilt-x", ((0.5 - y) * 5.5).toFixed(2) + "deg");
        element.style.setProperty("--tilt-y", ((x - 0.5) * 7).toFixed(2) + "deg");
      });
      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--tilt-x", "0deg");
        element.style.setProperty("--tilt-y", "0deg");
      });
    });

    const revealItems = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
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
  } else {
    document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();