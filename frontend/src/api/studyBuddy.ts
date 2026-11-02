import { apiFetch } from "./client";
import type { EducationRecord, StudySpace, StudyPartner, QuestionnaireData, QuestionnaireSubmitResult } from "../types/dashboard";

export const studyBuddyApi = {
  // ==================== EDUCATION RECORDS ====================
  async getEducation(): Promise<EducationRecord[]> {
    const data = await apiFetch<{ education: any[] }>("/education/");
    return data.education.map(mapBackendEduToFrontend);
  },

  async createEducation(record: Partial<EducationRecord>): Promise<EducationRecord> {
    const payload = mapFrontendEduToBackend(record);
    const data = await apiFetch<{ message: string; record: unknown }>("/education/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapBackendEduToFrontend(data.record);
  },

  async updateEducation(id: string | number, record: Partial<EducationRecord>): Promise<EducationRecord> {
    const payload = mapFrontendEduToBackend(record);
    const data = await apiFetch<{ message: string; record: any }>(`/education/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return mapBackendEduToFrontend(data.record);
  },

  async deleteEducation(id: string | number): Promise<void> {
    await apiFetch<{ message: string }>(`/education/${id}/`, {
      method: "DELETE",
    });
  },

  // ==================== STUDY SPACES ====================
  async getStudySpaces(): Promise<StudySpace[]> {
    const data = await apiFetch<{ spaces: any[] }>("/study-spaces/");
    return data.spaces.map(mapBackendSpaceToFrontend);
  },

  async createStudySpace(space: {
    title: string;
    subject: string;
    goal: string;
    schedule: string;
    duration: string;
    learningStyle: string;
  }): Promise<StudySpace> {
    const payload = {
      title: space.title,
      subject: space.subject,
      goal: space.goal,
      schedule: space.schedule,
      duration: space.duration,
      learning_style: space.learningStyle,
    };
    const data = await apiFetch<{ message: string; space: any }>("/study-spaces/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapBackendSpaceToFrontend(data.space);
  },

  async updateStudySpace(
    id: string | number,
    updates: Partial<{
      partner_id?: number | string | null;
      sessions_completed?: number;
      upcoming_sessions?: number;
      progress_percent?: number;
      status?: "active" | "partner_needed";
    }>
  ): Promise<StudySpace> {
    const data = await apiFetch<{ message: string; space: any }>(`/study-spaces/${id}/`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return mapBackendSpaceToFrontend(data.space);
  },

  async deleteStudySpace(id: string | number): Promise<void> {
    await apiFetch<{ message: string }>(`/study-spaces/${id}/`, {
      method: "DELETE",
    });
  },

  // ==================== PARTNERS & QUESTIONNAIRE ====================
  async getAvailablePartners(): Promise<StudyPartner[]> {
    const data = await apiFetch<{ partners: any[] }>("/partners/");
    return data.partners.map(mapBackendPartnerToFrontend);
  },

  async submitQuestionnaire(payload: QuestionnaireData): Promise<QuestionnaireSubmitResult> {
    const data = await apiFetch<any>("/questionnaire/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      message: data.message,
      questionnaire_id: data.questionnaire_id,
      top_matches: (data.top_matches || []).map(mapBackendPartnerToFrontend),
    };
  },

  async getLatestQuestionnaire(spaceId?: string | number): Promise<QuestionnaireData | null> {
    const url = spaceId ? `/questionnaire/?space_id=${spaceId}` : "/questionnaire/";
    const data = await apiFetch<{ questionnaire: any | null }>(url);
    return data.questionnaire;
  },

  async getSpaceMatches(spaceId: string | number): Promise<{ requires_questionnaire: boolean; matches: StudyPartner[] }> {
    const data = await apiFetch<any>(`/study-spaces/${spaceId}/matches/`);
    return {
      requires_questionnaire: Boolean(data.requires_questionnaire),
      matches: (data.matches || []).map(mapBackendPartnerToFrontend),
    };
  },
};

// ==================== HELPERS ====================

function mapBackendEduToFrontend(b: any): EducationRecord {
  return {
    id: String(b.id),
    level: b.level,
    institutionName: b.institution_name,
    board: b.board || undefined,
    stream: b.stream || undefined,
    degree: b.degree || undefined,
    specialization: b.specialization || undefined,
    passingYear: b.passing_year ?? undefined,
    startYear: b.start_year ?? undefined,
    completionYear: b.completion_year ?? undefined,
    isCurrentlyStudying: Boolean(b.is_currently_studying),
    gradingType: b.grading_type,
    percentage: b.percentage ?? undefined,
    cgpa: b.cgpa ?? undefined,
    cgpaScale: b.cgpa_scale ?? 10,
  };
}

function mapFrontendEduToBackend(f: Partial<EducationRecord>): any {
  return {
    level: f.level,
    institution_name: f.institutionName,
    board: f.board || "",
    stream: f.stream || "",
    degree: f.degree || "",
    specialization: f.specialization || "",
    passing_year: f.passingYear || null,
    start_year: f.startYear || null,
    completion_year: f.completionYear || null,
    is_currently_studying: f.isCurrentlyStudying || false,
    grading_type: f.gradingType || "cgpa",
    percentage: f.percentage !== undefined && f.percentage !== null && !isNaN(Number(f.percentage)) ? Number(f.percentage) : null,
    cgpa: f.cgpa !== undefined && f.cgpa !== null && !isNaN(Number(f.cgpa)) ? Number(f.cgpa) : null,
    cgpa_scale: f.cgpaScale ? Number(f.cgpaScale) : 10.0,
  };
}

function mapBackendPartnerToFrontend(p: any): StudyPartner {
  return {
    id: String(p.id),
    name: p.name || p.username,
    username: p.username,
    avatar: p.avatar || undefined,
    branch: p.branch || "General Studies",
    year: p.year || 1,
    compatibility: p.compatibility || 90,
    bio: p.bio || "Dedicated learner looking to collaborate.",
    matchReasons: p.match_reasons || [],
    subjects: p.subjects || [],
    availability: p.availability,
    collaborationStyle: p.collaboration_style,
  };
}

function mapBackendSpaceToFrontend(b: any): StudySpace {
  return {
    id: String(b.id),
    title: b.title,
    subject: b.subject,
    goal: b.goal,
    schedule: b.schedule,
    duration: b.duration,
    learningStyle: b.learning_style,
    partner: b.partner ? mapBackendPartnerToFrontend(b.partner) : undefined,
    sessionsCompleted: b.sessions_completed || 0,
    upcomingSessions: b.upcoming_sessions || 0,
    progressPercent: b.progress_percent || 0,
    status: b.status || "partner_needed",
  };
}
