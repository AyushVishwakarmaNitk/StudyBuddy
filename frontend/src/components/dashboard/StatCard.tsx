import React from "react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  number: number | string;
  title: string;
  subtitle: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  title,
  subtitle,
}) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.statNumber}>{number}</div>
      <div className={styles.statInfo}>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
};

export default StatCard;

