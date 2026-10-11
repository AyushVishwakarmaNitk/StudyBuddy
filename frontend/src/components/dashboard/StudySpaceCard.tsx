import React from "react";
import type { StudySpace } from "../../types/dashboard";
import styles from "./StudySpaceCard.module.css";

interface StudySpaceCardProps {
  space: StudySpace;
  onOpen: (space: StudySpace) => void;
  onFindPartner: (space: StudySpace) => void;
}

export const StudySpaceCard: React.FC<StudySpaceCardProps> = ({
  space,
  onOpen,
  onFindPartner,
}) => {
  const hasPartner = space.partner !== undefined;

  return (
    <div className={styles.spaceCard}>
      <div className={styles.spaceCardTop}>
        <span className={styles.spaceSubjectBadge}>{space.subject}</span>
        <h3 className={styles.spaceTitle}>{space.title}</h3>

        <div className={styles.spacePartnerRow}>
          {hasPartner ? (
            <>
              <span>Partner:</span>
              <span className={styles.partnerName}>{space.partner?.name}</span>
              <span>•</span>
              <span>
                {space.sessionsCompleted > 0
                  ? `${space.sessionsCompleted} sessions completed`
                  : `${space.upcomingSessions} upcoming session`}
              </span>
            </>
          ) : (
            <span className={styles.partnerNeededBadge}>Partner needed</span>
          )}
        </div>

        <div className={styles.spaceGoalBox}>
          <strong>Goal:</strong> {space.goal}
        </div>

        {hasPartner && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabelRow}>
              <span>Illustrative progress:</span>
              <span>{space.progressPercent}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${space.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        {hasPartner ? (
          <button
            type="button"
            className={`${styles.spaceActionBtn} ${styles.openSpaceBtn}`}
            onClick={() => onOpen(space)}
          >
            Open study space →
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.spaceActionBtn} ${styles.findPartnerBtn}`}
            onClick={() => onFindPartner(space)}
          >
            Find a study partner 🚀
          </button>
        )}
      </div>
    </div>
  );
};

export default StudySpaceCard;

