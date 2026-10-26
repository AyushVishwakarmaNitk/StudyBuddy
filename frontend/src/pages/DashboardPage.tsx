import React, { useState, useEffect } from "react";
import type {
  StudySpace,
  UserProfile,
  StudyPartner,
  EducationRecord,
} from "../types/dashboard";
import type { AuthUser } from "../api/auth";
import BrandLogo from "../components/common/BrandLogo";
import Avatar from "../components/common/Avatar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import StatCard from "../components/dashboard/StatCard";
import StudySpaceCard from "../components/dashboard/StudySpaceCard";
import AddGoalModal from "../components/dashboard/AddGoalModal";
import EducationFormModal from "../components/dashboard/EducationFormModal";
import FindPartnerModal from "../components/dashboard/FindPartnerModal";
import StudySpaceDetailModal from "../components/dashboard/StudySpaceDetailModal";
import ProfileModal from "../components/dashboard/ProfileModal";
import styles from "./DashboardPage.module.css";

interface DashboardPageProps {
  onLogout: () => void;
  user?: AuthUser | null;
}

const initialUserProfile: UserProfile = {
  name: "Ayush Vishwakarma",
  username: "ayush_v",
  email: "ayush@example.com",
  avatarUrl: null,
  bio: "3rd Year CSE student passionate about Web Dev, Algorithms & Machine Learning.",
  branch: "Computer Science & Engineering",
  year: 3,
  rating: {
    average: 4.8,
    count: 14,
  },
  education: [
    {
      id: "edu-1",
      level: "class_10",
      institutionName: "Delhi Public School",
      board: "CBSE",
      passingYear: 2020,
      percentage: 94.2,
    },
    {
      id: "edu-2",
      level: "class_12",
      institutionName: "Delhi Public School",
      board: "CBSE",
      passingYear: 2022,
      stream: "Science (PCM)",
      percentage: 92.6,
    },
    {
      id: "edu-3",
      level: "ug",
      institutionName: "National Institute of Technology Karnataka (NITK)",
      degree: "B.Tech",
      specialization: "Computer Science & Engineering",
      startYear: 2022,
      completionYear: 2026,
      isCurrentlyStudying: true,
      gradingType: "cgpa",
      cgpa: 8.85,
      cgpaScale: 10,
    },
  ],
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

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout, user }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
      return {
        ...initialUserProfile,
        name: fullName,
        username: user.username,
        email: user.email || `${user.username}@example.com`,
        bio: user.profile?.bio || initialUserProfile.bio,
        branch: user.profile?.branch || initialUserProfile.branch,
        year: user.profile?.year || initialUserProfile.year,
        avatarUrl: user.profile?.avatar_url || null,
      };
    }
    return initialUserProfile;
  });

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
      }));
    }
  }, [user]);

  const [spaces, setSpaces] = useState<StudySpace[]>(initialStudySpaces);
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
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
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

  const handleSaveEduRecord = (newOrUpdated: EducationRecord) => {
    const currentList = profile.education || [];
    let updatedList: EducationRecord[];

    if (editingEduRecord) {
      updatedList = currentList.map((rec) =>
        rec.id === editingEduRecord.id ? newOrUpdated : rec
      );
    } else {
      updatedList = [...currentList, newOrUpdated];
    }

    setProfile({ ...profile, education: updatedList });
    setIsEduModalOpen(false);
    setEditingEduRecord(null);
  };

  const handlePromptDeleteEdu = (record: EducationRecord) => {
    setRecordToDelete(record);
  };

  const handleConfirmDeleteEdu = () => {
    if (!recordToDelete) return;
    const currentList = profile.education || [];
    const updatedList = currentList.filter((rec) => rec.id !== recordToDelete.id);
    setProfile({ ...profile, education: updatedList });
    setRecordToDelete(null);
  };

  // Study Space Handlers
  const handleCreateGoal = (goalData: {
    title: string;
    subject: string;
    goal: string;
    schedule: string;
    duration: string;
    learningStyle: string;
  }) => {
    const newSpace: StudySpace = {
      id: `space-${Date.now()}`,
      title: goalData.title,
      subject: goalData.subject || goalData.title,
      goal: goalData.goal,
      schedule: goalData.schedule,
      duration: goalData.duration,
      learningStyle: goalData.learningStyle,
      partner: undefined,
      sessionsCompleted: 0,
      upcomingSessions: 0,
      progressPercent: 0,
      status: "partner_needed",
    };

    setSpaces((prev) => [newSpace, ...prev]);
    setIsAddGoalModalOpen(false);
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
          <BrandLogo size="md" />

          <div className={styles.navRight}>
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
            {spaces.map((space) => (
              <StudySpaceCard
                key={space.id}
                space={space}
                onOpen={(s) => setSelectedSpaceDetail(s)}
                onFindPartner={(s) => setActiveSpaceForPartner(s)}
              />
            ))}
          </div>

          <p className={styles.disclaimerNote}>
            Conceptual UI with fictional names and example progress. Real information will come from the student's account and backend.
          </p>
        </section>
      </main>

      {/* 3. MODALS (Extracted into clean DRY components) */}
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
        partners={mockAvailablePartners}
        onClose={() => setActiveSpaceForPartner(null)}
        onConnect={handleAssignPartner}
      />

      <StudySpaceDetailModal
        isOpen={Boolean(selectedSpaceDetail)}
        space={selectedSpaceDetail}
        onClose={() => setSelectedSpaceDetail(null)}
        onCompleteSession={handleCompleteSession}
      />

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
    </div>
  );
};

export default DashboardPage;
