import { useEffect, useRef } from "react";

const TARGET_FPS = 16;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const SPACE = " ";

function measureChar(container: HTMLElement): { w: number; h: number } {
  const span = document.createElement("span");
  span.textContent = "M";
  span.style.cssText =
    "position:absolute;visibility:hidden;white-space:pre;font-size:11px;font-family:monospace;line-height:1;";
  container.appendChild(span);
  const rect = span.getBoundingClientRect();
  container.removeChild(span);
  return { w: rect.width, h: rect.height };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function starGlyph(intensity: number) {
  if (intensity > 0.86) return "*";
  if (intensity > 0.7) return "+";
  if (intensity > 0.52) return ".";
  return SPACE;
}

function saturnGlyph(intensity: number) {
  if (intensity > 0.9) return "@";
  if (intensity > 0.72) return "O";
  if (intensity > 0.54) return "o";
  if (intensity > 0.34) return ":";
  return SPACE;
}

export function AsciiArtAnimation() {
  const preRef = useRef<HTMLPreElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!preRef.current) return;
    const preEl = preRef.current;
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isVisible = document.visibilityState !== "hidden";
    let loopActive = false;
    let cols = 0;
    let rows = 0;
    let charW = 7;
    let charH = 11;
    let lastOutput = "";
    let lastRenderAt = 0;
    let tick = 0;

    function rebuildGrid() {
      const nextCols = Math.max(0, Math.ceil(preEl.clientWidth / Math.max(1, charW)));
      const nextRows = Math.max(0, Math.ceil(preEl.clientHeight / Math.max(1, charH)));
      if (nextCols === cols && nextRows === rows) return;
      cols = nextCols;
      rows = nextRows;
      lastOutput = "";
    }

    function drawSaturnFrame(time: number) {
      if (cols <= 0 || rows <= 0) {
        preEl.textContent = "";
        return;
      }

      const centerX = cols * 0.53;
      const centerY = rows * 0.49;
      const planetRadiusX = Math.max(12, cols * 0.18);
      const planetRadiusY = Math.max(8, rows * 0.16);
      const ringRadiusX = planetRadiusX * 1.9;
      const ringRadiusY = Math.max(2.6, planetRadiusY * 0.38);
      const ringTilt = 0.34;
      const drift = Math.sin(time * 0.025) * 0.9;

      let output = "";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dx = col - centerX;
          const dy = row - centerY;

          const starNoise =
            Math.sin(col * 1.97 + row * 0.61 + time * 0.02) * 0.5 +
            Math.cos(row * 1.23 - col * 0.47 - time * 0.015) * 0.5;
          const starGlow = clamp((starNoise + 1) * 0.18 - 0.08, 0, 1);

          const ringY = dy + (dx + drift) * ringTilt;
          const ringField =
            (dx * dx) / (ringRadiusX * ringRadiusX) +
            (ringY * ringY) / (ringRadiusY * ringRadiusY);
          const ringBandInner = Math.exp(-Math.pow(ringField - 1.04, 2) * 30);
          const ringBandOuter = Math.exp(-Math.pow(ringField - 1.25, 2) * 24);
          const ringIntensity = clamp(ringBandInner * 0.84 + ringBandOuter * 0.4, 0, 1);

          const planetField =
            (dx * dx) / (planetRadiusX * planetRadiusX) +
            (dy * dy) / (planetRadiusY * planetRadiusY);
          const inPlanet = planetField <= 1;
          const planetShade =
            inPlanet
              ? clamp(
                  0.36 +
                    (1 - planetField) * 0.58 +
                    Math.sin((dx + time * 0.6) * 0.15) * 0.08 +
                    Math.cos((dy - time * 0.3) * 0.18) * 0.04,
                  0,
                  1,
                )
              : 0;

          const isRingBehindPlanet = inPlanet && ringY > 0;
          const visibleRing = isRingBehindPlanet ? ringIntensity * 0.14 : ringIntensity;

          const moonDx = col - (centerX - ringRadiusX * 0.72 + Math.sin(time * 0.018) * 0.7);
          const moonDy = row - (centerY - planetRadiusY * 1.35 + Math.cos(time * 0.017) * 0.4);
          const moonField = (moonDx * moonDx) / 9 + (moonDy * moonDy) / 5;
          const moonIntensity = moonField <= 1 ? clamp(0.46 + (1 - moonField) * 0.35, 0, 1) : 0;

          const primaryIntensity = Math.max(planetShade, visibleRing, moonIntensity);

          if (primaryIntensity > 0.08) {
            output += saturnGlyph(primaryIntensity);
          } else {
            output += starGlyph(starGlow);
          }
        }
        if (row < rows - 1) output += "\n";
      }

      if (output !== lastOutput) {
        preEl.textContent = output;
        lastOutput = output;
      }
    }

    function step(time: number) {
      if (!loopActive) return;
      frameRef.current = requestAnimationFrame(step);
      if (time - lastRenderAt < FRAME_INTERVAL_MS) return;
      lastRenderAt = time;
      tick += 1;
      drawSaturnFrame(tick);
    }

    function syncLoop() {
      const canRender = cols > 0 && rows > 0;
      if (motionMedia.matches) {
        if (loopActive) {
          loopActive = false;
          if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        if (canRender) drawSaturnFrame(0);
        return;
      }

      if (!isVisible || !canRender) {
        if (loopActive) {
          loopActive = false;
          if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        return;
      }

      if (!loopActive) {
        loopActive = true;
        lastRenderAt = 0;
        frameRef.current = requestAnimationFrame(step);
      }
    }

    const observer = new ResizeObserver(() => {
      const size = measureChar(preEl);
      charW = size.w;
      charH = size.h;
      rebuildGrid();
      syncLoop();
    });
    observer.observe(preEl);

    const onVisibilityChange = () => {
      isVisible = document.visibilityState !== "hidden";
      syncLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onMotionChange = () => syncLoop();
    motionMedia.addEventListener("change", onMotionChange);

    const size = measureChar(preEl);
    charW = size.w;
    charH = size.h;
    rebuildGrid();
    syncLoop();

    return () => {
      loopActive = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionMedia.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <pre
      ref={preRef}
      className="m-0 h-full w-full select-none overflow-hidden p-8 text-foreground/24 leading-none [text-shadow:0_0_22px_rgba(148,163,184,0.08)]"
      style={{ fontSize: "11px", fontFamily: "monospace" }}
      aria-hidden="true"
    />
  );
}
