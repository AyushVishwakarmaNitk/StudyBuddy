import React from "react";
import styles from "./BrandLogo.module.css";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showTagline = true,
  onClick,
  className = "",
  style,
}) => {
  return (
    <div
      className={`${styles.brandGroup} ${styles[size]} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className={styles.logoIcon}>SB</div>
      <div className={styles.brandText}>
        <span className={styles.brandTitle}>StudyBuddy</span>
        {showTagline && (
          <span className={styles.brandTagline}>Study smarter together</span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
