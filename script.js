const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const workflowSteps = document.querySelectorAll("[data-step]");
const chipCanvas = document.querySelector("#chip-network-canvas");
const chipAnchors = Array.from(document.querySelectorAll("[data-chip-anchor]"));
const heroStage = document.querySelector(".hero-stage");

const syncHeaderState = () => {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > 18);
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

  const getQuadraticPoint = (start, control, end, progress) => {
    const inverse = 1 - progress;

    return {
      x:
        inverse * inverse * start.x +
        2 * inverse * progress * control.x +
        progress * progress * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * progress * control.y +
        progress * progress * end.y,
    };
  };

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

    for (let index = 0; index < 28; index += 1) {
      const seed = index * 97;
      const x = (seed * 13) % Math.max(width, 1);
      const y =
        ((seed * 7 + (reducedMotion.matches ? 0 : time * 0.018)) %
          (height + 120)) -
        60;
      const pulse = reducedMotion.matches
        ? 0.45
        : 0.25 + Math.sin(time * 0.0012 + index) * 0.2;

      context.fillStyle = `rgba(159, 244, 215, ${pulse * 0.18})`;
      context.beginPath();
      context.arc(x, y, index % 4 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  };

  const drawRadarRings = (anchor, time) => {
    const baseRadius = clamp(Math.min(width, height) * 0.2, 130, 260);
    const scanAngle = reducedMotion.matches
      ? -Math.PI * 0.28
      : (time * 0.00055) % (Math.PI * 2);
    const ringPulse = reducedMotion.matches
      ? 0
      : Math.sin(time * 0.0012) * 4;
    const rings = [0.34, 0.55, 0.78, 1];

    context.save();
    context.translate(anchor.x, anchor.y);
    context.scale(1, 0.74);
    context.globalCompositeOperation = "lighter";

    const halo = context.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 1.18);
    halo.addColorStop(0, "rgba(159, 244, 215, 0.16)");
    halo.addColorStop(0.5, "rgba(104, 165, 244, 0.055)");
    halo.addColorStop(1, "rgba(120, 221, 196, 0)");
    context.fillStyle = halo;
    context.beginPath();
    context.arc(0, 0, baseRadius * 1.18, 0, Math.PI * 2);
    context.fill();

    rings.forEach((size, index) => {
      const radius = baseRadius * size + ringPulse * (index + 1) * 0.25;

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
      const angle = (Math.PI * 2 * spoke) / 8;
      const inner = baseRadius * 0.18;
      const outer = baseRadius;

      context.strokeStyle = "rgba(198, 211, 214, 0.06)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      context.stroke();
    }

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

    context.save();
    context.globalCompositeOperation = "lighter";
    const core = context.createRadialGradient(
      anchor.x,
      anchor.y,
      0,
      anchor.x,
      anchor.y,
      58
    );
    core.addColorStop(0, "rgba(240, 255, 250, 0.92)");
    core.addColorStop(0.28, "rgba(159, 244, 215, 0.28)");
    core.addColorStop(1, "rgba(159, 244, 215, 0)");

    context.fillStyle = core;
    context.beginPath();
    context.arc(anchor.x, anchor.y, 58, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(240, 255, 250, 0.92)";
    context.beginPath();
    context.arc(anchor.x, anchor.y, 3.2, 0, Math.PI * 2);
    context.fill();
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

    const progress = reducedMotion.matches
      ? 0.72
      : (time * (active ? 0.00022 : 0.00014) + index * 0.17) % 1;
    const pulse = getQuadraticPoint(start, control, end, progress);

    context.save();
    context.globalCompositeOperation = "lighter";
    const glow = context.createRadialGradient(
      pulse.x,
      pulse.y,
      0,
      pulse.x,
      pulse.y,
      active ? 24 : 16
    );
    glow.addColorStop(
      0,
      active ? "rgba(159, 244, 215, 0.56)" : "rgba(104, 165, 244, 0.34)"
    );
    glow.addColorStop(1, "rgba(159, 244, 215, 0)");

    context.fillStyle = glow;
    context.beginPath();
    context.arc(pulse.x, pulse.y, active ? 24 : 16, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = active
      ? "rgba(240, 255, 250, 0.92)"
      : "rgba(198, 211, 214, 0.76)";
    context.beginPath();
    context.arc(pulse.x, pulse.y, active ? 3 : 2.2, 0, Math.PI * 2);
    context.fill();
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

    const glow = context.createRadialGradient(
      anchor.x,
      anchor.y,
      0,
      anchor.x,
      anchor.y,
      active ? 32 : 22
    );
    glow.addColorStop(
      0,
      active ? "rgba(159, 244, 215, 0.42)" : "rgba(104, 165, 244, 0.2)"
    );
    glow.addColorStop(1, "rgba(159, 244, 215, 0)");

    context.fillStyle = glow;
    context.beginPath();
    context.arc(anchor.x, anchor.y, active ? 32 : 22, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = active
      ? "rgba(240, 255, 250, 0.94)"
      : "rgba(159, 244, 215, 0.76)";
    context.beginPath();
    context.arc(anchor.x, anchor.y, active ? 4 : 3, 0, Math.PI * 2);
    context.fill();

    context.restore();
  };

  const render = (time) => {
    if (!running) return;

    context.clearRect(0, 0, width, height);
    drawOperationsField(time);

    const anchors = getAnchorMetrics();
    const heroAnchor = anchors.find((anchor) => anchor.name === "hero");

    if (!heroAnchor) {
      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(render);
      }
      return;
    }

    const sectionAnchors = anchors.filter((anchor) => anchor.name !== "hero");
    const activeAnchor = sectionAnchors.reduce((nearest, anchor) => {
      if (!nearest) return anchor;

      return Math.abs(anchor.y - height * 0.48) <
        Math.abs(nearest.y - height * 0.48)
        ? anchor
        : nearest;
    }, null);

    drawRadarRings(heroAnchor, time);

    sectionAnchors.forEach((anchor, index) => {
      const isActive = activeAnchor?.name === anchor.name;
      const target = { x: anchor.x + 18, y: anchor.y };

      if (target.y > -120 && target.y < height + 120) {
        drawSignalArc(heroAnchor, target, isActive, index, time);
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

const cleanupHeroStageMotion = setupHeroStageMotion();
const cleanupChipNetwork = setupChipNetworkCanvas();

syncHeaderState();

window.addEventListener("scroll", () => {
  syncHeaderState();
}, { passive: true });
window.addEventListener("beforeunload", () => {
  cleanupHeroStageMotion();
  cleanupChipNetwork();
});
