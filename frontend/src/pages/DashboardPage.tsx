import React, { useState, useRef } from "react";
import type { StudySpace, UserProfile, StudyPartner } from "../types/dashboard";
import styles from "./DashboardPage.module.css";

interface DashboardPageProps {
  onLogout: () => void;
  user?: { username: string };
}

const initialUserProfile: UserProfile = {
  name: "Ayush Vishwakarma",
  username: "ayush_v",
  email: "ayush@example.com",
  avatarUrl: null,
  bio: "3rd Year CSE student passionate about Web Dev, Algorithms & Machine Learning.",
  branch: "Computer Science & Engineering",
  year: 3,
  studyPreferences: {
    subjects: ["Python", "DBMS", "React", "Data Structures"],
    availability: "Evenings 7:00 PM - 10:00 PM",
    sessionDuration: "60 mins",
    collaborationStyle: "Pomodoro & Silent Accountability",
  },
};

const initialStudySpaces: StudySpace[] = [
  {
    id: "space-1",
    title: "Learn Python",
    subject: "Python",
    goal: "Complete Python fundamentals",
    schedule: "Mon, Wed, Fri · 7:00 PM",
    duration: "60 mins",
    learningStyle: "Pomodoro Focus",
    partner: {
      id: "p-alex",
      name: "Alex",
      branch: "CSE",
      year: 3,
      compatibility: 95,
      bio: "Python & Backend enthusiast, building APIs",
    },
    sessionsCompleted: 3,
    upcomingSessions: 1,
    progressPercent: 55,
    status: "active",
  },
  {
    id: "space-2",
    title: "DBMS Exam Prep",
    subject: "DBMS",
    goal: "Revise normalization and SQL",
    schedule: "Tue, Thu · 8:00 PM",
    duration: "90 mins",
    learningStyle: "Active Problem Solving",
    partner: {
      id: "p-sam",
      name: "Sam",
      branch: "IT",
      year: 3,
      compatibility: 91,
      bio: "Preparing for semester finals & database design",
    },
    sessionsCompleted: 4,
    upcomingSessions: 1,
    progressPercent: 80,
    status: "active",
  },
  {
    id: "space-3",
    title: "Web Development",
    subject: "React & TypeScript",
    goal: "Build a React project together.",
    schedule: "Weekends · 4:00 PM",
    duration: "120 mins",
    learningStyle: "Collaborative Pair Coding",
    partner: undefined,
    sessionsCompleted: 0,
    upcomingSessions: 0,
    progressPercent: 10,
    status: "partner_needed",
  },
];

const mockAvailablePartners: StudyPartner[] = [
  {
    id: "p-priya",
    name: "Priya Sharma",
    branch: "CSE",
    year: 3,
    compatibility: 96,
    bio: "Focusing on Full-Stack React & Node.js projects.",
  },
  {
    id: "p-rohan",
    name: "Rohan Verma",
    branch: "IT",
    year: 3,
    compatibility: 89,
    bio: "Looking for a dedicated coding accountability partner.",
  },
  {
    id: "p-sneha",
    name: "Sneha Patel",
    branch: "ECE",
    year: 2,
    compatibility: 86,
    bio: "Studying Web Development fundamentals & Git.",
  },
];

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfile>(initialUserProfile);
  const [spaces, setSpaces] = useState<StudySpace[]>(initialStudySpaces);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState<boolean>(false);
  const [activeSpaceForPartner, setActiveSpaceForPartner] = useState<StudySpace | null>(null);
  const [selectedSpaceDetail, setSelectedSpaceDetail] = useState<StudySpace | null>(null);

  // Add Goal Form State
  const [newGoalData, setNewGoalData] = useState({
    title: "",
    subject: "",
    goal: "",
    schedule: "Evenings 7:00 PM - 9:00 PM",
    duration: "60 mins",
    learningStyle: "Pomodoro Focus",
  });

  // Edit Profile Form State
  const [editProfileData, setEditProfileData] = useState<UserProfile>(initialUserProfile);
  const [profileImageError, setProfileImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const totalGoals = spaces.length;
  const totalPartners = spaces.filter((s) => s.partner !== undefined).length;
  const totalUpcomingSessions = spaces.reduce((acc, s) => acc + s.upcomingSessions, 0);

  // Handle Avatar Upload with Validation
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setProfileImageError(null);

    if (!file) return;

    // Validation: Image type
    if (!file.type.startsWith("image/")) {
      setProfileImageError("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    // Validation: Size < 2MB
    if (file.size > 2 * 1024 * 1024) {
      setProfileImageError("Image size must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditProfileData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setEditProfileData((prev) => ({ ...prev, avatarUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenEditProfile = () => {
    setEditProfileData(profile);
    setProfileImageError(null);
    setIsDropdownOpen(false);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(editProfileData);
    setIsProfileModalOpen(false);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalData.title || !newGoalData.goal) return;

    const newSpace: StudySpace = {
      id: `space-${Date.now()}`,
      title: newGoalData.title,
      subject: newGoalData.subject || newGoalData.title,
      goal: newGoalData.goal,
      schedule: newGoalData.schedule,
      duration: newGoalData.duration,
      learningStyle: newGoalData.learningStyle,
      partner: undefined,
      sessionsCompleted: 0,
      upcomingSessions: 0,
      progressPercent: 0,
      status: "partner_needed",
    };

    setSpaces((prev) => [newSpace, ...prev]);
    setIsAddGoalModalOpen(false);
    setNewGoalData({
      title: "",
      subject: "",
      goal: "",
      schedule: "Evenings 7:00 PM - 9:00 PM",
      duration: "60 mins",
      learningStyle: "Pomodoro Focus",
    });
  };

  const handleAssignPartner = (partner: StudyPartner) => {
    if (!activeSpaceForPartner) return;
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === activeSpaceForPartner.id
          ? {
              ...s,
              partner,
              status: "active",
              upcomingSessions: 1,
            }
          : s
      )
    );
    setActiveSpaceForPartner(null);
  };

  const handleCompleteSession = (spaceId: string) => {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id === spaceId) {
          const newProgress = Math.min(100, s.progressPercent + 15);
          return {
            ...s,
            sessionsCompleted: s.sessionsCompleted + 1,
            progressPercent: newProgress,
          };
        }
        return s;
      })
    );
    if (selectedSpaceDetail && selectedSpaceDetail.id === spaceId) {
      setSelectedSpaceDetail((prev) =>
        prev
          ? {
              ...prev,
              sessionsCompleted: prev.sessionsCompleted + 1,
              progressPercent: Math.min(100, prev.progressPercent + 15),
            }
          : null
      );
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      {/* 1. TOP NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.brandGroup}>
            <div className={styles.logoIcon}>SB</div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>StudyBuddy</span>
              <span className={styles.brandTagline}>Study smarter together</span>
            </div>
          </div>

          <div className={styles.navRight}>
            <button
              type="button"
              className={styles.profileTrigger}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              <div className={styles.avatarSmall}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className={styles.avatarImg} />
                ) : (
                  profile.name.charAt(0)
                )}
              </div>
              <span className={styles.profileTriggerName}>{profile.name.split(" ")[0]}</span>
              <span className={styles.chevronIcon}>▼</span>
            </button>

            {/* Profile Dropdown */}
            {isDropdownOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.dropdownHeader}>
                  <p className={styles.dropdownName}>{profile.name}</p>
                  <p className={styles.dropdownEmail}>{profile.email}</p>
                  <span className={styles.dropdownBranch}>
                    {profile.branch} • Year {profile.year}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleOpenEditProfile}
                >
                  👤 Edit Profile & DP
                </button>

                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsAddGoalModalOpen(true);
                  }}
                >
                  🎯 Add Study Goal
                </button>

                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                  onClick={onLogout}
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className={styles.mainContainer}>
        {/* Welcome Banner */}
        <section className={styles.welcomeBanner}>
          <div className={styles.welcomeContent}>
            <h1>Welcome back! 👋</h1>
            <p className={styles.welcomeSubtitle}>Your goals, your partners, your progress.</p>
            <p className={styles.welcomeDescription}>
              Your study journey, all in one place. Manage your study goals and find partners who fit each one.
            </p>
          </div>
          <button
            type="button"
            className={styles.addGoalBtn}
            onClick={() => setIsAddGoalModalOpen(true)}
          >
            + Add a study goal
          </button>
        </section>

        {/* Summary Stats Row */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{totalGoals}</div>
            <div className={styles.statInfo}>
              <h3>Study goals</h3>
              <p>Active learning objectives</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statNumber}>{totalPartners}</div>
            <div className={styles.statInfo}>
              <h3>Study partners</h3>
              <p>Collaborating students</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statNumber}>{totalUpcomingSessions}</div>
            <div className={styles.statInfo}>
              <h3>Upcoming sessions</h3>
              <p>Scheduled this week</p>
            </div>
          </div>
        </section>

        {/* Study Spaces Section */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>My study spaces</h2>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
            >
              View all
            </button>
          </div>

          <div className={styles.spacesGrid}>
            {spaces.map((space) => {
              const hasPartner = space.partner !== undefined;
              return (
                <div key={space.id} className={styles.spaceCard}>
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
                        onClick={() => setSelectedSpaceDetail(space)}
                      >
                        Open study space →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.spaceActionBtn} ${styles.findPartnerBtn}`}
                        onClick={() => setActiveSpaceForPartner(space)}
                      >
                        Find a study partner 🚀
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className={styles.disclaimerNote}>
            Conceptual UI with fictional names and example progress. Real information will come from the student's account and backend.
          </p>
        </section>
      </main>

      {/* 3. MODAL: ADD A STUDY GOAL */}
      {isAddGoalModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddGoalModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setIsAddGoalModalOpen(false)}
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <h2>+ Add a Study Goal</h2>
              <p>Create a dedicated study space to track progress and find matching partners.</p>
            </div>

            <form onSubmit={handleCreateGoal}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Goal Title / Focus</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Learn Python, DBMS Exam Prep, GATE Mathematics"
                  value={newGoalData.title}
                  onChange={(e) => setNewGoalData({ ...newGoalData, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Subject / Course</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Computer Science, Database Systems, Web Development"
                  value={newGoalData.subject}
                  onChange={(e) => setNewGoalData({ ...newGoalData, subject: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Specific Target / Objective</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="e.g., Complete Python fundamentals and solve 30 LeetCode questions together."
                  value={newGoalData.goal}
                  onChange={(e) => setNewGoalData({ ...newGoalData, goal: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Preferred Schedule</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newGoalData.schedule}
                  onChange={(e) => setNewGoalData({ ...newGoalData, schedule: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Session Duration & Style</label>
                <select
                  className={styles.formSelect}
                  value={newGoalData.learningStyle}
                  onChange={(e) => setNewGoalData({ ...newGoalData, learningStyle: e.target.value })}
                >
                  <option value="Pomodoro Focus">Pomodoro (25m Focus / 5m Break)</option>
                  <option value="Silent Accountability">Silent Accountability</option>
                  <option value="Active Problem Solving">Active Problem Solving & Discussion</option>
                  <option value="Collaborative Pair Coding">Collaborative Pair Coding</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={() => setIsAddGoalModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveModalBtn}>
                  Create Study Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: EDIT PROFILE & DP */}
      {isProfileModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setIsProfileModalOpen(false)}
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <h2>Edit Profile</h2>
              <p>Update your personal details, profile picture, and study preferences.</p>
            </div>

            <form onSubmit={handleSaveProfile}>
              {/* Profile Picture Upload & Preview */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Profile Picture (DP)</label>
                <div className={styles.avatarUploadRow}>
                  <div className={styles.avatarLarge}>
                    {editProfileData.avatarUrl ? (
                      <img
                        src={editProfileData.avatarUrl}
                        alt="Preview"
                        className={styles.avatarImg}
                      />
                    ) : (
                      editProfileData.name.charAt(0)
                    )}
                  </div>
                  <div className={styles.avatarUploadActions}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: "none" }}
                      id="avatarFileInput"
                    />
                    <label htmlFor="avatarFileInput" className={styles.uploadFileBtn}>
                      Upload new image
                    </label>
                    {editProfileData.avatarUrl && (
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
                {profileImageError && (
                  <div style={{ color: "#cf1322", fontSize: "12px", marginTop: "4px" }}>
                    {profileImageError}
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Biography</label>
                <textarea
                  className={styles.formTextarea}
                  value={editProfileData.bio}
                  onChange={(e) => setEditProfileData({ ...editProfileData, bio: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Branch / Department</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editProfileData.branch}
                    onChange={(e) =>
                      setEditProfileData({ ...editProfileData, branch: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Academic Year</label>
                  <select
                    className={styles.formSelect}
                    value={editProfileData.year}
                    onChange={(e) =>
                      setEditProfileData({
                        ...editProfileData,
                        year: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Availability Schedule</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editProfileData.studyPreferences.availability}
                  onChange={(e) =>
                    setEditProfileData({
                      ...editProfileData,
                      studyPreferences: {
                        ...editProfileData.studyPreferences,
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
                  value={editProfileData.studyPreferences.collaborationStyle}
                  onChange={(e) =>
                    setEditProfileData({
                      ...editProfileData,
                      studyPreferences: {
                        ...editProfileData.studyPreferences,
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
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveModalBtn}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: FIND PARTNER RECOMMENDATIONS */}
      {activeSpaceForPartner && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveSpaceForPartner(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setActiveSpaceForPartner(null)}
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <h2>Find a Study Partner</h2>
              <p>
                Recommended partners for <strong>{activeSpaceForPartner.title}</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {mockAvailablePartners.map((partner) => (
                <div
                  key={partner.id}
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    border: "1.5px solid var(--border-light)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "15px" }}>{partner.name}</strong>
                      <span
                        style={{
                          background: "var(--primary-soft)",
                          color: "var(--primary)",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {partner.compatibility}% Match
                      </span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      {partner.branch} • Year {partner.year}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-dark)" }}>
                      {partner.bio}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.saveModalBtn}
                    style={{ padding: "8px 18px", fontSize: "12px", whiteSpace: "nowrap" }}
                    onClick={() => handleAssignPartner(partner)}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: OPEN STUDY SPACE DETAIL */}
      {selectedSpaceDetail && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedSpaceDetail(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedSpaceDetail(null)}
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <span className={styles.spaceSubjectBadge}>
                {selectedSpaceDetail.subject}
              </span>
              <h2>{selectedSpaceDetail.title}</h2>
              <p>Active study space with <strong>{selectedSpaceDetail.partner?.name}</strong></p>
            </div>

            <div className={styles.spaceGoalBox} style={{ margin: "0 0 18px" }}>
              <strong>Goal:</strong> {selectedSpaceDetail.goal}
            </div>

            <div style={{ marginBottom: "20px", fontSize: "13px", lineHeight: "1.6" }}>
              <p style={{ margin: "4px 0" }}>
                📅 <strong>Schedule:</strong> {selectedSpaceDetail.schedule}
              </p>
              <p style={{ margin: "4px 0" }}>
                ⏱️ <strong>Session Duration:</strong> {selectedSpaceDetail.duration}
              </p>
              <p style={{ margin: "4px 0" }}>
                💡 <strong>Style:</strong> {selectedSpaceDetail.learningStyle}
              </p>
              <p style={{ margin: "4px 0" }}>
                ✅ <strong>Sessions Completed:</strong> {selectedSpaceDetail.sessionsCompleted}
              </p>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressLabelRow}>
                <span>Current Progress</span>
                <span>{selectedSpaceDetail.progressPercent}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${selectedSpaceDetail.progressPercent}%` }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className={styles.saveModalBtn}
                style={{ width: "100%", padding: "12px" }}
                onClick={() => handleCompleteSession(selectedSpaceDetail.id)}
              >
                Log Completed Session (+15%) 📈
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

