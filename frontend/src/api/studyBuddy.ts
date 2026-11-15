import { apiFetch } from "./client";
import type { EducationRecord, StudySpace, StudyPartner, QuestionnaireData, QuestionnaireSubmitResult, IncomingPartnerRequest, StudentNotification, WorkspaceData, WorkspaceTask, StudySpaceMessage, StudyBet, StudyRoom, StudyRoomSignal } from "../types/dashboard";

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

  async getStudySpace(id: string | number): Promise<StudySpace> {
    const data = await apiFetch<any>(`/study-spaces/${id}/`);
    return mapBackendSpaceToFrontend(data);
  },

  async getWorkspace(id: string | number): Promise<WorkspaceData> {
    const data = await apiFetch<any>(`/study-spaces/${id}/workspace/`);
    return {
      space: mapBackendSpaceToFrontend(data.space),
      participants: {
        self: mapBackendPartnerToFrontend(data.participants.self),
        partner: data.participants.partner ? mapBackendPartnerToFrontend(data.participants.partner) : null,
      },
      tasks: (data.tasks || []).map(mapWorkspaceTask),
      progress: data.progress,
      streaks: {
        self: mapSpaceStreak(data.streaks?.self),
        partner: mapSpaceStreak(data.streaks?.partner),
      },
      messages: (data.messages || []).map(mapSpaceMessage),
      bets: (data.bets || []).map(mapStudyBet),
      activeRoom: data.active_room ? mapStudyRoom(data.active_room) : null,
    };
  },

  async createWorkspaceTask(spaceId: string | number, payload: {
    title: string;
    description: string;
    deadline: string;
    is_daily: boolean;
    assignment_scope: "self" | "partner" | "both";
  }): Promise<WorkspaceTask> {
    const data = await apiFetch<{ task: any }>(`/study-spaces/${spaceId}/tasks/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapWorkspaceTask(data.task);
  },

  async completeWorkspaceTask(taskId: number, completionNote: string): Promise<WorkspaceTask> {
    const data = await apiFetch<{ task: any }>(`/study-tasks/${taskId}/completion/`, {
      method: "POST",
      body: JSON.stringify({ completion_note: completionNote }),
    });
    return mapWorkspaceTask(data.task);
  },

  async reopenWorkspaceTask(taskId: number): Promise<void> {
    await apiFetch<{ message: string }>(`/study-tasks/${taskId}/completion/`, { method: "DELETE" });
  },

  async getSpaceMessages(spaceId: string | number, afterId = 0): Promise<StudySpaceMessage[]> {
    const data = await apiFetch<{ messages: any[] }>(`/study-spaces/${spaceId}/messages/?after_id=${afterId}`);
    return (data.messages || []).map(mapSpaceMessage);
  },

  async sendSpaceMessage(spaceId: string | number, message: string): Promise<StudySpaceMessage> {
    const data = await apiFetch<{ message: any }>(`/study-spaces/${spaceId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    return mapSpaceMessage(data.message);
  },

  async createStudyBet(spaceId: string | number, payload: {
    description: string;
    reward: string;
    deadline?: string;
    task_id?: number;
  }): Promise<StudyBet> {
    const data = await apiFetch<{ bet: any }>(`/study-spaces/${spaceId}/bets/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapStudyBet(data.bet);
  },

  async actOnStudyBet(betId: number, action: "accept" | "resolve" | "cancel", winnerId?: number): Promise<StudyBet> {
    const data = await apiFetch<{ bet: any }>(`/study-bets/${betId}/${action}/`, {
      method: "POST",
      body: JSON.stringify(winnerId ? { winner_id: winnerId } : {}),
    });
    return mapStudyBet(data.bet);
  },

  async getActiveVideoRoom(spaceId: string | number): Promise<StudyRoom | null> {
    const data = await apiFetch<{ room: any | null }>(`/study-spaces/${spaceId}/video-room/`);
    return data.room ? mapStudyRoom(data.room) : null;
  },

  async startVideoRoom(spaceId: string | number): Promise<{ room: StudyRoom; created: boolean }> {
    const data = await apiFetch<{ room: any; created: boolean }>(`/study-spaces/${spaceId}/video-room/`, { method: "POST" });
    return { room: mapStudyRoom(data.room), created: data.created };
  },

  async getVideoSignals(roomId: number, afterId = 0): Promise<{ signals: StudyRoomSignal[]; roomStatus: string }> {
    const data = await apiFetch<{ signals: any[]; room_status: string }>(`/video-rooms/${roomId}/signals/?after_id=${afterId}`);
    return {
      signals: (data.signals || []).map((signal) => ({
        id: signal.id,
        kind: signal.kind,
        payload: signal.payload || {},
        senderId: signal.sender_id,
      })),
      roomStatus: data.room_status,
    };
  },

  async sendVideoSignal(roomId: number, kind: StudyRoomSignal["kind"], payload: Record<string, unknown> = {}): Promise<number> {
    const data = await apiFetch<{ id: number }>(`/video-rooms/${roomId}/signals/`, {
      method: "POST",
      body: JSON.stringify({ kind, payload }),
    });
    return data.id;
  },

  async createStudySpace(space: {
    title: string;
    subject: string;
    goal: string;
    schedule?: string;
    duration?: string;
    learningStyle?: string;
  }): Promise<StudySpace> {
    const payload = {
      title: space.title,
      subject: space.subject,
      goal: space.goal,
      schedule: space.schedule || "",
      duration: space.duration || "60 mins",
      learning_style: space.learningStyle || "",
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

  async getSpaceMatches(spaceId: string | number): Promise<{ requires_questionnaire: boolean; matches: StudyPartner[]; questionnaire_id?: number }> {
    const data = await apiFetch<any>(`/study-spaces/${spaceId}/matches/`);
    return {
      requires_questionnaire: Boolean(data.requires_questionnaire),
      matches: (data.matches || []).map(mapBackendPartnerToFrontend),
      questionnaire_id: data.questionnaire_id,
    };
  },

  // ==================== PARTNER REQUESTS ====================
  async getPartnerRequests(): Promise<{ incoming: IncomingPartnerRequest[]; outgoing: IncomingPartnerRequest[] }> {
    const data = await apiFetch<any>("/partner-requests/");
    return {
      incoming: data.incoming || [],
      outgoing: data.outgoing || [],
    };
  },

  async getNotifications(): Promise<StudentNotification[]> {
    const data = await apiFetch<{ notifications: StudentNotification[] }>("/notifications/");
    return data.notifications || [];
  },

  async markNotificationRead(notificationId: number): Promise<void> {
    await apiFetch<{ message: string }>(`/notifications/${notificationId}/read/`, { method: "POST" });
  },

  async sendPartnerRequest(payload: {
    receiver_id: string | number;
    study_space_id: string | number;
    compatibility_score?: number;
  }): Promise<IncomingPartnerRequest> {
    const data = await apiFetch<{ message: string; request: IncomingPartnerRequest }>("/partner-requests/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.request;
  },

  async acceptPartnerRequest(requestId: string | number): Promise<IncomingPartnerRequest> {
    const data = await apiFetch<{ message: string; request: IncomingPartnerRequest }>(
      `/partner-requests/${requestId}/accept/`,
      { method: "POST" }
    );
    return data.request;
  },

  async declinePartnerRequest(requestId: string | number): Promise<IncomingPartnerRequest> {
    const data = await apiFetch<{ message: string; request: IncomingPartnerRequest }>(
      `/partner-requests/${requestId}/decline/`,
      { method: "POST" }
    );
    return data.request;
  },

  async cancelPartnerRequest(requestId: string | number): Promise<IncomingPartnerRequest> {
    const data = await apiFetch<{ message: string; request: IncomingPartnerRequest }>(
      `/partner-requests/${requestId}/cancel/`,
      { method: "POST" }
    );
    return data.request;
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
    pendingRequest: b.pending_request
      ? {
          id: String(b.pending_request.id),
          receiver_id: String(b.pending_request.receiver_id),
          receiver_name: b.pending_request.receiver_name,
          compatibility_score: b.pending_request.compatibility_score || 0,
          created_at: b.pending_request.created_at,
        }
      : null,
    sessionsCompleted: b.sessions_completed || 0,
    upcomingSessions: b.upcoming_sessions || 0,
    progressPercent: b.progress_percent || 0,
    status: b.status || "partner_needed",
  };
}

function mapWorkspaceTask(task: any): WorkspaceData["tasks"][number] {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    deadline: task.deadline,
    isDaily: Boolean(task.is_daily),
    assignmentScope: task.assignment_scope,
    creatorName: task.creator_name,
    createdAt: task.created_at,
    isCompletedByMe: Boolean(task.is_completed_by_me),
    myCompletionNote: task.my_completion_note || "",
    completedBy: (task.completed_by || []).map((completion: any) => ({
      userId: completion.user_id,
      userName: completion.user_name,
      completionNote: completion.completion_note || "",
      completedAt: completion.completed_at,
    })),
  };
}

function mapSpaceMessage(message: any): StudySpaceMessage {
  return {
    id: message.id,
    senderId: message.sender_id,
    senderName: message.sender_name,
    message: message.message,
    createdAt: message.created_at,
  };
}

function mapStudyBet(bet: any): StudyBet {
  return {
    id: bet.id,
    description: bet.description,
    reward: bet.reward,
    deadline: bet.deadline,
    status: bet.status,
    taskId: bet.task ?? null,
    taskTitle: bet.task_title || "",
    creatorId: bet.creator_id,
    creatorName: bet.creator_name,
    acceptedById: bet.accepted_by_id ?? null,
    acceptedByName: bet.accepted_by_name ?? null,
    winnerId: bet.winner_id ?? null,
    winnerName: bet.winner_name ?? null,
    createdAt: bet.created_at,
  };
}

function mapStudyRoom(room: any): StudyRoom {
  return {
    id: room.id,
    status: room.status,
    initiatorId: room.initiator_id,
    initiatorName: room.initiator_name,
    createdAt: room.created_at,
    endedAt: room.ended_at,
  };
}

function mapSpaceStreak(streak: any) {
  return {
    current: streak?.current || 0,
    longest: streak?.longest || 0,
    lastCompletedDate: streak?.last_completed_date ?? null,
    badges: (streak?.badges || []).map((badge: any) => ({
      id: badge.id,
      name: badge.name,
      daysRequired: badge.days_required,
      unlocked: Boolean(badge.unlocked),
    })),
  };
}
