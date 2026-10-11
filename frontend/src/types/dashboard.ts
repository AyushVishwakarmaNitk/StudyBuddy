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

export type EducationLevel = "class_10" | "class_12" | "ug" | "pg";

export interface EducationRecord {
  id: string;
  level: EducationLevel;
  institutionName: string; // School name for 10/12, College/University for UG/PG
  board?: string; // Class 10 & 12
  stream?: string; // Class 12
  degree?: string; // UG & PG
  specialization?: string; // Branch / Specialization for UG & PG
  passingYear?: number; // Class 10 & 12
  startYear?: number; // UG & PG
  completionYear?: number; // UG & PG (Completion or Expected Completion)
  isCurrentlyStudying?: boolean; // UG & PG
  gradingType?: "percentage" | "cgpa"; // UG & PG
  percentage?: number; // Class 10, 12, or UG/PG when percentage selected
  cgpa?: number; // UG/PG when CGPA selected
  cgpaScale?: number; // Default 10
}

export interface UserRating {
  average: number; // e.g. 4.8
  count: number; // e.g. 14
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  branch: string;
  year: number;
  rating?: UserRating | null;
  education?: EducationRecord[];
  studyPreferences: {
    subjects: string[];
    availability: string;
    sessionDuration: string;
    collaborationStyle: string;
  };
}
