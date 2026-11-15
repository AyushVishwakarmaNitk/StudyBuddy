import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Flame,
  HandCoins,
  MessageCircle,
  Plus,
  Target,
  Video,
} from "../components/common/StudySpaceIcon";
import type { AuthUser } from "../api/auth";
import { studyBuddyApi } from "../api/studyBuddy";
import type {
  IncomingPartnerRequest,
  StudentNotification,
  StudyBet,
  StudySpaceMessage,
  WorkspaceData,
  WorkspaceTask,
} from "../types/dashboard";
import { useToast } from "../context/ToastContext";
import NotificationBell from "../components/dashboard/NotificationBell";
import StudyVideoRoomModal from "../components/dashboard/StudyVideoRoomModal";
import PencilLoader from "../components/common/PencilLoader";
import styles from "./StudySpacePage.module.css";

interface StudySpacePageProps {
  spaceId: string;
  user: AuthUser;
  onBack: () => void;
}

type Tab = "tasks" | "chat" | "video" | "bets";
type TaskScope = "self" | "partner" | "both";

const todayString = () => new Date().toISOString().slice(0, 10);

const StudySpacePage = ({ spaceId, user, onBack }: StudySpacePageProps) => {
  const toast = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [messages, setMessages] = useState<StudySpaceMessage[]>([]);
  const [requests, setRequests] = useState<IncomingPartnerRequest[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(todayString);
  const [taskScope, setTaskScope] = useState<TaskScope>("both");
  const [taskIsDaily, setTaskIsDaily] = useState(true);
  const [taskSaving, setTaskSaving] = useState(false);
  const [completionDrafts, setCompletionDrafts] = useState<Record<number, string>>({});
  const [completionBusyId, setCompletionBusyId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [showBetForm, setShowBetForm] = useState(false);
  const [betDescription, setBetDescription] = useState("");
  const [betReward, setBetReward] = useState("Chocolate 🍫");
  const [betDeadline, setBetDeadline] = useState("");
  const [betTaskId, setBetTaskId] = useState("");
  const [betBusyId, setBetBusyId] = useState<number | null>(null);
  const [isVideoRoomOpen, setIsVideoRoomOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);

  const refreshWorkspace = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await studyBuddyApi.getWorkspace(spaceId);
      setWorkspace(data);
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        data.messages.forEach((message) => merged.set(message.id, message));
        const next = [...merged.values()].sort((a, b) => a.id - b.id);
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...next.map((message) => message.id), 0);
        return next;
      });
      setPageError("");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not load this study space.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [spaceId]);

  const refreshInbox = useCallback(async () => {
    const [requestData, notificationsData] = await Promise.all([
      studyBuddyApi.getPartnerRequests().catch(() => ({ incoming: [], outgoing: [] })),
      studyBuddyApi.getNotifications().catch(() => []),
    ]);
    setRequests(requestData.incoming);
    setNotifications(notificationsData);
  }, []);

  useEffect(() => {
    void refreshWorkspace(true);
    void refreshInbox();
  }, [refreshInbox, refreshWorkspace]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshWorkspace();
        void refreshInbox();
      }
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [refreshInbox, refreshWorkspace]);

  useEffect(() => {
    if (tab !== "chat") return;
    const poll = async () => {
      try {
        const newer = await studyBuddyApi.getSpaceMessages(spaceId, lastMessageIdRef.current);
        if (!newer.length) return;
        setMessages((current) => {
          const seen = new Set(current.map((message) => message.id));
          const next = [...current, ...newer.filter((message) => !seen.has(message.id))];
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...next.map((message) => message.id));
          return next;
        });
      } catch {
        // A transient poll failure is recovered by the next interval.
      }
    };
    void poll();
    const interval = window.setInterval(poll, 2500);
    return () => window.clearInterval(interval);
  }, [spaceId, tab]);

  useEffect(() => {
    if (tab === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  const partner = workspace?.participants.partner;
  const isOverdue = (task: WorkspaceTask) => !task.isCompletedByMe && task.deadline < todayString();
  const getScopeLabel = (task: WorkspaceTask) =>
    task.assignmentScope === "both"
      ? "Shared by both"
      : task.assignmentScope === "self"
      ? `For ${user.first_name || user.username}`
      : `For ${partner?.name || "Partner"}`;

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    try {
      await studyBuddyApi.createWorkspaceTask(spaceId, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        deadline: taskDeadline,
        is_daily: taskIsDaily,
        assignment_scope: taskScope,
      });
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline(todayString());
      setTaskScope("both");
      setTaskIsDaily(true);
      setShowTaskForm(false);
      await refreshWorkspace();
      await refreshInbox();
      toast.success("Your study task was added to the shared space.", "Task Added 🎯");
    } catch (error) {
      toast.error(error, "Could Not Add Task");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleCompleteTask = async (task: WorkspaceTask) => {
    if (task.assignmentScope === "partner") {
      toast.info("This personal task is assigned to your partner.", "Partner Task");
      return;
    }
    setCompletionBusyId(task.id);
    try {
      await studyBuddyApi.completeWorkspaceTask(task.id, completionDrafts[task.id] ?? "");
      setCompletionDrafts((current) => ({ ...current, [task.id]: "" }));
      await refreshWorkspace();
      await refreshInbox();
      toast.success("Goal completed! Your partner has been notified.", "Nice Work! 🎉");
    } catch (error) {
      toast.error(error, "Could Not Save Completion");
    } finally {
      setCompletionBusyId(null);
    }
  };

  const handleReopenTask = async (task: WorkspaceTask) => {
    setCompletionBusyId(task.id);
    try {
      await studyBuddyApi.reopenWorkspaceTask(task.id);
      await refreshWorkspace();
      await refreshInbox();
      toast.info("Task marked as not done.", "Task Reopened");
    } catch (error) {
      toast.error(error, "Could Not Reopen Task");
    } finally {
      setCompletionBusyId(null);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatSending(true);
    try {
      const message = await studyBuddyApi.sendSpaceMessage(spaceId, text);
      setMessages((current) => [...current, message]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
      setChatInput("");
    } catch (error) {
      toast.error(error, "Message Could Not Be Sent");
    } finally {
      setChatSending(false);
    }
  };

  const handleCreateBet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!betDescription.trim() || !betReward.trim()) return;
    try {
      await studyBuddyApi.createStudyBet(spaceId, {
        description: betDescription.trim(),
        reward: betReward.trim(),
        deadline: betDeadline || undefined,
        task_id: betTaskId ? Number(betTaskId) : undefined,
      });
      setBetDescription("");
      setBetReward("Chocolate 🍫");
      setBetDeadline("");
      setBetTaskId("");
      setShowBetForm(false);
      await refreshWorkspace();
      await refreshInbox();
      toast.success("Your friendly bet was proposed to your partner!", "Bet Proposed 🍫");
    } catch (error) {
      toast.error(error, "Could Not Create Bet");
    }
  };

  const handleBetAction = async (bet: StudyBet, action: "accept" | "resolve" | "cancel", winnerId?: number) => {
    setBetBusyId(bet.id);
    try {
      await studyBuddyApi.actOnStudyBet(bet.id, action, winnerId);
      await refreshWorkspace();
      await refreshInbox();
      toast.success(
        action === "resolve" ? "Friendly bet settled!" : action === "accept" ? "Bet accepted!" : "Bet cancelled.",
        "Updated"
      );
    } catch (error) {
      toast.error(error, "Could Not Update Bet");
    } finally {
      setBetBusyId(null);
    }
  };

  const onInboxAction = useCallback(() => {
    void refreshInbox();
    void refreshWorkspace();
  }, [refreshInbox, refreshWorkspace]);

  if (isLoading) {
    return (
      <div className={styles.pageWrapper} style={{ alignItems: "center", justifyContent: "center" }}>
        <PencilLoader size={90} message="Loading your shared study space…" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className={styles.pageWrapper} style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, background: "#fff", padding: 36, borderRadius: 24, textAlign: "center", border: "1.5px solid #ece7e3" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px 0" }}>Study Space Unavailable</h2>
          <p style={{ color: "#5f6c7b", fontSize: 13, margin: "0 0 20px 0" }}>
            {pageError || "This study space could not be found or you do not have permission to join."}
          </p>
          <button type="button" onClick={onBack} className={styles.primaryActionBtn}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { space, streaks, tasks, bets } = workspace;
  const tabItems: { id: Tab; label: string; icon: typeof Target }[] = [
    { id: "tasks", label: "Daily Goals & To-Do", icon: CheckCircle2 },
    { id: "chat", label: "Partner Chat", icon: MessageCircle },
    { id: "video", label: "Study Together (Video)", icon: Video },
    { id: "bets", label: "Friendly Bets 🍫", icon: HandCoins },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* 1. TOP STICKY NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <button type="button" onClick={onBack} className={styles.backBtn} title="Back to dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className={styles.spaceIconBadge}>
              <BookOpen className="h-5 w-5" />
            </div>
            <div className={styles.navTitles}>
              <p className={styles.navSubtitle}>Shared Study Space</p>
              <h1 className={styles.navTitle} title={space.title}>
                {space.title}
              </h1>
            </div>
          </div>
          <div className={styles.navRight}>
            <span className={styles.subjectBadge}>{space.subject}</span>
            <NotificationBell requests={requests} notifications={notifications} onRequestActioned={onInboxAction} />
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className={styles.mainContainer}>
        {/* HERO BANNER */}
        <section className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <div className={styles.heroTags}>
                <span className={styles.heroPill}>{space.subject}</span>
                <span className={styles.partnerPill}>
                  <span className={styles.onlineDot} />
                  Studying with {partner?.name ?? "your study partner"}
                </span>
              </div>
              <h2 className={styles.heroTitle}>{space.title}</h2>
              <p className={styles.heroGoal}>{space.goal}</p>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.statTile}>
                <p className={styles.statTileLabel}>Goals Active</p>
                <p className={styles.statTileVal}>{tasks.length}</p>
              </div>
              <div className={styles.statTile}>
                <p className={styles.statTileLabel}>Mutual Progress</p>
                <p className={`${styles.statTileVal} ${styles.statTileValPrimary}`}>
                  {Math.round((workspace.progress.self.percent + workspace.progress.partner.percent) / 2)}%
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DUAL PROGRESS & STREAK CARDS */}
        <section className={styles.participantsGrid}>
          {[
            { profile: workspace.participants.self, progress: workspace.progress.self, streak: streaks.self, isSelf: true },
            { profile: workspace.participants.partner, progress: workspace.progress.partner, streak: streaks.partner, isSelf: false },
          ].map((item) =>
            item.profile ? (
              <div key={item.profile.id} className={styles.participantCard}>
                <div className={styles.participantHeader}>
                  <div className={styles.participantInfo}>
                    <img
                      src={
                        item.profile.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.profile.name)}&background=ff4b2b&color=fff`
                      }
                      alt=""
                      className={styles.participantAvatar}
                    />
                    <div>
                      <p className={styles.participantName}>
                        {item.profile.name} {item.isSelf ? "· You" : ""}
                      </p>
                      <p className={styles.participantSub}>
                        {item.progress.completed} of {item.progress.total} goals completed
                      </p>
                    </div>
                  </div>
                  <div className={styles.streakBadgePill}>
                    <Flame className="h-4 w-4" />
                    <span>{item.streak.current} day streak</span>
                  </div>
                </div>

                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBarFill} style={{ width: `${item.progress.percent}%` }} />
                </div>
                <div className={styles.progressNumbers}>
                  <span>Progress towards completion</span>
                  <span className={styles.progressPercentText}>{item.progress.percent}%</span>
                </div>

                <div className={styles.badgesRow}>
                  {item.streak.badges.map((badge) => (
                    <span
                      key={badge.id}
                      className={`${styles.badgeTag} ${badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                      title={badge.unlocked ? `Unlocked! ${badge.daysRequired}-day streak accomplished` : `Locked (${badge.daysRequired} consecutive days needed)`}
                    >
                      {badge.unlocked ? "🏅" : "🔒"} {badge.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </section>

        {/* TAB NAVIGATION */}
        <nav className={styles.tabNav} aria-label="Study Space Tabs">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {pageError && (
          <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: 14, fontSize: 13, marginBottom: 16 }}>
            {pageError}
          </div>
        )}

        {/* TAB 1: DAILY GOALS & TO-DO LIST */}
        {tab === "tasks" && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionSubtitle}>Accountability & Action</p>
                <h3 className={styles.sectionTitle}>Shared Daily Goals & To-Do</h3>
                <p className={styles.sectionDesc}>
                  Add personal or mutual study targets. Marking goals done allows you to submit notes and proofs, notifying your partner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskForm((v) => !v)}
                className={styles.primaryActionBtn}
              >
                <Plus className="h-4 w-4" />
                {showTaskForm ? "Close Form" : "+ Add a Goal"}
              </button>
            </div>

            {/* ADD GOAL FORM */}
            {showTaskForm && (
              <form onSubmit={handleCreateTask} className={styles.formBox}>
                <div className={`${styles.inputLabel} ${styles.colSpanFull}`}>
                  <span>Goal Title *</span>
                  <input
                    required
                    maxLength={200}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Solve 5 Dynamic Programming problems on LeetCode"
                    className={styles.formInput}
                  />
                </div>

                <div className={`${styles.inputLabel} ${styles.colSpanFull}`}>
                  <span>Description / Acceptance Criteria</span>
                  <textarea
                    maxLength={3000}
                    rows={2}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe specific chapters, problem numbers, or what counts as finished…"
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.inputLabel}>
                  <span>Target Deadline *</span>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.inputLabel}>
                  <span>Who is this goal for?</span>
                  <select
                    value={taskScope}
                    onChange={(e) => setTaskScope(e.target.value as TaskScope)}
                    className={styles.formSelect}
                  >
                    <option value="both">Both Partners (Mutual Goal)</option>
                    <option value="self">Just Me (Personal Goal)</option>
                    <option value="partner">{partner?.name ?? "Partner"} (Assigned to Partner)</option>
                  </select>
                </div>

                <div className={`${styles.colSpanFull}`}>
                  <label className={styles.formCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={taskIsDaily}
                      onChange={(e) => setTaskIsDaily(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#ff4b2b" }}
                    />
                    <span>Count this as a daily streak goal (for weekly & monthly consistency badges) 🔥</span>
                  </label>
                </div>

                <div className={`${styles.formActions} ${styles.colSpanFull}`}>
                  <button type="button" onClick={() => setShowTaskForm(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={taskSaving} className={styles.submitBtn}>
                    {taskSaving ? "Adding Goal…" : "Add Goal to Study Space"}
                  </button>
                </div>
              </form>
            )}

            {/* TASKS LIST */}
            <div className={styles.tasksList}>
              {tasks.length === 0 ? (
                <div className={styles.emptyStateBox}>
                  <Target className="h-10 w-10 text-orange-400" style={{ margin: "0 auto" }} />
                  <h4 className={styles.emptyStateTitle}>No Study Goals Added Yet</h4>
                  <p className={styles.emptyStateSub}>
                    Create your first daily goal together to start building your streak and unlocking badges!
                  </p>
                </div>
              ) : (
                tasks.map((task) => {
                  const overdue = isOverdue(task);
                  const myCompletion = task.completedBy.find((item) => item.userId === user.id);

                  return (
                    <article
                      key={task.id}
                      className={`${styles.taskCard} ${overdue ? styles.taskCardOverdue : ""}`}
                    >
                      <div className={styles.taskTopRow}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.taskTags}>
                            <span className={styles.scopeTag}>{getScopeLabel(task)}</span>
                            {task.isDaily && (
                              <span className={styles.dailyStreakTag}>
                                <Flame className="h-3 w-3" /> Daily Streak Goal
                              </span>
                            )}
                            <span className={`${styles.deadlineTag} ${overdue ? styles.deadlineOverdue : ""}`}>
                              <CalendarDays className="h-3.5 w-3.5" /> Due {task.deadline}
                              {overdue ? " · Overdue ⚠️" : ""}
                            </span>
                          </div>
                          <h4 className={styles.taskTitle}>{task.title}</h4>
                          {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                        </div>

                        <div>
                          {task.isCompletedByMe ? (
                            <button
                              type="button"
                              disabled={completionBusyId === task.id}
                              onClick={() => void handleReopenTask(task)}
                              className={styles.reopenBtn}
                              title="Mark as not completed"
                            >
                              <Check className="h-4 w-4" /> Completed · Undo
                            </button>
                          ) : (
                            <span className={styles.notDoneBadge}>Not completed</span>
                          )}
                        </div>
                      </div>

                      {/* COMPLETION SUBMIT BOX OR NOTE DISPLAY */}
                      {task.isCompletedByMe ? (
                        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: "10px 14px", marginTop: 12 }}>
                          <p style={{ margin: 0, fontWeight: 800, color: "#047857", fontSize: 12 }}>
                            ✓ Your Completion Note
                          </p>
                          <p style={{ margin: "4px 0 0 0", color: "#1e242b", fontSize: 12.5, whiteSpace: "pre-wrap" }}>
                            {myCompletion?.completionNote || "Marked complete without an extra note."}
                          </p>
                        </div>
                      ) : (
                        <div className={styles.completeFormRow}>
                          <textarea
                            rows={2}
                            value={completionDrafts[task.id] ?? ""}
                            onChange={(e) =>
                              setCompletionDrafts((cur) => ({ ...cur, [task.id]: e.target.value }))
                            }
                            placeholder="What did you finish? Add details/proof for your partner before marking done…"
                            className={styles.noteInput}
                          />
                          <button
                            type="button"
                            disabled={completionBusyId === task.id}
                            onClick={() => void handleCompleteTask(task)}
                            className={styles.markDoneBtn}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {completionBusyId === task.id ? "Saving…" : "Mark Done ✓"}
                          </button>
                        </div>
                      )}

                      {/* ALL COMPLETIONS LOG */}
                      {task.completedBy.length > 0 && (
                        <div className={styles.completionsList}>
                          {task.completedBy.map((completion) => (
                            <div key={completion.userId} className={styles.completionItem}>
                              <p className={styles.completionWho}>
                                ✓ {completion.userId === user.id ? "You" : completion.userName} finished this goal
                              </p>
                              <p className={styles.completionText}>
                                {completion.completionNote || "Completed without an extra note."}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* TAB 2: PARTNER CHAT */}
        {tab === "chat" && (
          <section className={`${styles.sectionCard} ${styles.chatContainer}`}>
            <div className={styles.chatHeader}>
              <div>
                <h3 className={styles.chatHeaderTitle}>Study Partner Chat</h3>
                <p className={styles.chatHeaderSub}>Live persistent discussion for queries, explanations, and resources.</p>
              </div>
              <span style={{ background: "#ecfdf5", color: "#047857", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 12 }}>
                ✓ Synced
              </span>
            </div>

            <div className={styles.chatMessagesArea}>
              {messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", color: "#94a3b8" }}>
                  <MessageCircle className="h-10 w-10 text-orange-400" style={{ margin: "0 auto" }} />
                  <p style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>No messages yet</p>
                  <p style={{ fontSize: 12, margin: 0 }}>Say hello to your partner and plan today's study session!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={isMine ? styles.messageBubbleRowMine : styles.messageBubbleRowOther}
                    >
                      <div className={isMine ? styles.messageBubbleMine : styles.messageBubbleOther}>
                        <div
                          className={`${styles.messageSender} ${
                            isMine ? styles.messageSenderMine : styles.messageSenderOther
                          }`}
                        >
                          {isMine ? "You" : msg.senderName}
                        </div>
                        <p className={styles.messageText}>{msg.message}</p>
                        <time className={styles.messageTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </time>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className={styles.chatInputForm}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={4000}
                placeholder={`Type a message to ${partner?.name ?? "your study partner"}…`}
                className={styles.chatInputField}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatSending}
                className={styles.chatSendBtn}
              >
                {chatSending ? "Sending…" : "Send"}
              </button>
            </form>
          </section>
        )}

        {/* TAB 3: VIDEO MEET */}
        {tab === "video" && (
          <section className={styles.sectionCard}>
            <div className={styles.videoMeetSection}>
              <div>
                <span className={styles.videoMeetBadge}>
                  <Video className="h-3.5 w-3.5" /> Live Study Room
                </span>
                <h3 className={styles.sectionTitle}>Focus Side-by-Side on Video</h3>
                <p className={styles.sectionDesc} style={{ maxWidth: 540, marginTop: 8, lineHeight: 1.6 }}>
                  Start a private video study call with your partner just like Google Meet. Turn on your cameras, review queries, share accountability, and study uninterrupted together.
                </p>
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsVideoRoomOpen(true)}
                    className={styles.primaryActionBtn}
                    style={{ padding: "14px 28px", fontSize: 14 }}
                  >
                    <Video className="h-5 w-5" />
                    {workspace.activeRoom ? "Join Active Video Call" : "Start Live Video Call 🚀"}
                  </button>
                  {workspace.activeRoom && (
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#047857" }}>
                      ● An active video room was initiated by {workspace.activeRoom.initiatorName}.
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.videoPreviewCard}>
                <Video className="h-12 w-12 text-orange-400" />
                <h4 style={{ fontSize: 16, fontWeight: 800, margin: "12px 0 4px 0" }}>Interactive Study Room</h4>
                <p style={{ fontSize: 11.5, color: "#cbd5e1", margin: 0 }}>
                  HD Camera & Microphone · WebRTC direct peer connection
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: FRIENDLY BETS */}
        {tab === "bets" && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <p className={styles.sectionSubtitle} style={{ color: "#d97706" }}>
                  Gamified Motivation
                </p>
                <h3 className={styles.sectionTitle}>Friendly Study Bets 🍫</h3>
                <p className={styles.sectionDesc}>
                  Put a fun stake on finishing a goal—like treating your partner to chocolate, coffee, or bragging rights!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBetForm((v) => !v)}
                className={styles.primaryActionBtn}
                style={{ background: "#d97706" }}
              >
                <Plus className="h-4 w-4" />
                {showBetForm ? "Close Form" : "Propose a Bet"}
              </button>
            </div>

            {/* PROPOSE BET FORM */}
            {showBetForm && (
              <form onSubmit={handleCreateBet} className={styles.formBox} style={{ background: "#fffdfa", borderColor: "#fde68a" }}>
                <div className={`${styles.inputLabel} ${styles.colSpanFull}`}>
                  <span>What are you betting on? *</span>
                  <input
                    required
                    maxLength={240}
                    value={betDescription}
                    onChange={(e) => setBetDescription(e.target.value)}
                    placeholder="e.g., Complete 10 problems on GeeksForGeeks before Sunday midnight"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.inputLabel}>
                  <span>The Friendly Stake / Reward *</span>
                  <input
                    required
                    maxLength={120}
                    value={betReward}
                    onChange={(e) => setBetReward(e.target.value)}
                    placeholder="e.g., Dairy Milk Silk Chocolate 🍫, Iced Latte ☕"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.inputLabel}>
                  <span>Target Date (Optional)</span>
                  <input
                    type="date"
                    value={betDeadline}
                    onChange={(e) => setBetDeadline(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={`${styles.inputLabel} ${styles.colSpanFull}`}>
                  <span>Link to a Goal (Optional)</span>
                  <select
                    value={betTaskId}
                    onChange={(e) => setBetTaskId(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="">No linked goal</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formActions} ${styles.colSpanFull}`}>
                  <button type="button" onClick={() => setShowBetForm(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn} style={{ background: "#d97706" }}>
                    Send Bet to Partner 🍫
                  </button>
                </div>
              </form>
            )}

            {/* BETS LIST */}
            <div className={styles.betsList}>
              {bets.length === 0 ? (
                <div className={styles.emptyStateBox} style={{ borderColor: "#fde68a", background: "#fffdfa" }}>
                  <HandCoins className="h-10 w-10 text-amber-500" style={{ margin: "0 auto" }} />
                  <h4 className={styles.emptyStateTitle}>No Active Bets Yet</h4>
                  <p className={styles.emptyStateSub}>
                    Propose a chocolate or coffee bet on an upcoming goal to make studying even more exciting!
                  </p>
                </div>
              ) : (
                bets.map((bet) => {
                  const isCreator = bet.creatorId === user.id;
                  const getStatusClass = () => {
                    if (bet.status === "accepted") return styles.betStatusAccepted;
                    if (bet.status === "resolved") return styles.betStatusResolved;
                    if (bet.status === "cancelled") return styles.betStatusCancelled;
                    return styles.betStatusOpen;
                  };

                  return (
                    <article key={bet.id} className={styles.betCard}>
                      <div className={styles.betCardHeader}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span className={`${styles.betStatusPill} ${getStatusClass()}`}>
                              {bet.status}
                            </span>
                            {bet.deadline && (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                By {bet.deadline}
                              </span>
                            )}
                          </div>
                          <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px 0" }}>
                            {bet.description}
                          </h4>
                          <p style={{ fontSize: 13, color: "#1e242b", margin: 0 }}>
                            Stake: <strong>{bet.reward}</strong>
                            {bet.taskTitle ? ` · Linked Goal: ${bet.taskTitle}` : ""}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0 0" }}>
                            Proposed by {isCreator ? "You" : bet.creatorName}
                            {bet.winnerName ? ` · Winner: 🏆 ${bet.winnerName}` : ""}
                          </p>
                        </div>

                        <div className={styles.betActionBtnGroup}>
                          {bet.status === "open" && !isCreator && (
                            <button
                              type="button"
                              disabled={betBusyId === bet.id}
                              onClick={() => void handleBetAction(bet, "accept")}
                              className={styles.btnAccept}
                            >
                              Accept Bet 🤝
                            </button>
                          )}
                          {bet.status === "open" && isCreator && (
                            <button
                              type="button"
                              disabled={betBusyId === bet.id}
                              onClick={() => void handleBetAction(bet, "cancel")}
                              className={styles.btnSecondary}
                            >
                              Cancel Bet
                            </button>
                          )}
                          {bet.status === "accepted" && (
                            <>
                              <button
                                type="button"
                                disabled={betBusyId === bet.id}
                                onClick={() => void handleBetAction(bet, "resolve", user.id)}
                                className={styles.btnWonSelf}
                              >
                                I Won! 🏆
                              </button>
                              <button
                                type="button"
                                disabled={betBusyId === bet.id || !partner}
                                onClick={() =>
                                  partner && void handleBetAction(bet, "resolve", Number(partner.id))
                                }
                                className={styles.btnWonPartner}
                              >
                                {partner?.name.split(" ")[0] ?? "Partner"} Won 🍫
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}
      </main>

      {/* 3. GOOGLE MEET STYLE VIDEO CALL MODAL */}
      <StudyVideoRoomModal
        isOpen={isVideoRoomOpen}
        spaceId={spaceId}
        currentUserId={user.id}
        partnerName={partner?.name ?? "your study partner"}
        onClose={() => setIsVideoRoomOpen(false)}
        onRoomChanged={onInboxAction}
      />
    </div>
  );
};

export default StudySpacePage;
