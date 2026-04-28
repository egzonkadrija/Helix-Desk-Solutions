const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const workflowSteps = document.querySelectorAll("[data-step]");
const globeLinkCanvas = document.querySelector("#globe-link-canvas");
const globeCanvas = document.querySelector("#globe-canvas");
const globeShell = document.querySelector(".globe-shell");
const continentAnchors = Array.from(
  document.querySelectorAll("[data-continent-anchor]")
);
const heroStage = document.querySelector(".hero-stage");
const motionLibrary = window.Motion;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const syncHeaderState = () => {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > 18);
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
      .querySelectorAll(".button, .header-cta, .contact-links a")
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
    document.querySelectorAll(".button, .header-cta").forEach((item) => {
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

const workflowObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        workflowSteps.forEach((step) => step.classList.remove("is-active"));
        entry.target.classList.add("is-active");
      }
    });
  },
  {
    threshold: 0.55,
  }
);

workflowSteps.forEach((step) => workflowObserver.observe(step));

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
      fill: "rgba(255, 191, 122, 0.09)",
      stroke: "rgba(255, 191, 122, 0.18)",
    },
    "South America": {
      fill: "rgba(120, 221, 196, 0.095)",
      stroke: "rgba(159, 244, 215, 0.16)",
    },
    Europe: {
      fill: "rgba(104, 165, 244, 0.085)",
      stroke: "rgba(168, 205, 255, 0.15)",
    },
    Africa: {
      fill: "rgba(120, 221, 196, 0.09)",
      stroke: "rgba(159, 244, 215, 0.15)",
    },
    Asia: {
      fill: "rgba(104, 165, 244, 0.085)",
      stroke: "rgba(168, 205, 255, 0.14)",
    },
    Oceania: {
      fill: "rgba(255, 191, 122, 0.075)",
      stroke: "rgba(255, 191, 122, 0.13)",
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
      visible: rotated.z > -0.22,
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
      drawProjectedLine(points, time, "rgba(198, 211, 214, 0.15)", 0.9);
    }

    for (let lon = -150; lon <= 180; lon += 30) {
      const points = [];
      for (let lat = -78; lat <= 78; lat += 4) {
        points.push(pointFromLatLon([lat, lon]));
      }
      drawProjectedLine(points, time, "rgba(159, 244, 215, 0.1)", 0.8);
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

        context.fillStyle = colors.fill;
        context.strokeStyle = colors.stroke;
        context.lineWidth = 0.42;
        context.fill();
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

    drawProjectedLine(points, time, "rgba(159, 244, 215, 0.24)", 1.15);
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, size, size);

    const shell = context.createRadialGradient(
      center * 0.72,
      center * 0.62,
      radius * 0.08,
      center,
      center,
      radius * 1.16
    );
    shell.addColorStop(0, "rgba(240, 255, 250, 0.16)");
    shell.addColorStop(0.3, "rgba(79, 149, 151, 0.18)");
    shell.addColorStop(0.58, "rgba(8, 38, 43, 0.86)");
    shell.addColorStop(0.82, "rgba(2, 8, 10, 0.94)");
    shell.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = shell;
    context.beginPath();
    context.arc(center, center, radius * 1.18, 0, Math.PI * 2);
    context.fill();

    context.save();
    drawLandMasses(time);
    context.globalCompositeOperation = "lighter";
    drawGlobeGrid(time);
    routes.forEach((route, index) => drawRoute(route[0], route[1], index, time));
    context.restore();

    context.strokeStyle = "rgba(159, 244, 215, 0.34)";
    context.lineWidth = 1.3;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();

    const highlight = context.createRadialGradient(
      center - radius * 0.35,
      center - radius * 0.38,
      0,
      center - radius * 0.35,
      center - radius * 0.38,
      radius * 0.54
    );
    highlight.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = highlight;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();

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
    "north-america": "255, 191, 122",
    "south-america": "159, 244, 215",
    europe: "168, 205, 255",
    africa: "159, 244, 215",
    asia: "168, 205, 255",
  };

  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let running = true;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    globeLinkCanvas.width = Math.floor(width * ratio);
    globeLinkCanvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const getGlobeSource = () => {
    const rect = globeShell.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const isNearViewport = y > -height * 0.28 && y < height * 1.18;

    return {
      x: clamp(x, width * 0.08, width * 0.92),
      y: isNearViewport ? y : y < 0 ? -70 : height + 70,
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
        const y = mapRect.top + mapRect.height / 2;

        return {
          name: anchor.dataset.continentAnchor || "",
          x: clamp(x, 24, width - 24),
          y,
          drawY: clamp(y, -height * 0.18, height * 1.18),
          absY: mapRect.top + window.scrollY + mapRect.height / 2,
        };
      })
      .sort((a, b) => a.absY - b.absY);

  const drawBaseField = (time) => {
    context.save();
    context.globalAlpha = 0.32;

    const gridSize = 128;
    const drift = reducedMotion.matches ? 0 : (time * 0.008) % gridSize;

    for (let x = -gridSize + drift; x < width + gridSize; x += gridSize) {
      context.strokeStyle = "rgba(198, 211, 214, 0.014)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = -gridSize + drift * 0.5; y < height + gridSize; y += gridSize) {
      context.strokeStyle = "rgba(198, 211, 214, 0.012)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
  };

  const drawConnector = (source, target, active, index, time) => {
    const color = continentColors[target.name] || "159, 244, 215";
    const targetY = target.drawY;
    const isOffscreen = target.y !== targetY;
    const baseAlpha = isOffscreen ? 0.11 : 0.17;
    const activeAlpha = isOffscreen ? 0.22 : 0.34;
    const verticalDistance = Math.abs(targetY - source.y);
    const horizontalDirection = target.x >= source.x ? 1 : -1;
    const controlA = {
      x: source.x + (target.x - source.x) * 0.24,
      y: source.y + Math.min(verticalDistance * 0.22, 140),
    };
    const controlB = {
      x: target.x - horizontalDirection * clamp(width * 0.12, 90, 190),
      y: targetY - Math.min(verticalDistance * 0.18, 160),
    };
    const estimatedLength = Math.hypot(target.x - source.x, targetY - source.y);
    const traceOffset = reducedMotion.matches
      ? 0
      : -((time * 0.12 + index * 84) % (estimatedLength + 160));

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    context.strokeStyle = `rgba(${color}, ${active ? activeAlpha : baseAlpha})`;
    context.lineWidth = active ? 1.45 : 1;
    context.setLineDash(active ? [3, 12] : [2, 18]);
    context.lineDashOffset = reducedMotion.matches ? 0 : -time * 0.025;
    context.beginPath();
    context.moveTo(source.x, source.y);
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
      context.strokeStyle = `rgba(${color}, ${active ? 0.52 : 0.26})`;
      context.lineWidth = active ? 2 : 1.4;
      context.setLineDash([72, estimatedLength + 120]);
      context.lineDashOffset = traceOffset;
      context.beginPath();
      context.moveTo(source.x, source.y);
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
    const activeAnchor = anchors.reduce((nearest, anchor) => {
      if (!nearest) return anchor;

      return Math.abs(anchor.y - height * 0.48) <
        Math.abs(nearest.y - height * 0.48)
        ? anchor
        : nearest;
    }, null);

    anchors.forEach((anchor, index) => {
      drawConnector(source, anchor, activeAnchor?.name === anchor.name, index, time);
    });

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
  const handleScroll = () => {
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
  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("scroll", handleScroll);
  };
};

const cleanupPageTransitions = setupMotionPageTransitions();
const cleanupHeroStageMotion = setupHeroStageMotion();
const cleanupGlobe = setupGlobeCanvas();
const cleanupGlobeLinks = setupGlobeLinkCanvas();

syncHeaderState();

window.addEventListener("scroll", () => {
  syncHeaderState();
}, { passive: true });
window.addEventListener("beforeunload", () => {
  cleanupPageTransitions();
  cleanupHeroStageMotion();
  cleanupGlobe();
  cleanupGlobeLinks();
});
