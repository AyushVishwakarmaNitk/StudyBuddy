import React, { useState, useRef, useMemo } from "react";
import BrandLogo from "../components/common/BrandLogo";
import Avatar from "../components/common/Avatar";
import { authApi } from "../api/auth";
import type { AuthUser } from "../api/auth";
import type { EducationLevel } from "../types/dashboard";
import styles from "./ProfileCompletionPage.module.css";

interface ProfileCompletionPageProps {
  user: AuthUser | null;
  onProfileCompleted: (updatedUser: AuthUser) => void;
  onLogout: () => void;
}

export const ProfileCompletionPage: React.FC<ProfileCompletionPageProps> = ({
  user,
  onProfileCompleted,
  onLogout,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>(() => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user?.username || "";
  });
  const [bio, setBio] = useState<string>(user?.profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.profile?.avatar_url || null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Academic Information & Preferences
  const [branch, setBranch] = useState<string>(user?.profile?.branch || "Computer Science & Engineering");
  const [year, setYear] = useState<number>(user?.profile?.year || 1);
  const [availability, setAvailability] = useState<string>(user?.profile?.availability || "Evenings 7:00 PM - 10:00 PM");
  const [collaborationStyle, setCollaborationStyle] = useState<string>(user?.profile?.collaboration_style || "Pomodoro & Silent Accountability");
  const [subjectsInput, setSubjectsInput] = useState<string>(user?.profile?.subjects || "Python, DBMS, React");

  // Step 3: Education Record
  const [eduLevel, setEduLevel] = useState<EducationLevel>("ug");
  const [eduInstitution, setEduInstitution] = useState<string>("");
  const [eduBoard, setEduBoard] = useState<string>("");
  const [eduStream, setEduStream] = useState<string>("");
  const [eduDegree, setEduDegree] = useState<string>("B.Tech");
  const [eduSpecialization, setEduSpecialization] = useState<string>("Computer Science");
  const [eduPassingYear, setEduPassingYear] = useState<string>("");
  const [eduStartYear, setEduStartYear] = useState<string>("2022");
  const [eduCompletionYear, setEduCompletionYear] = useState<string>("2026");
  const [eduIsCurrentlyStudying, setEduIsCurrentlyStudying] = useState<boolean>(true);
  const [eduGradingType, setEduGradingType] = useState<"percentage" | "cgpa">("cgpa");
  const [eduPercentage, setEduPercentage] = useState<string>("");
  const [eduCgpa, setEduCgpa] = useState<string>("8.5");
  const [eduCgpaScale, setEduCgpaScale] = useState<string>("10");

  // Calculate actual progress based on valid required fields
  const completionProgress = useMemo(() => {
    let score = 0;
    if (name.trim().length >= 2) score += 20;
    if (bio.trim().length >= 10) score += 20;
    if (branch.trim().length >= 2) score += 20;
    if (year >= 1 && year <= 5) score += 20;
    if (eduInstitution.trim().length >= 2) score += 20;
    return score;
  }, [name, bio, branch, year, eduInstitution]);

  // Handle Profile Picture
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file (PNG, JPG, or WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("File size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (bio.trim().length < 10) {
        setErrorMessage("Please enter a short bio (at least 10 characters) to help match you with peers.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!branch.trim()) {
        setErrorMessage("Please provide your department or branch.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!eduInstitution.trim()) {
      setErrorMessage("Please specify your current school, college, or university name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const subjectArray = subjectsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const educationPayload: any = {
        level: eduLevel,
        institution_name: eduInstitution.trim(),
        board: eduBoard.trim(),
        stream: eduStream.trim(),
        degree: eduDegree.trim(),
        specialization: eduSpecialization.trim(),
        passing_year: eduPassingYear ? parseInt(eduPassingYear, 10) : undefined,
        start_year: eduStartYear ? parseInt(eduStartYear, 10) : undefined,
        completion_year: eduCompletionYear ? parseInt(eduCompletionYear, 10) : undefined,
        is_currently_studying: eduIsCurrentlyStudying,
        grading_type: eduGradingType,
        percentage: eduPercentage ? parseFloat(eduPercentage) : undefined,
        cgpa: eduCgpa ? parseFloat(eduCgpa) : undefined,
        cgpa_scale: eduCgpaScale ? parseFloat(eduCgpaScale) : 10.0,
      };

      const payload = {
        name: name.trim(),
        branch: branch.trim(),
        year,
        bio: bio.trim(),
        avatar_url: avatarUrl,
        availability: availability.trim(),
        collaboration_style: collaborationStyle.trim(),
        session_duration: "60 mins",
        subjects: subjectArray,
        education: educationPayload,
      };

      const res = await authApi.completeProfile(payload);
      onProfileCompleted(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete profile onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Top Bar */}
      <header className={styles.topNavbar}>
        <BrandLogo size="md" />
        <button
          type="button"
          className={styles.logoutGhostBtn}
          onClick={onLogout}
        >
          Save & Exit (Logout)
        </button>
      </header>

      {/* Main Container */}
      <main className={styles.mainContainer}>
        <div className={styles.onboardingCard}>
          {/* Header */}
          <div className={styles.headerSection}>
            <span className={styles.headerBadge}>Student Profile Setup</span>
            <h1 className={styles.pageTitle}>Welcome to StudyBuddy! 👋</h1>
            <p className={styles.pageSubtitle}>
              Let's complete your profile so we can match you with the most compatible study partners.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className={styles.progressContainer}>
            <div className={styles.progressHeader}>
              <span>Profile Completion</span>
              <span>{completionProgress}% Complete</span>
            </div>
            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${completionProgress}%` }}
              />
            </div>
          </div>

          {/* Stepped Navigation */}
          <div className={styles.stepsNav}>
            <div
              className={styles.stepNode}
              onClick={() => setCurrentStep(1)}
            >
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 1
                    ? styles.activeStepCircle
                    : currentStep > 1
                    ? styles.completedStepCircle
                    : ""
                }`}
              >
                1
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 1 ? styles.activeStepLabel : ""
                }`}
              >
                Personal Info
              </span>
            </div>

            <div
              className={styles.stepNode}
              onClick={() => currentStep > 1 && setCurrentStep(2)}
            >
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 2
                    ? styles.activeStepCircle
                    : currentStep > 2
                    ? styles.completedStepCircle
                    : ""
                }`}
              >
                2
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 2 ? styles.activeStepLabel : ""
                }`}
              >
                Academic Preferences
              </span>
            </div>

            <div
              className={styles.stepNode}
              onClick={() => currentStep > 2 && setCurrentStep(3)}
            >
              <div
                className={`${styles.stepCircle} ${
                  currentStep === 3 ? styles.activeStepCircle : ""
                }`}
              >
                3
              </div>
              <span
                className={`${styles.stepLabel} ${
                  currentStep === 3 ? styles.activeStepLabel : ""
                }`}
              >
                Education History
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className={styles.errorBanner}>{errorMessage}</div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className={styles.formSection}>
              {/* Profile Picture */}
              <div className={styles.avatarSection}>
                <Avatar src={avatarUrl} name={name || "Student"} size="xl" />
                <div className={styles.avatarActions}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/webp"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                    id="onboardingAvatarInput"
                  />
                  <label htmlFor="onboardingAvatarInput" className={styles.uploadBtn}>
                    {avatarUrl ? "Change Photo" : "Upload Display Picture"}
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      className={styles.removeAvatarBtn}
                      onClick={() => setAvatarUrl(null)}
                    >
                      Remove photo
                    </button>
                  )}
                  <span className={styles.helpText}>
                    Recommended: PNG, JPG, or WEBP (Max 2MB)
                  </span>
                  {imageError && (
                    <div style={{ color: "#cf1322", fontSize: "12px" }}>
                      {imageError}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Full Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Short Bio <span className={styles.requiredStar}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="Tell your future study buddies about your goals, study habits, and favorite subjects..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                />
                <span className={styles.helpText}>
                  A descriptive bio makes it 3x easier to find matching study partners (minimum 10 characters).
                </span>
              </div>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onLogout}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleNext}
                >
                  Continue to Academic Details →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC PREFERENCES */}
          {currentStep === 2 && (
            <div className={styles.formSection}>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Department / Branch <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g., Computer Science & Engineering"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Current Academic Year <span className={styles.requiredStar}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
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
                <label className={styles.label}>Subjects You're Studying</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Python, DBMS, Algorithms, Web Development"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                />
                <span className={styles.helpText}>
                  Separate multiple subjects with commas.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Study Availability</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Weekdays 6:00 PM - 9:00 PM, Weekends flexible"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preferred Collaboration Style</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Pomodoro Focus, Silent Accountability, Pair Coding"
                  value={collaborationStyle}
                  onChange={(e) => setCollaborationStyle(e.target.value)}
                />
              </div>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleBack}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleNext}
                >
                  Continue to Education →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EDUCATION BACKGROUND */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Education Level</label>
                <select
                  className={styles.select}
                  value={eduLevel}
                  onChange={(e) => setEduLevel(e.target.value as EducationLevel)}
                >
                  <option value="ug">Undergraduate (UG)</option>
                  <option value="pg">Postgraduate (PG)</option>
                  <option value="class_12">Class 12th</option>
                  <option value="class_10">Class 10th</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  College / School Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., National Institute of Technology Karnataka (NITK)"
                  value={eduInstitution}
                  onChange={(e) => setEduInstitution(e.target.value)}
                  required
                />
              </div>

              {(eduLevel === "class_10" || eduLevel === "class_12") && (
                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Board Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., CBSE, ICSE, State Board"
                      value={eduBoard}
                      onChange={(e) => setEduBoard(e.target.value)}
                    />
                  </div>
                  {eduLevel === "class_12" && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Stream</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g., Science (PCM), Commerce"
                        value={eduStream}
                        onChange={(e) => setEduStream(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {(eduLevel === "ug" || eduLevel === "pg") && (
                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Degree</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., B.Tech, B.Sc, M.Tech"
                      value={eduDegree}
                      onChange={(e) => setEduDegree(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Specialization</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., Computer Science & Engineering"
                      value={eduSpecialization}
                      onChange={(e) => setEduSpecialization(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Year</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="2022"
                    value={eduStartYear}
                    onChange={(e) => setEduStartYear(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Completion / Expected Year</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="2026"
                    value={eduCompletionYear}
                    onChange={(e) => setEduCompletionYear(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Grading Type</label>
                  <select
                    className={styles.select}
                    value={eduGradingType}
                    onChange={(e) => setEduGradingType(e.target.value as any)}
                  >
                    <option value="cgpa">CGPA</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                {eduGradingType === "cgpa" ? (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>CGPA (out of 10)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      placeholder="8.8"
                      value={eduCgpa}
                      onChange={(e) => setEduCgpa(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.input}
                      placeholder="85.5"
                      value={eduPercentage}
                      onChange={(e) => setEduPercentage(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleBack}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Completing Profile..." : "Complete Profile & Enter Dashboard 🚀"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfileCompletionPage;

