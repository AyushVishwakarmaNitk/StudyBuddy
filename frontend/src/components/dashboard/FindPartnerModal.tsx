import React from "react";
import type { StudySpace, StudyPartner } from "../../types/dashboard";
import Modal from "../common/Modal";

interface FindPartnerModalProps {
  isOpen: boolean;
  space: StudySpace | null;
  partners: StudyPartner[];
  onClose: () => void;
  onConnect: (partner: StudyPartner) => void;
}

export const FindPartnerModal: React.FC<FindPartnerModalProps> = ({
  isOpen,
  space,
  partners,
  onClose,
  onConnect,
}) => {
  if (!space) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Find a Study Partner"
      subtitle={`Recommended partners for ${space.title}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {partners.map((partner) => (
          <div
            key={partner.id}
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: "1.5px solid #ece7e3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ fontSize: "15px", color: "#1e242b" }}>
                  {partner.name}
                </strong>
                <span
                  style={{
                    background: "#fff1ed",
                    color: "#ff4b2b",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {partner.compatibility}% Match
                </span>
              </div>
              <p style={{ margin: "4px 0", fontSize: "12px", color: "#5f6c7b" }}>
                {partner.branch} • Year {partner.year}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#1e242b" }}>
                {partner.bio}
              </p>
            </div>

            <button
              type="button"
              style={{
                background: "linear-gradient(135deg, #ff4b2b 0%, #ff6e40 100%)",
                color: "#ffffff",
                border: "none",
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(255, 75, 43, 0.25)",
              }}
              onClick={() => onConnect(partner)}
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default FindPartnerModal;

