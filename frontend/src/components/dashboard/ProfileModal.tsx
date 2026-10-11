import React, { useState, useRef, useEffect } from "react";
import type { UserProfile, EducationRecord } from "../../types/dashboard";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import RatingDisplay from "../common/RatingDisplay";
import EducationCard from "./EducationCard";
import styles from "./ProfileModal.module.css";

interface ProfileModalProps {
  isOpen: boolean;
  initialTab?: "personal" | "education";
  profile: UserProfile;
  onClose: () => void;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onOpenAddEdu: () => void;
  onEditEdu: (record: EducationRecord) => void;
  onDeleteEdu: (record: EducationRecord) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  initialTab = "personal",
  profile,
  onClose,
  onSaveProfile,
  onOpenAddEdu,
  onEditEdu,
  onDeleteEdu,
}) => {
  const [activeTab, setActiveTab] = useState<"personal" | "education">(initialTab);
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [imageError, setImageError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setFormData(profile);
    setImageError(null);
    setSuccessMsg(null);
  }, [initialTab, profile, isOpen]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageError("Image size must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSuccessMsg("Profile information saved successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile"
      subtitle="Manage your personal information, study partner feedback, and academic history."
      maxWidth={760}
    >
      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

      {/* Profile Tab Navigation */}
      <div className={styles.profileTabNav}>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${
            activeTab === "personal" ? styles.activeProfileTabBtn : ""
          }`}
          onClick={() => setActiveTab("personal")}
        >
          👤 Profile & Preferences
        </button>
        <button
          type="button"
          className={`${styles.profileTabBtn} ${
            activeTab === "education" ? styles.activeProfileTabBtn : ""
          }`}
          onClick={() => setActiveTab("education")}
        >
          🎓 Education Background ({formData.education?.length || 0})
        </button>
      </div>

      {/* TAB 1: PERSONAL INFORMATION & RATINGS */}
      {activeTab === "personal" && (
        <form onSubmit={handleSave}>
          {/* Partner Rating Box (Non-editable) */}
          <RatingDisplay rating={formData.rating} />

          {/* Profile Picture Upload & Preview */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Profile Picture (DP)</label>
            <div className={styles.avatarUploadRow}>
              <Avatar
                src={formData.avatarUrl}
                name={formData.name}
                size="xl"
              />
              <div className={styles.avatarUploadActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: "none" }}
                  id="avatarFileInputReusable"
                />
                <label
                  htmlFor="avatarFileInputReusable"
                  className={styles.uploadFileBtn}
                >
                  {formData.avatarUrl ? "Change picture" : "Upload picture"}
                </label>
                {formData.avatarUrl && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={handleRemoveAvatar}
                  >
                    Remove photo
                  </button>
                )}
                <span style={{ fontSize: "11px", color: "#8c98a4" }}>
                  PNG, JPG, or WEBP (Max 2MB)
                </span>
              </div>
            </div>
            {imageError && (
              <div style={{ color: "#cf1322", fontSize: "12px", marginTop: "4px" }}>
                {imageError}
              </div>
            )}
          </div>

          {/* Personal Information Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address *</label>
              <input
                type="email"
                className={styles.formInput}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Short Bio</label>
            <textarea
              className={styles.formTextarea}
              placeholder="Tell prospective study partners about your goals, study habits, and interests."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
            <div className={styles.formHelpText}>
              A brief description helps AI pair you with learners who have similar routines.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Current Branch / Department *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Current Academic Year *</label>
              <select
                className={styles.formSelect}
                value={formData.year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: parseInt(e.target.value, 10),
                  })
                }
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year / Dual Degree</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Availability Schedule</label>
            <input
              type="text"
              className={styles.formInput}
              value={formData.studyPreferences.availability}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  studyPreferences: {
                    ...formData.studyPreferences,
                    availability: e.target.value,
                  },
                })
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Preferred Collaboration Style</label>
            <input
              type="text"
              className={styles.formInput}
              value={formData.studyPreferences.collaborationStyle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  studyPreferences: {
                    ...formData.studyPreferences,
                    collaborationStyle: e.target.value,
                  },
                })
              }
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelModalBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveModalBtn}>
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: EDUCATION SECTION */}
      {activeTab === "education" && (
        <div>
          <div className={styles.educationSectionHeader}>
            <div>
              <h3>Academic Records</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5f6c7b" }}>
                Add your 10th, 12th, undergraduate, and postgraduate credentials.
              </p>
            </div>
            <button
              type="button"
              className={styles.addEduBtn}
              onClick={onOpenAddEdu}
            >
              + Add Education
            </button>
          </div>

          {(!formData.education || formData.education.length === 0) ? (
            <div className={styles.emptyEducationState}>
              <div className={styles.emptyEduIcon}>🎓</div>
              <h4>No education records added yet</h4>
              <p>Add your school or university history to help matching algorithms find compatible peers.</p>
              <button
                type="button"
                className={styles.addEduBtn}
                onClick={onOpenAddEdu}
              >
                + Add Your First Education Record
              </button>
            </div>
          ) : (
            <div className={styles.educationCardsList}>
              {formData.education.map((rec) => (
                <EducationCard
                  key={rec.id}
                  record={rec}
                  onEdit={onEditEdu}
                  onDelete={onDeleteEdu}
                />
              ))}
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.saveModalBtn}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProfileModal;

