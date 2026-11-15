import React, { useState, useEffect, useCallback } from "react";
import type {
  StudySpace,
  UserProfile,
  StudyPartner,
  EducationRecord,
  IncomingPartnerRequest,
  StudentNotification,
} from "../types/dashboard";
import type { AuthUser } from "../api/auth";
import { authApi } from "../api/auth";
import { studyBuddyApi } from "../api/studyBuddy";
import { useToast } from "../context/ToastContext";
import BrandLogo from "../components/common/BrandLogo";
import Avatar from "../components/common/Avatar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import StatCard from "../components/dashboard/StatCard";
import StudySpaceCard from "../components/dashboard/StudySpaceCard";
import NotificationBell from "../components/dashboard/NotificationBell";
import AddGoalModal from "../components/dashboard/AddGoalModal";
import EducationFormModal from "../components/dashboard/EducationFormModal";
import FindPartnerModal from "../components/dashboard/FindPartnerModal";
import StudySpaceDetailModal from "../components/dashboard/StudySpaceDetailModal";
import ProfileModal from "../components/dashboard/ProfileModal";
import styles from "./DashboardPage.module.css";

interface DashboardPageProps {
  onLogout: () => void;
  user?: AuthUser | null;
  onFindPartnerForSpace?: (space: StudySpace) => void;
  onOpenStudySpace?: (space: StudySpace) => void;
}

const defaultInitialProfile: UserProfile = {
  name: "Student",
  username: "student",
  email: "student@example.com",
  avatarUrl: null,
  bio: "",
  branch: "",
  year: 1,
  rating: null,
  education: [],
  studyPreferences: {
    subjects: [],
    availability: "",
    sessionDuration: "",
    collaborationStyle: "",
  },
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  onLogout,
  user,
  onFindPartnerForSpace,
  onOpenStudySpace,
}) => {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
      return {
        ...defaultInitialProfile,
        name: fullName,
        username: user.username,
        email: user.email || `${user.username}@example.com`,
        bio: user.profile?.bio || "",
        branch: user.profile?.branch || "",
        year: user.profile?.year || 1,
        avatarUrl: user.profile?.avatar_url || null,
        rating: user.profile?.rating || null,
        studyPreferences: {
          subjects: user.profile?.study_preferences?.subjects || [],
          availability: user.profile?.availability || "",
          sessionDuration: user.profile?.session_duration || "",
          collaborationStyle: user.profile?.collaboration_style || "",
        },
      };
    }
    return defaultInitialProfile;
  });

  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [availablePartners, setAvailablePartners] = useState<StudyPartner[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingPartnerRequest[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"personal" | "education">("personal");

  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState<boolean>(false);
  const [activeSpaceForPartner, setActiveSpaceForPartner] = useState<StudySpace | null>(null);
  const [selectedSpaceDetail, setSelectedSpaceDetail] = useState<StudySpace | null>(null);

  // Education Sub-Modal & Delete Confirmation
  const [isEduModalOpen, setIsEduModalOpen] = useState<boolean>(false);
  const [editingEduRecord, setEditingEduRecord] = useState<EducationRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<EducationRecord | null>(null);

  // Study Goal Delete Confirmation
  const [spaceToDelete, setSpaceToDelete] = useState<StudySpace | null>(null);

  // Load Real Data from Backend APIs on Mount
  const fetchDashboardData = useCallback(async () => {
    try {
      const [educationRecords, studySpaces, partnersList, reqData, userNotifications] = await Promise.all([
        studyBuddyApi.getEducation().catch(() => []),
        studyBuddyApi.getStudySpaces().catch(() => []),
        studyBuddyApi.getAvailablePartners().catch(() => []),
        studyBuddyApi.getPartnerRequests().catch(() => ({ incoming: [], outgoing: [] })),
        studyBuddyApi.getNotifications().catch(() => []),
      ]);

      if (educationRecords && Array.isArray(educationRecords)) {
        setProfile((prev) => ({ ...prev, education: educationRecords }));
      }
      if (Array.isArray(studySpaces)) {
        setSpaces(studySpaces);
      }
      if (partnersList && partnersList.length > 0) {
        setAvailablePartners(partnersList);
      }
      if (reqData?.incoming) {
        setIncomingRequests(reqData.incoming);
      }
      setNotifications(userNotifications);
    } catch (err) {
      console.error("Error loading dashboard data from backend:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Keep the sender's pending goal and decision notifications current when the other student responds.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void fetchDashboardData();
    };
    const intervalId = window.setInterval(refreshIfVisible, 30_000);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [fetchDashboardData]);

  // Sync profile when authenticated user data updates
  useEffect(() => {
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
      setProfile((prev) => ({
        ...prev,
        name: fullName,
        username: user.username,
        email: user.email || prev.email,
        bio: user.profile?.bio ?? prev.bio,
        branch: user.profile?.branch ?? prev.branch,
        year: user.profile?.year ?? prev.year,
        avatarUrl: user.profile?.avatar_url ?? prev.avatarUrl,
        rating: user.profile?.rating ?? prev.rating,
      }));
    }
  }, [user]);

  // Stats calculation
  const totalGoals = spaces.length;
  const totalPartners = spaces.filter((s) => s.partner !== undefined).length;
  const totalUpcomingSessions = spaces.reduce((acc, s) => acc + s.upcomingSessions, 0);

  // Navigation handlers
  const handleOpenProfile = (tab: "personal" | "education" = "personal") => {
    setActiveProfileTab(tab);
    setIsDropdownOpen(false);
    setIsProfileModalOpen(true);
  };

  // Profile update handler
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    try {
      await authApi.updateProfile({
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        branch: updatedProfile.branch,
        year: updatedProfile.year,
        avatar_url: updatedProfile.avatarUrl,
        availability: updatedProfile.studyPreferences.availability,
        collaboration_style: updatedProfile.studyPreferences.collaborationStyle,
        session_duration: updatedProfile.studyPreferences.sessionDuration,
        subjects: updatedProfile.studyPreferences.subjects,
      });
      toast.success("Profile saved successfully!", "Profile Updated");
    } catch (err) {
      toast.error(err, "Profile Save Failed");
    }
  };

  // Education handlers
  const handleOpenAddEdu = () => {
    setEditingEduRecord(null);
    setIsEduModalOpen(true);
  };

  const handleOpenEditEdu = (record: EducationRecord) => {
    setEditingEduRecord(record);
    setIsEduModalOpen(true);
  };

  const handleSaveEduRecord = async (newOrUpdated: EducationRecord) => {
    const currentList = profile.education || [];

    if (editingEduRecord) {
      try {
        const saved = await studyBuddyApi.updateEducation(editingEduRecord.id, newOrUpdated);
        const updatedList = currentList.map((rec) =>
          rec.id === editingEduRecord.id ? saved : rec
        );
        setProfile({ ...profile, education: updatedList });
        toast.success("Education record updated.", "Education Saved");
      } catch (err) {
        toast.error(err, "Save Failed");
        const updatedList = currentList.map((rec) =>
          rec.id === editingEduRecord.id ? newOrUpdated : rec
        );
        setProfile({ ...profile, education: updatedList });
      }
    } else {
      try {
        const saved = await studyBuddyApi.createEducation(newOrUpdated);
        setProfile({ ...profile, education: [...currentList, saved] });
        toast.success("Education record added.", "Education Saved");
      } catch (err) {
        toast.error(err, "Save Failed");
        setProfile({ ...profile, education: [...currentList, newOrUpdated] });
      }
    }

    setIsEduModalOpen(false);
    setEditingEduRecord(null);
  };

  const handlePromptDeleteEdu = (record: EducationRecord) => {
    setRecordToDelete(record);
  };

  const handleConfirmDeleteEdu = async () => {
    if (!recordToDelete) return;
    const currentList = profile.education || [];
    try {
      await studyBuddyApi.deleteEducation(recordToDelete.id);
      toast.success("Education record removed.", "Deleted");
    } catch (e) {
      console.error("Error deleting education record:", e);
    }
    const updatedList = currentList.filter((rec) => rec.id !== recordToDelete.id);
    setProfile({ ...profile, education: updatedList });
    setRecordToDelete(null);
  };

  // Study Space Handlers
  const handleCreateGoal = async (goalData: {
    title: string;
    subject: string;
    goal: string;
    schedule?: string;
    duration?: string;
    learningStyle?: string;
  }) => {
    try {
      const createdSpace = await studyBuddyApi.createStudySpace(goalData);
      setSpaces((prev) => [createdSpace, ...prev]);
      toast.success(`Study goal "${goalData.title}" created! Now find a partner to get started.`, "Goal Added 🎯");
    } catch (err) {
      toast.error(err, "Failed to Create Goal");
      const fallbackSpace: StudySpace = {
        id: `space-${Date.now()}`,
        title: goalData.title,
        subject: goalData.subject || goalData.title,
        goal: goalData.goal,
        schedule: goalData.schedule || "",
        duration: goalData.duration || "60 mins",
        learningStyle: goalData.learningStyle || "",
        partner: undefined,
        sessionsCompleted: 0,
        upcomingSessions: 0,
        progressPercent: 0,
        status: "partner_needed",
      };
      setSpaces((prev) => [fallbackSpace, ...prev]);
    }
    setIsAddGoalModalOpen(false);
  };

  const handlePromptDeleteSpace = (space: StudySpace) => {
    // Only allow deletion if the goal is not paired with a student
    if (!space.partner) {
      setSpaceToDelete(space);
    }
  };

  const handleConfirmDeleteSpace = async () => {
    if (!spaceToDelete) return;
    try {
      await studyBuddyApi.deleteStudySpace(spaceToDelete.id);
      setSpaces((prev) => prev.filter((s) => s.id !== spaceToDelete.id));
      toast.success(`Study goal "${spaceToDelete.title}" removed.`, "Goal Removed");
    } catch (err) {
      toast.error(err, "Failed to Remove Goal");
      setSpaces((prev) => prev.filter((s) => s.id !== spaceToDelete.id));
    } finally {
      setSpaceToDelete(null);
    }
  };

  const handleCancelRequest = async (requestId: string, space: StudySpace) => {
    try {
      await studyBuddyApi.cancelPartnerRequest(requestId);
      setSpaces((prev) =>
        prev.map((s) =>
          s.id === space.id
            ? { ...s, status: "partner_needed" as const, pendingRequest: null }
            : s
        )
      );
      toast.info("Partner request cancelled. You can find a new partner.", "Request Cancelled");
    } catch (err) {
      toast.error(err, "Could Not Cancel Request");
    }
  };

  const handleAssignPartner = async (partner: StudyPartner) => {
    if (!activeSpaceForPartner) return;
    const spaceId = activeSpaceForPartner.id;

    try {
      const request = await studyBuddyApi.sendPartnerRequest({
        receiver_id: partner.id,
        study_space_id: spaceId,
        compatibility_score: partner.compatibility,
      });
      setSpaces((prev) => prev.map((s) => s.id === spaceId ? {
        ...s,
        partner: undefined,
        status: "pending_request",
        pendingRequest: {
          id: String(request.id),
          receiver_id: partner.id,
          receiver_name: partner.name,
          compatibility_score: partner.compatibility,
          created_at: request.created_at,
        },
      } : s));
      toast.success(`Partner request sent to ${partner.name}. Your goal will become active after they accept.`, "Request Sent");
      setActiveSpaceForPartner(null);
    } catch (err) {
      toast.error(err, "Could Not Send Request");
    }
  };

  const handleCompleteSession = async (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return;

    const newProgress = Math.min(100, space.progressPercent + 15);
    const newSessionsCompleted = space.sessionsCompleted + 1;

    try {
      await studyBuddyApi.updateStudySpace(spaceId, {
        sessions_completed: newSessionsCompleted,
        progress_percent: newProgress,
      });
    } catch (e) {
      console.error("Error updating session progress:", e);
    }

    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id === spaceId) {
          return {
            ...s,
            sessionsCompleted: newSessionsCompleted,
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
              sessionsCompleted: newSessionsCompleted,
              progressPercent: newProgress,
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
          <BrandLogo size="md" />

          <div className={styles.navRight}>
              <NotificationBell
                requests={incomingRequests}
                notifications={notifications}
                onRequestActioned={fetchDashboardData}
              />
              <button
              type="button"
              className={styles.profileTrigger}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              <Avatar
                src={profile.avatarUrl}
                name={profile.name}
                size="sm"
              />
              <span className={styles.profileTriggerName}>
                {profile.name.split(" ")[0]}
              </span>
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
                  onClick={() => handleOpenProfile("personal")}
                >
                  👤 Edit Profile & DP
                </button>

                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleOpenProfile("education")}
                >
                  🎓 Education Details
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
            <h1>Welcome back, {profile.name.split(" ")[0]}! 👋</h1>
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
          <StatCard
            number={totalGoals}
            title="Study goals"
            subtitle="Active learning objectives"
          />
          <StatCard
            number={totalPartners}
            title="Study partners"
            subtitle="Collaborating students"
          />
          <StatCard
            number={totalUpcomingSessions}
            title="Upcoming sessions"
            subtitle="Scheduled this week"
          />
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
            {spaces.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🎯</div>
                <h3 className={styles.emptyStateTitle}>No study goals yet</h3>
                <p className={styles.emptyStateText}>
                  Create your first study goal to find a partner and start learning together.
                </p>
                <button
                  type="button"
                  className={styles.addGoalBtn}
                  onClick={() => setIsAddGoalModalOpen(true)}
                >
                  + Add your first study goal
                </button>
              </div>
            ) : (
              spaces.map((space) => (
                <StudySpaceCard
                  key={space.id}
                  space={space}
                  onOpen={(s) => {
                    if (onOpenStudySpace) onOpenStudySpace(s);
                    else setSelectedSpaceDetail(s);
                  }}
                  onFindPartner={(s) => {
                    if (onFindPartnerForSpace) {
                      onFindPartnerForSpace(s);
                    } else {
                      setActiveSpaceForPartner(s);
                    }
                  }}
                  onDelete={(s) => handlePromptDeleteSpace(s)}
                  onCancelRequest={(requestId, s) => handleCancelRequest(requestId, s)}
                />
              ))
            )}
          </div>

          <p className={styles.disclaimerNote}>
            All study goals, partner collaborations, and progress sessions are saved to your account in real-time.
          </p>
        </section>
      </main>

      {/* 3. MODALS */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSubmit={handleCreateGoal}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        initialTab={activeProfileTab}
        profile={profile}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        onOpenAddEdu={handleOpenAddEdu}
        onEditEdu={handleOpenEditEdu}
        onDeleteEdu={handlePromptDeleteEdu}
      />

      <EducationFormModal
        isOpen={isEduModalOpen}
        editingRecord={editingEduRecord}
        onClose={() => {
          setIsEduModalOpen(false);
          setEditingEduRecord(null);
        }}
        onSave={handleSaveEduRecord}
      />

      <FindPartnerModal
        isOpen={Boolean(activeSpaceForPartner)}
        space={activeSpaceForPartner}
        partners={availablePartners}
        onClose={() => setActiveSpaceForPartner(null)}
        onConnect={handleAssignPartner}
      />

      <StudySpaceDetailModal
        isOpen={Boolean(selectedSpaceDetail)}
        space={selectedSpaceDetail}
        onClose={() => setSelectedSpaceDetail(null)}
        onCompleteSession={handleCompleteSession}
      />

      {/* Confirm Delete Education Record */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Delete Education Record?"
        message={
          recordToDelete
            ? `Are you sure you want to remove ${recordToDelete.institutionName}? This action cannot be undone.`
            : ""
        }
        confirmText="Yes, Delete Record"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDeleteEdu}
        onCancel={() => setRecordToDelete(null)}
      />

      {/* Confirm Remove Unpaired Study Goal */}
      <ConfirmDialog
        isOpen={Boolean(spaceToDelete)}
        title="Remove Study Goal?"
        message={
          spaceToDelete
            ? `Are you sure you want to remove the study goal "${spaceToDelete.title}"? This cannot be undone.`
            : ""
        }
        confirmText="Yes, Remove Goal"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDeleteSpace}
        onCancel={() => setSpaceToDelete(null)}
      />
    </div>
  );
};

export default DashboardPage;
