import React from "react";
import type { EducationRecord } from "../../types/dashboard";
import styles from "./EducationCard.module.css";

interface EducationCardProps {
  record: EducationRecord;
  onEdit: (record: EducationRecord) => void;
  onDelete: (record: EducationRecord) => void;
}

export const EducationCard: React.FC<EducationCardProps> = ({
  record,
  onEdit,
  onDelete,
}) => {
  const getLevelLabel = () => {
    switch (record.level) {
      case "class_10":
        return "Class 10th";
      case "class_12":
        return "Class 12th";
      case "ug":
        return "Undergraduate (UG)";
      case "pg":
        return "Postgraduate (PG)";
      default:
        return "Education";
    }
  };

  return (
    <div className={styles.educationCard}>
      <div className={styles.eduCardTop}>
        <div className={styles.eduBadgesRow}>
          <span className={styles.eduLevelBadge}>{getLevelLabel()}</span>
          {record.isCurrentlyStudying && (
            <span className={styles.pursuingBadge}>Currently Pursuing</span>
          )}
        </div>
        <div className={styles.eduActionsGroup}>
          <button
            type="button"
            className={styles.actionIconBtn}
            title="Edit Record"
            onClick={() => onEdit(record)}
          >
            ✏️
          </button>
          <button
            type="button"
            className={`${styles.actionIconBtn} ${styles.deleteIconBtn}`}
            title="Delete Record"
            onClick={() => onDelete(record)}
          >
            🗑️
          </button>
        </div>
      </div>

      <h4 className={styles.eduInstitution}>{record.institutionName}</h4>

      <div className={styles.eduDetailsMeta}>
        {record.level === "class_10" && (
          <span>
            Board: <strong>{record.board}</strong> • Passing Year:{" "}
            <strong>{record.passingYear}</strong>
          </span>
        )}
        {record.level === "class_12" && (
          <span>
            Board: <strong>{record.board}</strong> • Stream:{" "}
            <strong>{record.stream}</strong> • Passing Year:{" "}
            <strong>{record.passingYear}</strong>
          </span>
        )}
        {(record.level === "ug" || record.level === "pg") && (
          <span>
            Degree: <strong>{record.degree}</strong> in{" "}
            <strong>{record.specialization}</strong> • {record.startYear} –{" "}
            {record.completionYear}{" "}
            {record.isCurrentlyStudying ? "(Expected)" : ""}
          </span>
        )}
      </div>

      <div className={styles.eduScoreRow}>
        {record.percentage !== undefined && (
          <span className={styles.eduScoreBadge}>
            Score: {record.percentage}%
          </span>
        )}
        {record.cgpa !== undefined && (
          <span className={styles.eduScoreBadge}>
            CGPA: {record.cgpa} / {record.cgpaScale || 10}
          </span>
        )}
        {record.isCurrentlyStudying &&
          record.percentage === undefined &&
          record.cgpa === undefined && (
            <span className={styles.eduScoreBadgeNeutral}>
              Status: In Progress (Score Pending)
            </span>
          )}
      </div>
    </div>
  );
};

export default EducationCard;

