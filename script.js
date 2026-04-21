const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const workflowSteps = document.querySelectorAll("[data-step]");
const chipCanvas = document.querySelector("#chip-network-canvas");
const chipAnchors = Array.from(document.querySelectorAll("[data-chip-anchor]"));

const syncHeaderState = () => {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > 18);
};

const syncHeroShift = () => {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const rect = hero.getBoundingClientRect();
  const shift = Math.max(-18, Math.min(18, rect.top * -0.045));
  document.documentElement.style.setProperty("--hero-shift", `${shift}px`);
};

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

reveals.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 40, 220)}ms`;
  revealObserver.observe(item);
});

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

const setupChipNetworkCanvas = () => {
  if (!chipCanvas || !chipAnchors.length) return () => {};

  const context = chipCanvas.getContext("2d");
  if (!context) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let running = true;
  let pointerX = 0;
  let pointerY = 0;

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    chipCanvas.width = Math.floor(width * ratio);
    chipCanvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const roundRectPath = (x, y, w, h, r) => {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
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

  const buildOrthogonalPath = (start, end, laneOffset = 0) => {
    const midX = start.x + (end.x - start.x) * 0.52 + laneOffset;

    return [
      { x: start.x, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x, y: end.y },
    ];
  };

  const drawPath = (points, strokeStyle, lineWidth) => {
    if (points.length < 2) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }

    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = strokeStyle;
    context.stroke();
  };

  const drawVia = (point, active = false, radius = 7) => {
    const glow = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius * 3.4
    );

    glow.addColorStop(
      0,
      active ? "rgba(159, 244, 215, 0.4)" : "rgba(104, 165, 244, 0.18)"
    );
    glow.addColorStop(1, "rgba(104, 165, 244, 0)");

    context.fillStyle = glow;
    context.beginPath();
    context.arc(point.x, point.y, radius * 3.4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(168, 196, 222, 0.38)";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = active
      ? "rgba(159, 244, 215, 0.92)"
      : "rgba(10, 19, 28, 0.94)";
    context.beginPath();
    context.arc(point.x, point.y, radius * 0.42, 0, Math.PI * 2);
    context.fill();
  };

  const getPathLength = (points) => {
    let length = 0;

    for (let index = 1; index < points.length; index += 1) {
      const deltaX = points[index].x - points[index - 1].x;
      const deltaY = points[index].y - points[index - 1].y;
      length += Math.hypot(deltaX, deltaY);
    }

    return length;
  };

  const getPointOnPath = (points, progress) => {
    const totalLength = getPathLength(points);
    if (!totalLength) return points[0];

    let distance = totalLength * progress;

    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

      if (distance <= segmentLength) {
        const ratio = segmentLength === 0 ? 0 : distance / segmentLength;
        return {
          x: start.x + (end.x - start.x) * ratio,
          y: start.y + (end.y - start.y) * ratio,
        };
      }

      distance -= segmentLength;
    }

    return points[points.length - 1];
  };

  const drawPulse = (points, progress, color, radius) => {
    const point = getPointOnPath(points, progress);
    const glow = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius * 3.6
    );

    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(120, 221, 196, 0)");

    context.fillStyle = glow;
    context.beginPath();
    context.arc(point.x, point.y, radius * 3.6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(240, 250, 255, 0.92)";
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const drawBus = (points, active = false) => {
    const offsets = active ? [-8, 0, 8] : [-6, 0, 6];
    const traceColor = active
      ? "rgba(159, 244, 215, 0.24)"
      : "rgba(104, 165, 244, 0.16)";

    offsets.forEach((offset) => {
      const shifted = points.map((point, index) => {
        if (index === 0 || index === points.length - 1) {
          return { x: point.x, y: point.y + offset * 0.15 };
        }

        return { x: point.x, y: point.y + offset };
      });

      drawPath(shifted, "rgba(64, 88, 110, 0.14)", active ? 6 : 5);
      drawPath(shifted, traceColor, active ? 1.6 : 1.1);
    });
  };

  const drawBoardField = (time) => {
    context.save();
    context.globalAlpha = 0.5;

    const gridSize = 96;
    for (let x = 48; x < width; x += gridSize) {
      context.strokeStyle = "rgba(168, 196, 222, 0.025)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 48; y < height; y += gridSize) {
      context.strokeStyle = "rgba(168, 196, 222, 0.02)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const sweep = reducedMotion.matches ? 0 : (time * 0.06) % height;
    context.strokeStyle = "rgba(159, 244, 215, 0.025)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, sweep);
    context.lineTo(width, sweep);
    context.stroke();

    context.restore();
  };

  const drawChipCore = (anchor, time) => {
    const chipSize = Math.max(92, Math.min(132, width * 0.09));
    const driftX = pointerX * 10;
    const driftY = pointerY * 8;
    const pulse = reducedMotion.matches ? 0 : Math.sin(time * 0.0016) * 4;

    context.save();
    context.translate(anchor.x + driftX, anchor.y + driftY);
    context.rotate(-0.08 + pointerX * 0.06);

    const shellGradient = context.createLinearGradient(
      -chipSize,
      -chipSize,
      chipSize,
      chipSize
    );
    shellGradient.addColorStop(0, "rgba(18, 29, 39, 0.98)");
    shellGradient.addColorStop(1, "rgba(7, 12, 18, 0.98)");

    context.fillStyle = shellGradient;
    context.strokeStyle = "rgba(168, 196, 222, 0.24)";
    context.lineWidth = 1.4;
    roundRectPath(-chipSize / 2, -chipSize / 2, chipSize, chipSize, 16);
    context.fill();
    context.stroke();

    context.strokeStyle = "rgba(159, 244, 215, 0.22)";
    roundRectPath(
      -chipSize / 2 + 10,
      -chipSize / 2 + 10,
      chipSize - 20,
      chipSize - 20,
      10
    );
    context.stroke();

    const pinCount = 8;
    const pinGap = chipSize / (pinCount + 1);

    for (let index = 1; index <= pinCount; index += 1) {
      const offset = -chipSize / 2 + pinGap * index;

      context.fillStyle = "rgba(187, 198, 212, 0.58)";
      context.fillRect(offset - 2, -chipSize / 2 - 14, 4, 14);
      context.fillRect(offset - 2, chipSize / 2, 4, 14);
      context.fillRect(-chipSize / 2 - 14, offset - 2, 14, 4);
      context.fillRect(chipSize / 2, offset - 2, 14, 4);
    }

    context.strokeStyle = "rgba(104, 165, 244, 0.14)";
    context.lineWidth = 1;
    for (let index = -2; index <= 2; index += 1) {
      context.beginPath();
      context.moveTo(-chipSize * 0.28, index * 12);
      context.lineTo(chipSize * 0.28, index * 12);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(0, -chipSize * 0.28);
    context.lineTo(0, chipSize * 0.28);
    context.stroke();

    const coreGradient = context.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      chipSize * 0.42 + pulse
    );
    coreGradient.addColorStop(0, "rgba(226, 255, 247, 0.94)");
    coreGradient.addColorStop(0.35, "rgba(159, 244, 215, 0.34)");
    coreGradient.addColorStop(1, "rgba(159, 244, 215, 0)");

    context.fillStyle = coreGradient;
    context.beginPath();
    context.arc(0, 0, chipSize * 0.42 + pulse, 0, Math.PI * 2);
    context.fill();

    context.restore();
  };

  const drawSectionChip = (anchor, active, index) => {
    context.save();
    context.translate(anchor.x, anchor.y);

    const widthChip = 52;
    const heightChip = 44;
    const tilt = index % 2 === 0 ? -4 : 4;

    context.rotate((tilt * Math.PI) / 180);

    const padGradient = context.createLinearGradient(-26, -22, 26, 22);
    padGradient.addColorStop(
      0,
      active ? "rgba(20, 36, 48, 0.98)" : "rgba(12, 20, 29, 0.94)"
    );
    padGradient.addColorStop(1, "rgba(6, 10, 16, 0.98)");

    context.fillStyle = padGradient;
    context.strokeStyle = active
      ? "rgba(159, 244, 215, 0.38)"
      : "rgba(168, 196, 222, 0.18)";
    context.lineWidth = 1.2;
    roundRectPath(-widthChip / 2, -heightChip / 2, widthChip, heightChip, 8);
    context.fill();
    context.stroke();

    for (let pin = -2; pin <= 2; pin += 1) {
      context.fillStyle = "rgba(187, 198, 212, 0.48)";
      context.fillRect(-widthChip / 2 - 10, pin * 7 - 1.5, 10, 3);
      context.fillRect(widthChip / 2, pin * 7 - 1.5, 10, 3);
    }

    context.fillStyle = active
      ? "rgba(159, 244, 215, 0.92)"
      : "rgba(104, 165, 244, 0.72)";
    roundRectPath(-8, -8, 16, 16, 3);
    context.fill();

    context.restore();
  };

  const handlePointerMove = (event) => {
    pointerX = (event.clientX / width - 0.5) * 2;
    pointerY = (event.clientY / height - 0.5) * 2;
  };

  const handlePointerLeave = () => {
    pointerX = 0;
    pointerY = 0;
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, width, height);
    drawBoardField(time);

    const anchors = getAnchorMetrics();
    const heroAnchor = anchors.find((anchor) => anchor.name === "hero");

    if (!heroAnchor) {
      animationFrame = window.requestAnimationFrame(render);
      return;
    }

    const sectionAnchors = anchors.filter((anchor) => anchor.name !== "hero");
    const activeAnchor = sectionAnchors.reduce((nearest, anchor) => {
      if (!nearest) return anchor;

      return Math.abs(anchor.y - height * 0.48) < Math.abs(nearest.y - height * 0.48)
        ? anchor
        : nearest;
    }, null);

    const spineX = Math.min(
      width - 108,
      Math.max(width * 0.6, heroAnchor.x + Math.max(120, width * 0.1))
    );
    const lastAnchor = sectionAnchors[sectionAnchors.length - 1] || heroAnchor;
    const backbone = [
      { x: heroAnchor.x + 82, y: heroAnchor.y },
      { x: spineX, y: heroAnchor.y },
      { x: spineX, y: lastAnchor.y + 40 },
    ];

    drawBus(backbone, true);
    drawVia(backbone[0], true, 8);
    drawVia(backbone[1], true, 8);

    const timeLoop = reducedMotion.matches ? 0.18 : (time * 0.00011) % 1;
    drawPulse(backbone, timeLoop, "rgba(159, 244, 215, 0.9)", 4.2);
    drawPulse(
      backbone,
      (timeLoop + 0.42) % 1,
      "rgba(104, 165, 244, 0.86)",
      3.4
    );

    sectionAnchors.forEach((anchor, index) => {
      const branchTargetX = anchor.x + 30;
      const laneOffset = index % 2 === 0 ? -18 : 18;
      const branch = buildOrthogonalPath(
        { x: spineX, y: anchor.y },
        { x: branchTargetX, y: anchor.y },
        laneOffset
      );
      const isActive = activeAnchor?.name === anchor.name;

      drawBus(branch, isActive);
      branch.forEach((point, pointIndex) => {
        if (pointIndex !== branch.length - 1) {
          drawVia(point, isActive, pointIndex === 0 ? 6 : 5);
        }
      });
      drawSectionChip(anchor, isActive, index);

      const branchPulse = reducedMotion.matches
        ? 0.72
        : ((time * 0.00018 + index * 0.19) % 1);

      drawPulse(
        branch,
        branchPulse,
        isActive ? "rgba(159, 244, 215, 0.92)" : "rgba(104, 165, 244, 0.84)",
        isActive ? 4 : 3
      );
    });

    drawChipCore(heroAnchor, time);

    animationFrame = window.requestAnimationFrame(render);
  };

  resizeCanvas();
  animationFrame = window.requestAnimationFrame(render);

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerleave", handlePointerLeave);
  };
};

const cleanupChipNetwork = setupChipNetworkCanvas();

syncHeaderState();
syncHeroShift();

window.addEventListener("scroll", () => {
  syncHeaderState();
  syncHeroShift();
});

window.addEventListener("resize", syncHeroShift);
window.addEventListener("beforeunload", cleanupChipNetwork);
