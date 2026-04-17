const topbar = document.querySelector(".topbar");
const reveals = document.querySelectorAll("[data-reveal]");
const workflowSteps = document.querySelectorAll("[data-step]");
const heroCanvas = document.querySelector("#helix-canvas");
const sectionScenes = document.querySelectorAll("[data-scene]");

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

const syncSectionScenes = () => {
  if (!sectionScenes.length) return;

  const viewportHeight = window.innerHeight || 1;

  sectionScenes.forEach((scene, index) => {
    const rect = scene.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const progress = Math.max(
      -1,
      Math.min(1, (viewportHeight * 0.52 - center) / (viewportHeight * 0.52))
    );
    const direction = index % 2 === 0 ? 1 : -1;

    scene.style.setProperty("--scene-tilt-x", `${10 + progress * 6}deg`);
    scene.style.setProperty(
      "--scene-tilt-y",
      `${direction * (-16 + progress * 10)}deg`
    );
    scene.style.setProperty("--scene-float", `${progress * -18}px`);
    scene.style.setProperty("--scene-rotate-z", `${direction * progress * 6}deg`);
    scene.style.setProperty(
      "--scene-rotate-z-alt",
      `${direction * (progress * 10 + 3)}deg`
    );
  });
};

const setupHeroCanvas = () => {
  if (!heroCanvas) return () => {};

  const context = heroCanvas.getContext("2d");
  if (!context) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let depth = 0;
  let animationFrame = 0;
  let running = true;
  let pointerX = 0;
  let pointerY = 0;

  const strands = [];
  const strandsCount = 2;
  const pointsPerStrand = 80;

  for (let strandIndex = 0; strandIndex < strandsCount; strandIndex += 1) {
    const points = [];
    for (let index = 0; index < pointsPerStrand; index += 1) {
      const ratio = index / (pointsPerStrand - 1);
      const angle = ratio * Math.PI * 5 + strandIndex * Math.PI;
      const y = (ratio - 0.5) * 320;

      points.push({
        baseAngle: angle,
        y,
        pulse: 0.8 + Math.random() * 0.5,
      });
    }
    strands.push(points);
  }

  const rotatePoint = (x, y, z, rotX, rotY) => {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y1, z: z2 };
  };

  const resizeCanvas = () => {
    const bounds = heroCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(320, Math.floor(bounds.width));
    height = Math.max(320, Math.floor(bounds.height));
    depth = Math.min(width, height) * 0.9;

    heroCanvas.width = Math.floor(width * ratio);
    heroCanvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawFrame = (time) => {
    if (!running) return;

    context.clearRect(0, 0, width, height);

    const timeFactor = reducedMotion.matches ? 0 : time * 0.00045;
    const rotY = -0.55 + timeFactor + pointerX * 0.35;
    const rotX = 0.28 + pointerY * 0.18;
    const projected = [];

    strands.forEach((strand, strandIndex) => {
      strand.forEach((point, index) => {
        const wave = timeFactor * 2.2 + point.baseAngle * 0.35;
        const radius = Math.min(width, height) * 0.18 + Math.sin(wave) * 14;
        const x = Math.cos(point.baseAngle + timeFactor) * radius;
        const z = Math.sin(point.baseAngle + timeFactor) * radius;
        const rotated = rotatePoint(x, point.y, z, rotX, rotY);
        const perspective = depth / (depth + rotated.z + 260);
        const px = rotated.x * perspective + width / 2;
        const py = rotated.y * perspective + height / 2;
        const size = Math.max(1.5, perspective * (strandIndex === 0 ? 7 : 5.8));

        projected.push({
          strandIndex,
          index,
          x: px,
          y: py,
          z: rotated.z,
          size,
          alpha: Math.max(0.18, Math.min(1, perspective)),
        });
      });
    });

    projected.sort((a, b) => a.z - b.z);

    context.lineWidth = 1;

    for (let strandIndex = 0; strandIndex < strandsCount; strandIndex += 1) {
      const strandPoints = projected.filter((point) => point.strandIndex === strandIndex);

      for (let index = 0; index < strandPoints.length - 1; index += 1) {
        const current = strandPoints[index];
        const next = strandPoints[index + 1];

        context.beginPath();
        context.moveTo(current.x, current.y);
        context.lineTo(next.x, next.y);
        context.strokeStyle =
          strandIndex === 0
            ? `rgba(159, 244, 215, ${0.12 + current.alpha * 0.26})`
            : `rgba(104, 165, 244, ${0.1 + current.alpha * 0.22})`;
        context.stroke();
      }
    }

    for (let index = 0; index < pointsPerStrand; index += 8) {
      const pointA = projected.find((point) => point.strandIndex === 0 && point.index === index);
      const pointB = projected.find((point) => point.strandIndex === 1 && point.index === index);

      if (!pointA || !pointB) continue;

      context.beginPath();
      context.moveTo(pointA.x, pointA.y);
      context.lineTo(pointB.x, pointB.y);
      context.strokeStyle = `rgba(255, 180, 110, ${0.08 + pointA.alpha * 0.16})`;
      context.stroke();
    }

    projected.forEach((point) => {
      const gradient = context.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        point.size * 3.2
      );
      const coreColor =
        point.strandIndex === 0 ? "159, 244, 215" : "104, 165, 244";

      gradient.addColorStop(0, `rgba(${coreColor}, ${0.9 * point.alpha})`);
      gradient.addColorStop(1, `rgba(${coreColor}, 0)`);

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, point.size * 3.2, 0, Math.PI * 2);
      context.fill();

      context.fillStyle =
        point.strandIndex === 0
          ? `rgba(226, 255, 247, ${0.88 * point.alpha})`
          : `rgba(229, 241, 255, ${0.82 * point.alpha})`;
      context.beginPath();
      context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      context.fill();
    });

    animationFrame = window.requestAnimationFrame(drawFrame);
  };

  const handlePointerMove = (event) => {
    const bounds = heroCanvas.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;

    pointerX = (relativeX - 0.5) * 0.8;
    pointerY = (relativeY - 0.5) * 0.8;
  };

  const handlePointerLeave = () => {
    pointerX = 0;
    pointerY = 0;
  };

  resizeCanvas();
  animationFrame = window.requestAnimationFrame(drawFrame);

  window.addEventListener("resize", resizeCanvas);
  heroCanvas.addEventListener("pointermove", handlePointerMove);
  heroCanvas.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resizeCanvas);
    heroCanvas.removeEventListener("pointermove", handlePointerMove);
    heroCanvas.removeEventListener("pointerleave", handlePointerLeave);
  };
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

const cleanupHeroCanvas = setupHeroCanvas();

syncHeaderState();
syncHeroShift();
syncSectionScenes();

window.addEventListener("scroll", () => {
  syncHeaderState();
  syncHeroShift();
  syncSectionScenes();
});

window.addEventListener("resize", () => {
  syncHeroShift();
  syncSectionScenes();
});

window.addEventListener("beforeunload", cleanupHeroCanvas);
