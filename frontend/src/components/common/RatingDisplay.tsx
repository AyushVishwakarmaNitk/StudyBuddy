import React from "react";
import type { UserRating } from "../../types/dashboard";
import styles from "./RatingDisplay.module.css";

interface RatingDisplayProps {
  rating?: UserRating | null;
  showNotice?: boolean;
  className?: string;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  showNotice = true,
  className = "",
}) => {
  const hasRatings = Boolean(rating && rating.count > 0);
  const roundedStars = hasRatings ? Math.round(rating!.average) : 0;

  return (
    <div className={`${styles.ratingContainer} ${className}`}>
      <div className={styles.ratingLeft}>
        <span className={styles.ratingTitle}>Partner Feedback & Consistency</span>
        {hasRatings ? (
          <div className={styles.ratingValueRow}>
            <span className={styles.ratingStars}>
              {"★".repeat(roundedStars)}
              {"☆".repeat(5 - roundedStars)}
            </span>
            <span className={styles.ratingScoreText}>
              {rating!.average} / 5.0
            </span>
            <span className={styles.ratingCountText}>
              ({rating!.count} ratings from study partners)
            </span>
          </div>
        ) : (
          <div className={styles.noRatingsBadge}>
            <span>★</span>
            <span>No ratings yet</span>
          </div>
        )}
      </div>

      {showNotice && (
        <div className={styles.ratingLockNotice}>
          🔒 Partner ratings are given automatically after study sessions and cannot be manually edited.
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;

