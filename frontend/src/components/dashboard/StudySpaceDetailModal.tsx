import React from "react";
import type { StudySpace } from "../../types/dashboard";
import Modal from "../common/Modal";

interface StudySpaceDetailModalProps {
  isOpen: boolean;
  space: StudySpace | null;
  onClose: () => void;
  onCompleteSession: (spaceId: string) => void;
}

export const StudySpaceDetailModal: React.FC<StudySpaceDetailModalProps> = ({
  isOpen,
  space,
  onClose,
  onCompleteSession,
}) => {
  if (!space) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge={space.subject}
      title={space.title}
      subtitle={`Active study space with ${space.partner?.name || "partner"}`}
    >
      <div
        style={{
          background: "#faf7f5",
          borderLeft: "3px solid #ff4b2b",
          padding: "10px 14px",
          borderRadius: "0 12px 12px 0",
          fontSize: "12.5px",
          color: "#1e242b",
          lineHeight: 1.5,
          margin: "0 0 18px",
        }}
      >
        <strong style={{ color: "#ff4b2b" }}>Goal:</strong> {space.goal}
      </div>

      <div style={{ marginBottom: "20px", fontSize: "13px", lineHeight: "1.6" }}>
        <p style={{ margin: "4px 0" }}>
          📅 <strong>Schedule:</strong> {space.schedule}
        </p>
        <p style={{ margin: "4px 0" }}>
          ⏱️ <strong>Session Duration:</strong> {space.duration}
        </p>
        <p style={{ margin: "4px 0" }}>
          💡 <strong>Style:</strong> {space.learningStyle}
        </p>
        <p style={{ margin: "4px 0" }}>
          ✅ <strong>Sessions Completed:</strong> {space.sessionsCompleted}
        </p>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            fontWeight: 600,
            color: "#5f6c7b",
            marginBottom: "8px",
          }}
        >
          <span>Current Progress</span>
          <span>{space.progressPercent}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#f0edea",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${space.progressPercent}%`,
              background: "linear-gradient(135deg, #ff4b2b 0%, #ff6e40 100%)",
              borderRadius: "10px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #ff4b2b 0%, #ff6e40 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(255, 75, 43, 0.28)",
            fontFamily: "inherit",
          }}
          onClick={() => onCompleteSession(space.id)}
        >
          Log Completed Session (+15%) 📈
        </button>
      </div>
    </Modal>
  );
};

export default StudySpaceDetailModal;

