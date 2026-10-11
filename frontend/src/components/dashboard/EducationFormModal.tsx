import React, { useState, useEffect } from "react";
import type { EducationRecord, EducationLevel } from "../../types/dashboard";
import Modal from "../common/Modal";
import styles from "./EducationFormModal.module.css";

interface EducationFormModalProps {
  isOpen: boolean;
  editingRecord: EducationRecord | null;
  onClose: () => void;
  onSave: (record: EducationRecord) => void;
}

const defaultFormData = {
  level: "ug" as EducationLevel,
  institutionName: "",
  board: "",
  stream: "",
  degree: "",
  specialization: "",
  passingYear: "",
  startYear: "",
  completionYear: "",
  isCurrentlyStudying: false,
  gradingType: "cgpa" as "percentage" | "cgpa",
  percentage: "",
  cgpa: "",
  cgpaScale: "10",
};

export const EducationFormModal: React.FC<EducationFormModalProps> = ({
  isOpen,
  editingRecord,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(defaultFormData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        level: editingRecord.level,
        institutionName: editingRecord.institutionName || "",
        board: editingRecord.board || "",
        stream: editingRecord.stream || "",
        degree: editingRecord.degree || "",
        specialization: editingRecord.specialization || "",
        passingYear: editingRecord.passingYear ? String(editingRecord.passingYear) : "",
        startYear: editingRecord.startYear ? String(editingRecord.startYear) : "",
        completionYear: editingRecord.completionYear ? String(editingRecord.completionYear) : "",
        isCurrentlyStudying: Boolean(editingRecord.isCurrentlyStudying),
        gradingType: editingRecord.gradingType || (editingRecord.cgpa !== undefined ? "cgpa" : "percentage"),
        percentage: editingRecord.percentage !== undefined ? String(editingRecord.percentage) : "",
        cgpa: editingRecord.cgpa !== undefined ? String(editingRecord.cgpa) : "",
        cgpaScale: editingRecord.cgpaScale !== undefined ? String(editingRecord.cgpaScale) : "10",
      });
    } else {
      setFormData(defaultFormData);
    }
    setError(null);
  }, [editingRecord, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const instName = formData.institutionName.trim();
    if (!instName) {
      setError("Please enter the school or institution name.");
      return;
    }

    const currentYear = new Date().getFullYear();

    if (formData.level === "class_10") {
      if (!formData.board.trim()) {
        setError("Please enter the examination board (e.g., CBSE, ICSE, State Board).");
        return;
      }
      const pYear = parseInt(formData.passingYear, 10);
      if (isNaN(pYear) || pYear < 1990 || pYear > currentYear) {
        setError(`Please enter a valid passing year between 1990 and ${currentYear}.`);
        return;
      }
      const pct = parseFloat(formData.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError("Percentage must be a number between 0 and 100.");
        return;
      }
    } else if (formData.level === "class_12") {
      if (!formData.board.trim()) {
        setError("Please enter the examination board.");
        return;
      }
      if (!formData.stream.trim()) {
        setError("Please specify your stream (e.g., Science, Commerce, Arts).");
        return;
      }
      const pYear = parseInt(formData.passingYear, 10);
      if (isNaN(pYear) || pYear < 1990 || pYear > currentYear) {
        setError(`Please enter a valid passing year between 1990 and ${currentYear}.`);
        return;
      }
      const pct = parseFloat(formData.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError("Percentage must be a number between 0 and 100.");
        return;
      }
    } else {
      // UG / PG
      if (!formData.degree.trim()) {
        setError("Please specify the degree (e.g., B.Tech, B.Sc, M.Tech, MBA).");
        return;
      }
      if (!formData.specialization.trim()) {
        setError("Please specify the branch or specialization.");
        return;
      }

      const sYear = parseInt(formData.startYear, 10);
      if (isNaN(sYear) || sYear < 1990 || sYear > currentYear + 1) {
        setError(`Please enter a valid start year between 1990 and ${currentYear + 1}.`);
        return;
      }

      const cYear = parseInt(formData.completionYear, 10);
      if (isNaN(cYear) || cYear < sYear || cYear > currentYear + 8) {
        setError("Completion or expected completion year must be greater than or equal to start year.");
        return;
      }

      if (!formData.isCurrentlyStudying) {
        if (formData.gradingType === "percentage") {
          const pct = parseFloat(formData.percentage);
          if (isNaN(pct) || pct < 0 || pct > 100) {
            setError("Percentage must be a number between 0 and 100.");
            return;
          }
        } else {
          const scale = parseFloat(formData.cgpaScale) || 10;
          const cg = parseFloat(formData.cgpa);
          if (isNaN(cg) || cg < 0 || cg > scale) {
            setError(`CGPA must be a valid number between 0 and ${scale}.`);
            return;
          }
        }
      } else {
        if (formData.gradingType === "percentage" && formData.percentage.trim() !== "") {
          const pct = parseFloat(formData.percentage);
          if (isNaN(pct) || pct < 0 || pct > 100) {
            setError("Percentage must be between 0 and 100.");
            return;
          }
        }
        if (formData.gradingType === "cgpa" && formData.cgpa.trim() !== "") {
          const scale = parseFloat(formData.cgpaScale) || 10;
          const cg = parseFloat(formData.cgpa);
          if (isNaN(cg) || cg < 0 || cg > scale) {
            setError(`CGPA must be between 0 and ${scale}.`);
            return;
          }
        }
      }
    }

    const newRecord: EducationRecord = {
      id: editingRecord ? editingRecord.id : `edu-${Date.now()}`,
      level: formData.level,
      institutionName: instName,
      board: formData.level === "class_10" || formData.level === "class_12" ? formData.board.trim() : undefined,
      stream: formData.level === "class_12" ? formData.stream.trim() : undefined,
      degree: formData.level === "ug" || formData.level === "pg" ? formData.degree.trim() : undefined,
      specialization: formData.level === "ug" || formData.level === "pg" ? formData.specialization.trim() : undefined,
      passingYear:
        formData.level === "class_10" || formData.level === "class_12"
          ? parseInt(formData.passingYear, 10)
          : undefined,
      startYear:
        formData.level === "ug" || formData.level === "pg"
          ? parseInt(formData.startYear, 10)
          : undefined,
      completionYear:
        formData.level === "ug" || formData.level === "pg"
          ? parseInt(formData.completionYear, 10)
          : undefined,
      isCurrentlyStudying:
        formData.level === "ug" || formData.level === "pg" ? formData.isCurrentlyStudying : undefined,
      gradingType:
        formData.level === "ug" || formData.level === "pg" ? formData.gradingType : undefined,
      percentage:
        formData.level === "class_10" || formData.level === "class_12"
          ? parseFloat(formData.percentage)
          : formData.gradingType === "percentage" && formData.percentage.trim() !== ""
          ? parseFloat(formData.percentage)
          : undefined,
      cgpa:
        (formData.level === "ug" || formData.level === "pg") &&
        formData.gradingType === "cgpa" &&
        formData.cgpa.trim() !== ""
          ? parseFloat(formData.cgpa)
          : undefined,
      cgpaScale:
        (formData.level === "ug" || formData.level === "pg") && formData.gradingType === "cgpa"
          ? parseFloat(formData.cgpaScale) || 10
          : undefined,
    };

    onSave(newRecord);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRecord ? "Edit Education Record" : "Add Education Record"}
      subtitle="Select the education level and enter your institution details."
    >
      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Level Selector Pills */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Select Education Level</label>
          <div className={styles.levelSelector}>
            <button
              type="button"
              className={`${styles.levelPill} ${
                formData.level === "class_10" ? styles.activeLevelPill : ""
              }`}
              onClick={() => setFormData({ ...formData, level: "class_10" })}
            >
              Class 10th
            </button>
            <button
              type="button"
              className={`${styles.levelPill} ${
                formData.level === "class_12" ? styles.activeLevelPill : ""
              }`}
              onClick={() => setFormData({ ...formData, level: "class_12" })}
            >
              Class 12th
            </button>
            <button
              type="button"
              className={`${styles.levelPill} ${
                formData.level === "ug" ? styles.activeLevelPill : ""
              }`}
              onClick={() => setFormData({ ...formData, level: "ug" })}
            >
              Undergrad (UG)
            </button>
            <button
              type="button"
              className={`${styles.levelPill} ${
                formData.level === "pg" ? styles.activeLevelPill : ""
              }`}
              onClick={() => setFormData({ ...formData, level: "pg" })}
            >
              Postgrad (PG)
            </button>
          </div>
        </div>

        {/* CLASS 10TH */}
        {formData.level === "class_10" && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>School Name *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Delhi Public School"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Board of Examination *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., CBSE, ICSE, State Board"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Passing Year *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g., 2020"
                  value={formData.passingYear}
                  onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Percentage (%) *</label>
              <input
                type="number"
                step="0.01"
                className={styles.formInput}
                placeholder="e.g., 94.2"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                required
              />
              <div className={styles.formHelpText}>Must be between 0 and 100.</div>
            </div>
          </>
        )}

        {/* CLASS 12TH */}
        {formData.level === "class_12" && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>School / Junior College Name *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Delhi Public School"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Board of Examination *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., CBSE, ISC, State Board"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Passing Year *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g., 2022"
                  value={formData.passingYear}
                  onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Stream *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Science (PCM), Commerce, Arts"
                  value={formData.stream}
                  onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Percentage (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  placeholder="e.g., 92.6"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  required
                />
              </div>
            </div>
          </>
        )}

        {/* UG / PG */}
        {(formData.level === "ug" || formData.level === "pg") && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>College / University Name *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., National Institute of Technology Karnataka (NITK)"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Degree *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder={formData.level === "ug" ? "e.g., B.Tech, B.Sc, BCA" : "e.g., M.Tech, M.Sc, MBA"}
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Branch / Specialization *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Computer Science & Engineering"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Year *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g., 2022"
                  value={formData.startYear}
                  onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {formData.isCurrentlyStudying ? "Expected Completion Year *" : "Completion Year *"}
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g., 2026"
                  value={formData.completionYear}
                  onChange={(e) => setFormData({ ...formData, completionYear: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Pursuing Checkbox */}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={formData.isCurrentlyStudying}
                onChange={(e) =>
                  setFormData({ ...formData, isCurrentlyStudying: e.target.checked })
                }
              />
              <span>I am currently pursuing this degree (Score is optional)</span>
            </label>

            {/* Grading Scale Switch */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Grading Scale</label>
              <div className={styles.gradingTypeContainer}>
                <button
                  type="button"
                  className={`${styles.gradingTypeBtn} ${
                    formData.gradingType === "cgpa" ? styles.activeGradingTypeBtn : ""
                  }`}
                  onClick={() => setFormData({ ...formData, gradingType: "cgpa" })}
                >
                  CGPA Scale
                </button>
                <button
                  type="button"
                  className={`${styles.gradingTypeBtn} ${
                    formData.gradingType === "percentage" ? styles.activeGradingTypeBtn : ""
                  }`}
                  onClick={() => setFormData({ ...formData, gradingType: "percentage" })}
                >
                  Percentage (%)
                </button>
              </div>
            </div>

            {formData.gradingType === "percentage" ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Percentage (%){" "}
                  {formData.isCurrentlyStudying ? "(Optional)" : "*"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  placeholder="e.g., 88.5"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  required={!formData.isCurrentlyStudying}
                />
                <div className={styles.formHelpText}>Must be between 0 and 100.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    CGPA Score{" "}
                    {formData.isCurrentlyStudying ? "(Optional)" : "*"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    placeholder="e.g., 8.85"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                    required={!formData.isCurrentlyStudying}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Out of Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.formInput}
                    placeholder="10"
                    value={formData.cgpaScale}
                    onChange={(e) => setFormData({ ...formData, cgpaScale: e.target.value })}
                  />
                  <div className={styles.formHelpText}>Default: 10</div>
                </div>
              </div>
            )}
          </>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelModalBtn}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className={styles.saveModalBtn}>
            {editingRecord ? "Update Record" : "Save Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EducationFormModal;

