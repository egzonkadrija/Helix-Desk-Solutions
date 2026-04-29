const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const globeLinkCanvas = document.querySelector("#globe-link-canvas");
const globeCanvas = document.querySelector("#globe-canvas");
const globeShell = document.querySelector(".globe-shell");
const continentAnchors = Array.from(
  document.querySelectorAll("[data-continent-anchor]")
);
const heroStage = document.querySelector(".hero-stage");
const scrollTopButton = document.querySelector(".scroll-top-button");
const sectionScrollTargets = Array.from(
  document.querySelectorAll("main > .hero, main > .metrics, main > .section")
);
const motionLibrary = window.Motion;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const sectionPagingQuery = window.matchMedia("(min-width: 761px)");
let scrollAnimationFrame = 0;

const isElement = (target) => target instanceof Element;

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const getMaxScrollTop = () =>
  Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
    document.body.scrollHeight - window.innerHeight
  );

const easeScroll = (progress) =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

const animateWindowScroll = (targetTop, options = {}) => {
  const target = clampValue(targetTop, 0, getMaxScrollTop());
  const start = window.scrollY;
  const distance = target - start;

  window.cancelAnimationFrame(scrollAnimationFrame);

  if (reducedMotionQuery.matches || Math.abs(distance) < 2) {
    window.scrollTo(0, target);
    return 0;
  }

  const duration =
    options.duration ?? clampValue(720 + Math.abs(distance) * 0.16, 820, 1180);
  const startTime = performance.now();

  const tick = (time) => {
    const progress = clampValue((time - startTime) / duration, 0, 1);
    const eased = easeScroll(progress);

    window.scrollTo(0, start + distance * eased);

    if (progress < 1) {
      scrollAnimationFrame = window.requestAnimationFrame(tick);
    } else {
      window.scrollTo(0, target);
    }
  };

  scrollAnimationFrame = window.requestAnimationFrame(tick);

  return duration;
};

const syncHeaderState = () => {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > 18);
};

const syncScrollTopState = () => {
  if (!scrollTopButton) return;
  const isVisible = window.scrollY > 520;
  scrollTopButton.classList.toggle("is-visible", isVisible);
  scrollTopButton.setAttribute("aria-hidden", String(!isVisible));

  if (isVisible) {
    scrollTopButton.removeAttribute("tabindex");
  } else {
    scrollTopButton.setAttribute("tabindex", "-1");
  }
};

const setupSmoothScrolling = () => {
  const handleAnchorClick = (event) => {
    if (!isElement(event.target)) return;

    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) {
      return;
    }

    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = hash === "#top"
      ? document.querySelector("#top")
      : document.getElementById(decodeURIComponent(hash.slice(1)));

    if (!target) return;

    event.preventDefault();

    const targetTop = hash === "#top"
      ? 0
      : target.getBoundingClientRect().top + window.scrollY;

    animateWindowScroll(targetTop, { duration: 980 });

    window.history.pushState(null, "", hash);
  };

  document.addEventListener("click", handleAnchorClick);

  return () => document.removeEventListener("click", handleAnchorClick);
};

const setupSectionScrolling = () => {
  if (reducedMotionQuery.matches || sectionScrollTargets.length < 2) {
    return () => {};
  }

  const root = document.documentElement;
  let sectionTops = [];
  let activeIndex = 0;
  let isPaging = false;
  let releaseTimer = 0;
  let resizeTimer = 0;
  let touchStart = null;

  const isSectionPagingEnabled = () => sectionPagingQuery.matches;

  const getScrollableParent = (target, deltaY) => {
    let current = isElement(target) ? target : null;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const canScroll = /(auto|scroll)/.test(style.overflowY);

      if (canScroll && current.scrollHeight > current.clientHeight + 1) {
        const atTop = current.scrollTop <= 0;
        const atBottom =
          current.scrollTop + current.clientHeight >= current.scrollHeight - 1;

        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
          return current;
        }
      }

      current = current.parentElement;
    }

    return null;
  };

  const syncActiveIndex = () => {
    const currentY = window.scrollY;
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    sectionTops.forEach((top, index) => {
      const distance = Math.abs(top - currentY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    activeIndex = nearestIndex;
    return nearestIndex;
  };

  const measureSections = () => {
    const maxScroll = getMaxScrollTop();

    sectionTops = sectionScrollTargets.map((section) =>
      clampValue(
        section.getBoundingClientRect().top + window.scrollY,
        0,
        maxScroll
      )
    );

    syncActiveIndex();
  };

  const goToSection = (index) => {
    const targetIndex = clampValue(index, 0, sectionTops.length - 1);
    const targetTop = sectionTops[targetIndex] ?? 0;

    if (Math.abs(window.scrollY - targetTop) < 2) {
      activeIndex = targetIndex;
      return;
    }

    isPaging = true;
    activeIndex = targetIndex;

    const duration = animateWindowScroll(targetTop, {
      duration: clampValue(
        760 + Math.abs(targetTop - window.scrollY) * 0.17,
        860,
        1240
      ),
    });

    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      isPaging = false;
      syncActiveIndex();
    }, duration + 90);
  };

  const stepSection = (direction) => {
    if (!isSectionPagingEnabled() || isPaging || direction === 0) return;

    measureSections();

    const currentIndex = syncActiveIndex();
    const currentTop = sectionTops[currentIndex] ?? 0;
    const shouldSettleCurrent =
      direction < 0 && window.scrollY > currentTop + window.innerHeight * 0.12;
    const targetIndex = shouldSettleCurrent
      ? currentIndex
      : currentIndex + direction;

    goToSection(targetIndex);
  };

  const handleWheel = (event) => {
    if (!isSectionPagingEnabled()) return;

    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ) {
      return;
    }

    if (getScrollableParent(event.target, event.deltaY)) {
      return;
    }

    const direction = event.deltaY > 0 ? 1 : -1;

    if (Math.abs(event.deltaY) < 4) return;

    event.preventDefault();
    stepSection(direction);
  };

  const handleKeyDown = (event) => {
    if (!isSectionPagingEnabled()) return;

    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (
      isElement(event.target) &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }

    const forwardKeys = new Set(["ArrowDown", "PageDown"]);
    const backKeys = new Set(["ArrowUp", "PageUp"]);

    if (event.code === "Space") {
      event.preventDefault();
      stepSection(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      measureSections();
      goToSection(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      measureSections();
      goToSection(sectionScrollTargets.length - 1);
      return;
    }

    if (forwardKeys.has(event.key) || backKeys.has(event.key)) {
      event.preventDefault();
      stepSection(forwardKeys.has(event.key) ? 1 : -1);
    }
  };

  const handleTouchStart = (event) => {
    if (!isSectionPagingEnabled() || event.touches.length !== 1 || isPaging) {
      return;
    }

    const touch = event.touches[0];
    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchMove = (event) => {
    if (!isSectionPagingEnabled()) return;
    if (!touchStart || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    if (Math.abs(deltaY) > 14 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event) => {
    if (!isSectionPagingEnabled()) {
      touchStart = null;
      return;
    }

    if (!touchStart || event.changedTouches.length !== 1) {
      touchStart = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touchStart.y - touch.clientY;

    touchStart = null;

    if (Math.abs(deltaY) < 54 || Math.abs(deltaY) < Math.abs(deltaX) * 1.12) {
      return;
    }

    stepSection(deltaY > 0 ? 1 : -1);
  };

  const handleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measureSections, 120);
  };

  root.classList.add("section-scroll-ready");
  measureSections();

  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("load", measureSections);

  return () => {
    root.classList.remove("section-scroll-ready");
    window.clearTimeout(releaseTimer);
    window.clearTimeout(resizeTimer);
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("touchcancel", handleTouchEnd);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("load", measureSections);
  };
};

const setupFallbackReveals = () => {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  const revealGroups = new Map();

  reveals.forEach((item) => {
    const group = item.closest("section, .metrics") || document.body;
    const groupIndex = revealGroups.get(group) || 0;
    revealGroups.set(group, groupIndex + 1);

    item.style.setProperty(
      "--reveal-delay",
      `${Math.min(groupIndex * 90, 270)}ms`
    );
    revealObserver.observe(item);
  });

  return () => revealObserver.disconnect();
};

const setupMotionPageTransitions = () => {
  const motion = motionLibrary;

  if (!motion?.animate || !motion?.inView || reducedMotionQuery.matches) {
    return setupFallbackReveals();
  }

  const cleanups = [];
  const revealGroups = new Map();
  const easeOut = [0.16, 1, 0.3, 1];

  document.body.classList.add("motion-ready");

  if (topbar) {
    motion.animate(
      topbar,
      {
        opacity: [0, 1],
        transform: [
          "translateX(-50%) translateY(-10px) scale(0.985)",
          "translateX(-50%) translateY(0) scale(1)",
        ],
        filter: ["blur(8px)", "blur(0px)"],
      },
      { duration: 0.7, ease: easeOut }
    );
  }

  reveals.forEach((item) => {
    const group = item.closest("section, .metrics") || document.body;
    const groupIndex = revealGroups.get(group) || 0;
    const delay = Math.min(groupIndex * 0.08, 0.28);
    revealGroups.set(group, groupIndex + 1);

    item.style.opacity = "0";
    item.style.transform = "translate3d(0, 34px, 0) scale(0.982)";
    item.style.filter = "blur(12px)";

    cleanups.push(
      motion.inView(
        item,
        (element) => {
          const transition = motion.animate(
            element,
            {
              opacity: [0, 1],
              transform: [
                "translate3d(0, 34px, 0) scale(0.982)",
                "translate3d(0, 0, 0) scale(1)",
              ],
              filter: ["blur(12px)", "blur(0px)"],
            },
            { duration: 0.82, delay, ease: easeOut }
          );
          transition.then?.(() => element.classList.add("is-visible"));
        },
        { amount: 0.18, margin: "0px 0px -10% 0px" }
      )
    );
  });

  if (motion.hover) {
    document
      .querySelectorAll(
        ".button, .header-cta, .contact-links a, .scroll-top-button, .call-button"
      )
      .forEach((item) => {
        cleanups.push(
          motion.hover(item, () => {
            motion.animate(
              item,
              { filter: "brightness(1.08)", scale: 1.012 },
              { duration: 0.22, ease: "easeOut" }
            );

            return () => {
              motion.animate(
                item,
                { filter: "brightness(1)", scale: 1 },
                { duration: 0.24, ease: "easeOut" }
              );
            };
          })
        );
      });
  }

  if (motion.press) {
    document
      .querySelectorAll(".button, .header-cta, .scroll-top-button, .call-button")
      .forEach((item) => {
        cleanups.push(
          motion.press(item, () => {
            motion.animate(
              item,
              { scale: 0.985 },
              { duration: 0.12, ease: "easeOut" }
            );

            return () => {
              motion.animate(
                item,
                { scale: 1 },
                { duration: 0.2, ease: "easeOut" }
              );
            };
          })
        );
      });
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup?.());
    document.body.classList.remove("motion-ready");
  };
};

const setupHeroStageMotion = () => {
  if (!heroStage) return () => {};

  heroStage.style.setProperty("--stage-x", "0px");
  heroStage.style.setProperty("--stage-y", "0px");
  heroStage.style.setProperty("--tilt-x", "0deg");
  heroStage.style.setProperty("--tilt-y", "0deg");

  return () => {};
};

const setupGlobeCanvas = () => {
  if (!globeCanvas) return () => {};

  const context = globeCanvas.getContext("2d");
  if (!context) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const routes = [
    [[51.5, -0.1], [40.7, -74]],
    [[52.2, 21], [1.35, 103.8]],
    [[48.8, 2.35], [35.7, 139.7]],
    [[41.9, 12.5], [-33.9, 151.2]],
    [[37.8, -122.4], [52.5, 13.4]],
  ];
  const globeLand = Array.isArray(window.HELIX_GLOBE_LAND)
    ? window.HELIX_GLOBE_LAND
    : [];
  const continentLandColors = {
    "North America": {
      fill: "rgba(244, 63, 94, 0.2)",
      stroke: "rgba(244, 63, 94, 0.5)",
      glow: "rgba(244, 63, 94, 0.2)",
    },
    "South America": {
      fill: "rgba(14, 165, 233, 0.2)",
      stroke: "rgba(14, 165, 233, 0.48)",
      glow: "rgba(14, 165, 233, 0.2)",
    },
    Europe: {
      fill: "rgba(148, 163, 184, 0.18)",
      stroke: "rgba(226, 232, 240, 0.42)",
      glow: "rgba(148, 163, 184, 0.18)",
    },
    Africa: {
      fill: "rgba(14, 165, 233, 0.19)",
      stroke: "rgba(14, 165, 233, 0.46)",
      glow: "rgba(14, 165, 233, 0.18)",
    },
    Asia: {
      fill: "rgba(148, 163, 184, 0.18)",
      stroke: "rgba(226, 232, 240, 0.4)",
      glow: "rgba(148, 163, 184, 0.17)",
    },
    Oceania: {
      fill: "rgba(244, 63, 94, 0.16)",
      stroke: "rgba(244, 63, 94, 0.36)",
      glow: "rgba(244, 63, 94, 0.14)",
    },
  };

  let size = 0;
  let center = 0;
  let radius = 0;
  let animationFrame = 0;
  let running = true;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = globeCanvas.getBoundingClientRect();
    size = Math.max(220, Math.min(rect.width || 360, rect.height || 360));
    center = size / 2;
    radius = size * 0.38;

    globeCanvas.width = Math.floor(size * ratio);
    globeCanvas.height = Math.floor(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const pointFromLatLon = ([lat, lon]) => {
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    const cosLat = Math.cos(latRad);

    return {
      x: cosLat * Math.sin(lonRad),
      y: Math.sin(latRad),
      z: cosLat * Math.cos(lonRad),
    };
  };

  const normalize = (point) => {
    const length = Math.hypot(point.x, point.y, point.z) || 1;

    return {
      x: point.x / length,
      y: point.y / length,
      z: point.z / length,
    };
  };

  const rotatePoint = (point, time) => {
    const rotation = reducedMotion.matches ? -0.55 : time * 0.00024 - 0.55;
    const tilt = -0.32;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    const rotatedY = {
      x: point.x * cosRotation + point.z * sinRotation,
      y: point.y,
      z: -point.x * sinRotation + point.z * cosRotation,
    };
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    return {
      x: rotatedY.x,
      y: rotatedY.y * cosTilt - rotatedY.z * sinTilt,
      z: rotatedY.y * sinTilt + rotatedY.z * cosTilt,
    };
  };

  const projectPoint = (point, time) => {
    const rotated = rotatePoint(point, time);
    const perspective = 1 + rotated.z * 0.16;

    return {
      x: center + rotated.x * radius * perspective,
      y: center - rotated.y * radius * perspective,
      z: rotated.z,
      visible: rotated.z > 0.02,
    };
  };

  const drawProjectedLine = (points, time, color, lineWidth) => {
    let drawing = false;

    context.beginPath();
    points.forEach((point) => {
      const projected = projectPoint(point, time);

      if (!projected.visible) {
        drawing = false;
        return;
      }

      if (!drawing) {
        context.moveTo(projected.x, projected.y);
        drawing = true;
      } else {
        context.lineTo(projected.x, projected.y);
      }
    });

    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.stroke();
  };

  const drawGlobeGrid = (time) => {
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 4) {
        points.push(pointFromLatLon([lat, lon]));
      }
      drawProjectedLine(points, time, "rgba(148, 163, 184, 0.16)", 0.9);
    }

    for (let lon = -150; lon <= 180; lon += 30) {
      const points = [];
      for (let lat = -78; lat <= 78; lat += 4) {
        points.push(pointFromLatLon([lat, lon]));
      }
      drawProjectedLine(points, time, "rgba(14, 165, 233, 0.12)", 0.8);
    }
  };

  const drawLandMasses = (time) => {
    if (!globeLand.length) return;

    context.save();
    context.beginPath();
    context.arc(center, center, radius * 0.99, 0, Math.PI * 2);
    context.clip();
    context.lineJoin = "round";
    context.lineCap = "round";

    globeLand.forEach((country) => {
      const colors = continentLandColors[country.c] || continentLandColors.Africa;

      country.r.forEach((ring) => {
        let drawing = false;
        let visiblePoints = 0;

        context.beginPath();
        ring.forEach((coordinate) => {
          const projected = projectPoint(pointFromLatLon(coordinate), time);

          if (!projected.visible) {
            if (drawing) {
              context.closePath();
              drawing = false;
            }
            return;
          }

          visiblePoints += 1;

          if (!drawing) {
            context.moveTo(projected.x, projected.y);
            drawing = true;
          } else {
            context.lineTo(projected.x, projected.y);
          }
        });

        if (drawing) {
          context.closePath();
        }

        if (visiblePoints < 3) return;

        context.shadowBlur = 7;
        context.shadowColor = colors.glow;
        context.fillStyle = colors.fill;
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = colors.stroke;
        context.lineWidth = 0.72;
        context.stroke();
      });
    });

    context.restore();
  };

  const drawRoute = (from, to, index, time) => {
    const start = pointFromLatLon(from);
    const end = pointFromLatLon(to);
    const points = [];

    for (let step = 0; step <= 60; step += 1) {
      const progress = step / 60;
      const curveLift = Math.sin(progress * Math.PI) * 0.28;
      points.push(
        normalize({
          x: start.x * (1 - progress) + end.x * progress,
          y: start.y * (1 - progress) + end.y * progress + curveLift,
          z: start.z * (1 - progress) + end.z * progress,
        })
      );
    }

    drawProjectedLine(points, time, "rgba(14, 165, 233, 0.26)", 1.15);
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, size, size);

    const shell = context.createRadialGradient(
      center,
      center,
      radius * 0.12,
      center,
      center,
      radius * 1.16
    );
    shell.addColorStop(0, "rgba(15, 23, 42, 0.78)");
    shell.addColorStop(0.48, "rgba(15, 23, 42, 0.9)");
    shell.addColorStop(0.78, "rgba(2, 6, 23, 0.96)");
    shell.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = shell;
    context.beginPath();
    context.arc(center, center, radius * 1.18, 0, Math.PI * 2);
    context.fill();

    context.save();
    drawGlobeGrid(time);
    drawLandMasses(time);
    context.globalCompositeOperation = "lighter";
    routes.forEach((route, index) => drawRoute(route[0], route[1], index, time));
    context.restore();

    context.strokeStyle = "rgba(14, 165, 233, 0.36)";
    context.lineWidth = 1.3;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();

    if (!reducedMotion.matches) {
      animationFrame = window.requestAnimationFrame(render);
    }
  };

  const handleResize = () => {
    resizeCanvas();
    if (reducedMotion.matches) {
      render(0);
    }
  };

  resizeCanvas();

  if (reducedMotion.matches) {
    render(0);
  } else {
    animationFrame = window.requestAnimationFrame(render);
  }

  window.addEventListener("resize", handleResize);

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", handleResize);
  };
};

const setupGlobeLinkCanvas = () => {
  if (!globeLinkCanvas || !continentAnchors.length || !globeShell) {
    return () => {};
  }

  const context = globeLinkCanvas.getContext("2d");
  if (!context) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const continentColors = {
    "north-america": "244, 63, 94",
    "south-america": "14, 165, 233",
    europe: "148, 163, 184",
    africa: "14, 165, 233",
    asia: "148, 163, 184",
  };

  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let running = true;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight
    );

    globeLinkCanvas.width = Math.floor(width * ratio);
    globeLinkCanvas.height = Math.floor(height * ratio);
    globeLinkCanvas.style.height = `${height}px`;
    globeLinkCanvas.parentElement.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const getGlobeSource = () => {
    const rect = globeShell.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + window.scrollY + rect.height / 2;

    return {
      name: "hero",
      x: clamp(x, width * 0.08, width * 0.92),
      y,
    };
  };

  const getAnchorMetrics = () =>
    continentAnchors
      .map((anchor) => {
        const rect = anchor.getBoundingClientRect();
        const mapRect =
          anchor.querySelector(".continent-map")?.getBoundingClientRect() ||
          rect;
        const x = mapRect.left + mapRect.width / 2;
        const y = mapRect.top + window.scrollY + mapRect.height / 2;

        return {
          name: anchor.dataset.continentAnchor || "",
          x: clamp(x, 24, width - 24),
          y,
          absY: y,
        };
      })
      .sort((a, b) => a.absY - b.absY);

  const drawBaseField = (time) => {
    context.save();
    context.globalAlpha = 0.32;

    const gridSize = 128;
    const drift = reducedMotion.matches ? 0 : (time * 0.008) % gridSize;

    for (let x = -gridSize + drift; x < width + gridSize; x += gridSize) {
      context.strokeStyle = "rgba(148, 163, 184, 0.014)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = -gridSize + drift * 0.5; y < height + gridSize; y += gridSize) {
      context.strokeStyle = "rgba(148, 163, 184, 0.012)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
  };

  const drawConnector = (source, target, index, time) => {
    const color = continentColors[target.name] || "14, 165, 233";
    const sourceY = source.y;
    const targetY = target.y;
    const pulse = reducedMotion.matches
      ? 0.45
      : (Math.sin(time * 0.00135 + index * 1.1) + 1) / 2;
    const baseAlpha = 0.18;
    const lineAlpha = baseAlpha + pulse * 0.08;
    const verticalDistance = Math.abs(targetY - sourceY);
    const verticalDirection = targetY >= sourceY ? 1 : -1;
    const horizontalDirection = target.x >= source.x ? 1 : -1;
    const controlA = {
      x: source.x + (target.x - source.x) * 0.24,
      y: sourceY + verticalDirection * Math.min(verticalDistance * 0.22, 140),
    };
    const controlB = {
      x: target.x - horizontalDirection * clamp(width * 0.12, 90, 190),
      y: targetY - verticalDirection * Math.min(verticalDistance * 0.18, 160),
    };
    const estimatedLength = Math.hypot(target.x - source.x, targetY - sourceY);
    const traceOffset = reducedMotion.matches
      ? 0
      : -((time * 0.12 + index * 84) % (estimatedLength + 160));

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    context.strokeStyle = `rgba(${color}, ${lineAlpha})`;
    context.lineWidth = 1 + pulse * 0.24;
    context.setLineDash([2, 16]);
    context.lineDashOffset = reducedMotion.matches ? 0 : -time * 0.025;
    context.beginPath();
    context.moveTo(source.x, sourceY);
    context.bezierCurveTo(
      controlA.x,
      controlA.y,
      controlB.x,
      controlB.y,
      target.x,
      targetY
    );
    context.stroke();

    if (!reducedMotion.matches) {
      context.globalCompositeOperation = "lighter";
      context.strokeStyle = `rgba(${color}, 0.42)`;
      context.lineWidth = 1.65;
      context.setLineDash([72, estimatedLength + 120]);
      context.lineDashOffset = traceOffset;
      context.beginPath();
      context.moveTo(source.x, sourceY);
      context.bezierCurveTo(
        controlA.x,
        controlA.y,
        controlB.x,
        controlB.y,
        target.x,
        targetY
      );
      context.stroke();
    }

    context.restore();
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, width, height);
    drawBaseField(time);

    const source = getGlobeSource();
    const anchors = getAnchorMetrics();
    const chainPoints = [source, ...anchors];

    for (let index = 0; index < chainPoints.length - 1; index += 1) {
      const chainSource = chainPoints[index];
      const chainTarget = chainPoints[index + 1];

      drawConnector(chainSource, chainTarget, index, time);
    }

    if (!reducedMotion.matches) {
      animationFrame = window.requestAnimationFrame(render);
    }
  };

  const handleResize = () => {
    resizeCanvas();
    if (reducedMotion.matches) {
      render(0);
    }
  };

  resizeCanvas();

  if (reducedMotion.matches) {
    render(0);
  } else {
    animationFrame = window.requestAnimationFrame(render);
  }

  window.addEventListener("resize", handleResize);
  window.addEventListener("load", handleResize);

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("load", handleResize);
  };
};

const cleanupPageTransitions = setupMotionPageTransitions();
const cleanupHeroStageMotion = setupHeroStageMotion();
const cleanupGlobe = setupGlobeCanvas();
const cleanupGlobeLinks = setupGlobeLinkCanvas();
const cleanupSmoothScrolling = setupSmoothScrolling();
const cleanupSectionScrolling = setupSectionScrolling();

syncHeaderState();
syncScrollTopState();

window.addEventListener("scroll", () => {
  syncHeaderState();
  syncScrollTopState();
}, { passive: true });
window.addEventListener("beforeunload", () => {
  cleanupPageTransitions();
  cleanupHeroStageMotion();
  cleanupGlobe();
  cleanupGlobeLinks();
  cleanupSmoothScrolling();
  cleanupSectionScrolling();
});
