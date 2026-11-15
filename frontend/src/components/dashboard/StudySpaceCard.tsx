import React from "react";
import type { StudySpace } from "../../types/dashboard";
import styles from "./StudySpaceCard.module.css";

interface StudySpaceCardProps {
  space: StudySpace;
  onOpen: (space: StudySpace) => void;
  onFindPartner: (space: StudySpace) => void;
  onDelete?: (space: StudySpace) => void;
  onCancelRequest?: (requestId: string, space: StudySpace) => void;
}

export const StudySpaceCard: React.FC<StudySpaceCardProps> = ({
  space,
  onOpen,
  onFindPartner,
  onDelete,
  onCancelRequest,
}) => {
  const hasPartner = space.partner !== undefined && space.status === "active";
  const isPending = space.status === "pending_request" && space.pendingRequest;

  return (
    <div className={`${styles.spaceCard} ${isPending ? styles.spaceCardPending : ""}`}>
      <div className={styles.spaceCardTop}>
        <div className={styles.cardHeaderRow}>
          <span className={styles.spaceSubjectBadge}>{space.subject}</span>
          {!hasPartner && !isPending && onDelete && (
            <button
              type="button"
              className={styles.deleteGoalBtn}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(space);
              }}
              title="Remove this study goal"
              aria-label="Remove study goal"
            >
              🗑️ Remove
            </button>
          )}
        </div>

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
          ) : isPending ? (
            <div className={styles.pendingRequestInfo}>
              <span className={styles.pendingBadge}>⏳ Pending Request</span>
              <span className={styles.pendingTo}>
                to <strong>{space.pendingRequest!.receiver_name}</strong>
                {space.pendingRequest!.compatibility_score > 0 && (
                  <span className={styles.pendingScore}>
                    {" "}· {space.pendingRequest!.compatibility_score}% match
                  </span>
                )}
              </span>
            </div>
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
        ) : isPending ? (
          <div className={styles.pendingActions}>
            <div className={styles.awaitingText}>⏳ Awaiting response from partner…</div>
            {onCancelRequest && space.pendingRequest && (
              <button
                type="button"
                className={styles.cancelRequestBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRequest(space.pendingRequest!.id, space);
                }}
              >
                Cancel Request
              </button>
            )}
          </div>
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
