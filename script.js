const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const workflowSteps = document.querySelectorAll("[data-step]");
const chipCanvas = document.querySelector("#chip-network-canvas");
const globeCanvas = document.querySelector("#globe-canvas");
const chipAnchors = Array.from(document.querySelectorAll("[data-chip-anchor]"));
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

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let animationFrame = 0;
  let running = true;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  if (reducedMotion.matches) {
    heroStage.style.setProperty("--stage-x", "0px");
    heroStage.style.setProperty("--stage-y", "0px");
    heroStage.style.setProperty("--tilt-x", "0deg");
    heroStage.style.setProperty("--tilt-y", "0deg");
    return () => {};
  }

  const applyMotion = (time) => {
    if (!running) return;

    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;

    const drift = Math.sin(time * 0.0011) * 3;
    heroStage.style.setProperty("--stage-x", `${(current.x * 8).toFixed(2)}px`);
    heroStage.style.setProperty(
      "--stage-y",
      `${(current.y * 6 + drift).toFixed(2)}px`
    );
    heroStage.style.setProperty("--tilt-x", `${(-current.y * 4).toFixed(2)}deg`);
    heroStage.style.setProperty("--tilt-y", `${(current.x * 5).toFixed(2)}deg`);

    animationFrame = window.requestAnimationFrame(applyMotion);
  };

  const handlePointerMove = (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;

    const rect = heroStage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    target.x = clamp((event.clientX - centerX) / (rect.width / 2), -1, 1);
    target.y = clamp((event.clientY - centerY) / (rect.height / 2), -1, 1);
  };

  const resetTarget = () => {
    target.x = 0;
    target.y = 0;
  };

  animationFrame = window.requestAnimationFrame(applyMotion);
  heroStage.addEventListener("pointermove", handlePointerMove);
  heroStage.addEventListener("pointerleave", resetTarget);

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    heroStage.removeEventListener("pointermove", handlePointerMove);
    heroStage.removeEventListener("pointerleave", resetTarget);
  };
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
  const landMasses = [
    [
      [72, -166],
      [69, -136],
      [62, -122],
      [58, -106],
      [52, -95],
      [50, -70],
      [42, -64],
      [31, -80],
      [24, -82],
      [18, -96],
      [24, -112],
      [32, -117],
      [40, -126],
      [54, -137],
      [60, -152],
    ],
    [
      [78, -58],
      [74, -22],
      [62, -34],
      [60, -51],
      [68, -66],
    ],
    [
      [12, -81],
      [9, -66],
      [-4, -52],
      [-18, -38],
      [-34, -48],
      [-55, -68],
      [-42, -74],
      [-20, -70],
      [-6, -78],
    ],
    [
      [61, -10],
      [54, 12],
      [45, 32],
      [31, 32],
      [20, 10],
      [5, -4],
      [-17, 12],
      [-35, 18],
      [-34, 4],
      [-18, -16],
      [5, -17],
      [31, -10],
      [42, -5],
    ],
    [
      [66, 38],
      [60, 80],
      [55, 118],
      [42, 142],
      [24, 122],
      [8, 100],
      [18, 78],
      [30, 58],
      [45, 45],
    ],
    [
      [8, 95],
      [-6, 116],
      [-10, 135],
      [4, 126],
      [15, 112],
    ],
    [
      [-12, 112],
      [-16, 148],
      [-35, 154],
      [-43, 124],
      [-26, 112],
    ],
  ];

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

  const interpolateShape = (shape) => {
    const points = [];

    shape.forEach((point, index) => {
      const next = shape[(index + 1) % shape.length];
      points.push(point);

      for (let step = 1; step < 4; step += 1) {
        const progress = step / 4;
        points.push([
          point[0] + (next[0] - point[0]) * progress,
          point[1] + (next[1] - point[1]) * progress,
        ]);
      }
    });

    return points;
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
    context.save();
    context.beginPath();
    context.arc(center, center, radius * 0.99, 0, Math.PI * 2);
    context.clip();

    landMasses.forEach((shape, index) => {
      const projected = interpolateShape(shape).map((point) =>
        projectPoint(pointFromLatLon(point), time)
      );
      const visiblePoints = projected.filter((point) => point.visible);

      if (visiblePoints.length < 3) return;

      context.beginPath();
      visiblePoints.forEach((point, pointIndex) => {
        if (pointIndex === 0) {
          context.moveTo(point.x, point.y);
          return;
        }

        context.lineTo(point.x, point.y);
      });
      context.closePath();

      context.fillStyle =
        index % 2 === 0
          ? "rgba(120, 221, 196, 0.105)"
          : "rgba(255, 191, 122, 0.07)";
      context.strokeStyle =
        index % 2 === 0
          ? "rgba(159, 244, 215, 0.16)"
          : "rgba(255, 191, 122, 0.12)";
      context.lineWidth = 0.75;
      context.fill();
      context.stroke();
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
    context.globalCompositeOperation = "lighter";
    drawLandMasses(time);
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

const setupChipNetworkCanvas = () => {
  if (!chipCanvas || !chipAnchors.length) return () => {};

  const context = chipCanvas.getContext("2d");
  if (!context) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let running = true;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const fullCircle = Math.PI * 2;
  const radarBlips = [
    { angle: -2.42, distance: 0.37, strength: 0.7 },
    { angle: -1.66, distance: 0.62, strength: 0.95 },
    { angle: -0.92, distance: 0.46, strength: 0.82 },
    { angle: -0.18, distance: 0.76, strength: 0.68 },
    { angle: 0.58, distance: 0.32, strength: 0.88 },
    { angle: 1.18, distance: 0.57, strength: 0.78 },
    { angle: 2.02, distance: 0.68, strength: 0.92 },
    { angle: 2.72, distance: 0.49, strength: 0.74 },
  ];

  const normalizeAngle = (angle) =>
    ((angle % fullCircle) + fullCircle) % fullCircle;

  const getScanReveal = (scanAngle, blipAngle) => {
    const trailDistance = normalizeAngle(scanAngle - blipAngle);

    return trailDistance > 0.58 ? 0 : 1 - trailDistance / 0.58;
  };

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    chipCanvas.width = Math.floor(width * ratio);
    chipCanvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const getAnchorMetrics = () =>
    chipAnchors
      .map((anchor) => {
        const rect = anchor.getBoundingClientRect();

        return {
          name: anchor.dataset.chipAnchor || "",
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          absY: rect.top + window.scrollY + rect.height / 2,
        };
      })
      .sort((a, b) => a.absY - b.absY);

  const drawOperationsField = (time) => {
    context.save();
    context.globalAlpha = 0.42;

    const gridSize = 112;
    const drift = reducedMotion.matches ? 0 : (time * 0.012) % gridSize;

    for (let x = -gridSize + drift; x < width + gridSize; x += gridSize) {
      context.strokeStyle = "rgba(198, 211, 214, 0.018)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = -gridSize + drift * 0.65; y < height + gridSize; y += gridSize) {
      context.strokeStyle = "rgba(198, 211, 214, 0.014)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
  };

  const drawRadarRings = (anchor, time) => {
    const baseRadius = clamp(Math.min(width, height) * 0.2, 130, 260);
    const scanAngle = reducedMotion.matches
      ? -Math.PI * 0.28
      : (time * 0.00055) % fullCircle;
    const rings = [0.34, 0.55, 0.78, 1];

    context.save();
    context.translate(anchor.x, anchor.y);
    context.scale(1, 0.74);
    context.globalCompositeOperation = "lighter";

    rings.forEach((size, index) => {
      const radius = baseRadius * size;

      context.strokeStyle =
        index === rings.length - 1
          ? "rgba(159, 244, 215, 0.26)"
          : "rgba(198, 211, 214, 0.13)";
      context.lineWidth = index === rings.length - 1 ? 1.4 : 1;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    });

    for (let spoke = 0; spoke < 8; spoke += 1) {
      const angle = (fullCircle * spoke) / 8;
      const inner = baseRadius * 0.18;
      const outer = baseRadius;

      context.strokeStyle = "rgba(198, 211, 214, 0.06)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      context.stroke();
    }

    radarBlips.forEach((blip, index) => {
      const x = Math.cos(blip.angle) * baseRadius * blip.distance;
      const y = Math.sin(blip.angle) * baseRadius * blip.distance;
      const reveal = getScanReveal(scanAngle, normalizeAngle(blip.angle));
      const coreAlpha = 0.16 + reveal * 0.76 * blip.strength;
      const glowRadius = 8 + reveal * 24 * blip.strength;
      const dotRadius = 2.1 + reveal * 2.4 * blip.strength;

      if (reveal > 0.02) {
        const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(0, `rgba(240, 255, 250, ${0.42 * reveal})`);
        glow.addColorStop(0.28, `rgba(159, 244, 215, ${0.28 * reveal})`);
        glow.addColorStop(1, "rgba(159, 244, 215, 0)");

        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, glowRadius, 0, fullCircle);
        context.fill();
      }

      context.fillStyle =
        index % 3 === 0
          ? `rgba(255, 191, 122, ${coreAlpha * 0.82})`
          : `rgba(159, 244, 215, ${coreAlpha})`;
      context.beginPath();
      context.arc(x, y, dotRadius, 0, fullCircle);
      context.fill();
    });

    for (let wedge = 0; wedge < 10; wedge += 1) {
      const widthAngle = 0.038 + wedge * 0.004;
      const alpha = (10 - wedge) / 10;

      context.fillStyle = `rgba(159, 244, 215, ${0.035 * alpha})`;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(
        0,
        0,
        baseRadius,
        scanAngle - wedge * 0.055,
        scanAngle + widthAngle
      );
      context.closePath();
      context.fill();
    }

    context.strokeStyle = "rgba(159, 244, 215, 0.42)";
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(
      Math.cos(scanAngle) * baseRadius,
      Math.sin(scanAngle) * baseRadius
    );
    context.stroke();

    context.restore();
  };

  const drawSignalArc = (start, end, active, index, time) => {
    const bend = index % 2 === 0 ? -72 : 72;
    const control = {
      x: start.x + (end.x - start.x) * 0.5 + bend,
      y: start.y + (end.y - start.y) * 0.28,
    };

    context.save();
    context.lineCap = "round";
    context.lineWidth = active ? 1.5 : 1;
    context.setLineDash(active ? [4, 13] : [2, 16]);
    context.strokeStyle = active
      ? "rgba(159, 244, 215, 0.26)"
      : "rgba(104, 165, 244, 0.12)";

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(control.x, control.y, end.x, end.y);
    context.stroke();
    context.restore();
  };

  const drawSignalLock = (anchor, active, index, time) => {
    const pulse = reducedMotion.matches
      ? 0.45
      : (time * 0.001 + index * 0.2) % 1;
    const radius = active ? 10 + pulse * 36 : 8 + pulse * 20;
    const alpha = active ? 0.32 * (1 - pulse) : 0.16 * (1 - pulse);

    context.save();
    context.globalCompositeOperation = "lighter";

    context.strokeStyle = `rgba(159, 244, 215, ${alpha})`;
    context.lineWidth = active ? 1.4 : 1;
    context.beginPath();
    context.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
    context.stroke();

    context.restore();
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, width, height);
    drawOperationsField(time);

    const anchors = getAnchorMetrics();
    const radarAnchor = anchors.find((anchor) => anchor.name === "radar");

    if (!radarAnchor) {
      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(render);
      }
      return;
    }

    const sectionAnchors = anchors.filter((anchor) => anchor.name !== "radar");
    const activeAnchor = sectionAnchors.reduce((nearest, anchor) => {
      if (!nearest) return anchor;

      return Math.abs(anchor.y - height * 0.48) <
        Math.abs(nearest.y - height * 0.48)
        ? anchor
        : nearest;
    }, null);

    drawRadarRings(radarAnchor, time);

    sectionAnchors.forEach((anchor, index) => {
      const isActive = activeAnchor?.name === anchor.name;
      const target = { x: anchor.x + 18, y: anchor.y };

      if (target.y > -120 && target.y < height + 120) {
        drawSignalArc(radarAnchor, target, isActive, index, time);
        drawSignalLock(anchor, isActive, index, time);
      }
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

const cleanupPageTransitions = setupMotionPageTransitions();
const cleanupHeroStageMotion = setupHeroStageMotion();
const cleanupGlobe = setupGlobeCanvas();
const cleanupChipNetwork = setupChipNetworkCanvas();

syncHeaderState();

window.addEventListener("scroll", () => {
  syncHeaderState();
}, { passive: true });
window.addEventListener("beforeunload", () => {
  cleanupPageTransitions();
  cleanupHeroStageMotion();
  cleanupGlobe();
  cleanupChipNetwork();
});
