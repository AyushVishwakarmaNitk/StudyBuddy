import React from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
}) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";

  return (
    <div className={`${styles.avatarContainer} ${styles[size]} ${className}`}>
      {src ? (
        <img src={src} alt={name} className={styles.avatarImg} />
      ) : (
        <span className={styles.avatarInitial}>{initial}</span>
      )}
    </div>
  );
};

export default Avatar;

