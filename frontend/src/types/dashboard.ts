export interface StudyPartner {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  branch: string;
  year: number;
  compatibility: number;
  bio: string;
  matchReasons?: string[];
  subjects?: string[];
  availability?: string;
  collaborationStyle?: string;
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

export interface QuestionnaireData {
  study_space_id?: string | number | null;
  // Section 1: Academic Interests & Subject Selection
  subjects: string[];
  custom_subject?: string;
  topics: string[];
  custom_topics?: string;
  // Section 2: Subject Understanding & Knowledge Level
  understanding_level: string;
  problem_solving_comfort: string;
  preferred_partner_level: string;
  // Section 3: Study Routine & Availability
  daily_study_hours: string;
  preferred_study_time: string;
  available_days: string[];
  schedule_flexibility: string;
  // Section 4: Study Duration & Focus
  session_duration: string;
  session_structure: string;
  // Section 5: Learning & Collaboration Preferences
  learning_modes: string[];
  collaboration_type: string;
  partner_quality: string;
  // Section 6: Communication & Academic Goals
  communication_channels: string[];
  primary_goal: string;
  study_frequency: string;
  expected_duration: string;
  // Section 7: Consistency & Accountability
  consistency_rating: string;
  postpone_frequency: string;
  tracking_preference: string;
  accountability_importance: string;
  // Survey feedback question
  feedback_question?: string;
}

export interface QuestionnaireSubmitResult {
  message: string;
  questionnaire_id: number;
  top_matches: StudyPartner[];
}
