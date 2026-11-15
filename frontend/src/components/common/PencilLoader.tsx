import React from "react";
import styles from "./PencilLoader.module.css";

interface PencilLoaderProps {
  size?: number;
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const PencilLoader: React.FC<PencilLoaderProps> = ({
  size = 90,
  message,
  subMessage,
  fullScreen = false,
}) => {
  return (
    <div
      className={`${styles.loaderWrapper} ${fullScreen ? styles.fullScreen : ""}`}
      role="status"
      aria-label={message || "Loading..."}
    >
      <div className={styles.svgContainer} style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient
              id="pencilStrokeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ff4b2b" />
              <stop offset="50%" stopColor="#ff6e40" />
              <stop offset="100%" stopColor="#ffa07a" />
            </linearGradient>

            {/* Subtle drop shadow for pencil body */}
            <filter id="pencilShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="1"
                dy="1"
                stdDeviation="1.5"
                floodColor="#1a1a2e"
                floodOpacity="0.18"
              />
            </filter>
          </defs>

          {/* Background circular guide track */}
          <circle className={styles.track} cx="50" cy="50" r="32" />

          {/* Animated drawing / erasing stroke */}
          <circle
            className={styles.drawingArc}
            cx="50"
            cy="50"
            r="32"
          />

          {/* The Orbiting Pencil */}
          {/*
              Pencil tip is oriented at (50, 18), tangent to the circle of radius 32.
              Body angles up and back, with eraser at the rear.
          */}
          <g className={styles.orbitingPencil} filter="url(#pencilShadow)">
            <g transform="translate(50, 18) rotate(35)">
              {/* Lead Tip */}
              <polygon points="0,0 -2.5,-6 2.5,-6" fill="#2d3748" />

              {/* Wooden Sharpened Cone */}
              <polygon points="-2.5,-6 2.5,-6 3.5,-12 -3.5,-12" fill="#f6d365" />

              {/* Pencil Main Barrel (Facets) */}
              <rect x="-3.5" y="-28" width="2.3" height="16" fill="#ff4b2b" />
              <rect x="-1.2" y="-28" width="2.4" height="16" fill="#ff6e40" />
              <rect x="1.2" y="-28" width="2.3" height="16" fill="#e03e20" />

              {/* Metal Ferrule Collar */}
              <rect
                x="-3.5"
                y="-33"
                width="7"
                height="5"
                fill="#cbd5e1"
                rx="0.5"
              />
              <line
                x1="-3.5"
                y1="-30.5"
                x2="3.5"
                y2="-30.5"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />

              {/* Pink Eraser at the top/rear */}
              <rect
                x="-3.2"
                y="-40"
                width="6.4"
                height="7"
                fill="#f472b6"
                rx="2"
              />
            </g>
          </g>
        </svg>
      </div>

      {message && <div className={styles.message}>{message}</div>}
      {subMessage && <div className={styles.subMessage}>{subMessage}</div>}
    </div>
  );
};

export default PencilLoader;
