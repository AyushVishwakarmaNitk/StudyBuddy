export interface StudyPartner {
  id: string;
  name: string;
  avatar?: string;
  branch: string;
  year: number;
  compatibility: number;
  bio: string;
}

export interface StudySpace {
  id: string;
  title: string;
  goal: string;
  subject: string;
  schedule: string;
  duration: string;
  learningStyle: string;
  partner?: StudyPartner;
  sessionsCompleted: number;
  upcomingSessions: number;
  progressPercent: number; // 0-100
  status: "active" | "partner_needed";
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  branch: string;
  year: number;
  studyPreferences: {
    subjects: string[];
    availability: string;
    sessionDuration: string;
    collaborationStyle: string;
  };
}

