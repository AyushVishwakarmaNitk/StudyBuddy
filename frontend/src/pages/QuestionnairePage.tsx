import React, { useState } from "react";
import type { StudySpace, StudyPartner, QuestionnaireData } from "../types/dashboard";
import { studyBuddyApi } from "../api/studyBuddy";
import BrandLogo from "../components/common/BrandLogo";
import styles from "./QuestionnairePage.module.css";

interface QuestionnairePageProps {
  space: StudySpace | null;
  onBack: () => void;
  onPartnerConnected: (spaceId: string, partner: StudyPartner) => void;
}

// Subject options for Q1
const SUBJECT_OPTIONS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Programming / Software Development",
  "Data Science / Artificial Intelligence",
  "Economics",
  "Business Studies",
  "English",
  "Other (specify)",
];

// Topic catalogs by subject for dynamic Q2 recommendation
const TOPIC_CATALOG: Record<string, string[]> = {
  "Computer Science": [
    "Data Structures and Algorithms",
    "Database Management Systems",
    "Operating Systems",
    "Computer Networks",
    "Machine Learning",
    "Web Development",
  ],
  "Mathematics": [
    "Calculus & Integration",
    "Linear Algebra & Matrices",
    "Probability and Statistics",
    "Discrete Mathematics",
    "Differential Equations",
  ],
  "Physics": [
    "Classical Mechanics",
    "Electromagnetism & Waves",
    "Quantum Physics",
    "Thermodynamics",
    "Optics & Modern Physics",
  ],
  "Chemistry": [
    "Organic Chemistry Reactions",
    "Inorganic Chemistry & Coordination",
    "Physical Chemistry & Kinetics",
    "Biochemistry",
  ],
  "Biology": [
    "Molecular Genetics",
    "Cell Biology & Metabolism",
    "Human Physiology",
    "Ecology & Evolution",
  ],
  "Programming / Software Development": [
    "Python Programming",
    "Java & Object-Oriented Design",
    "C++ Systems Programming",
    "Full-Stack Web (React & Node.js)",
    "Mobile App Development",
    "Cloud Computing & DevOps",
  ],
  "Data Science / Artificial Intelligence": [
    "Machine Learning Algorithms",
    "Deep Learning & Neural Networks",
    "Natural Language Processing (NLP)",
    "Data Analysis & Visualization",
    "Computer Vision",
  ],
  "Economics": [
    "Microeconomics & Consumer Theory",
    "Macroeconomics & Fiscal Policy",
    "Econometrics & Regression",
    "Financial Markets & Banking",
  ],
  "Business Studies": [
    "Marketing Strategy",
    "Financial Accounting & Budgeting",
    "Organizational Behavior",
    "Operations Management",
  ],
  "English": [
    "Academic Essay Writing",
    "Literature & Critical Analysis",
    "Professional Communication",
    "Verbal Reasoning & Vocabulary",
  ],
};

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const QuestionnairePage: React.FC<QuestionnairePageProps> = ({
  space,
  onBack,
  onPartnerConnected,
}) => {
  // Navigation: 1 to 7 = questionnaire sections; 8 = results view
  const [currentSection, setCurrentSection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<StudyPartner[]>([]);
  const [connectingPartnerId, setConnectingPartnerId] = useState<string | null>(null);

  // SECTION 1 — ABSOLUTELY ZERO PRE-SELECTED OPTIONS
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState<string>("");

  // SECTION 2 — ZERO PRE-SELECTED OPTIONS (Empty strings!)
  const [understandingLevel, setUnderstandingLevel] = useState<string>("");
  const [problemSolvingComfort, setProblemSolvingComfort] = useState<string>("");
  const [preferredPartnerLevel, setPreferredPartnerLevel] = useState<string>("");

  // SECTION 3 — ZERO PRE-SELECTED OPTIONS (Empty strings & arrays!)
  const [dailyHours, setDailyHours] = useState<string>("");
  const [preferredTime, setPreferredTime] = useState<string>("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [scheduleFlexibility, setScheduleFlexibility] = useState<string>("");

  // SECTION 4 — ZERO PRE-SELECTED OPTIONS (Empty strings!)
  const [sessionDuration, setSessionDuration] = useState<string>("");
  const [sessionStructure, setSessionStructure] = useState<string>("");

  // SECTION 5 — ZERO PRE-SELECTED OPTIONS (Empty strings & arrays!)
  const [learningModes, setLearningModes] = useState<string[]>([]);
  const [collaborationType, setCollaborationType] = useState<string>("");
  const [partnerQuality, setPartnerQuality] = useState<string>("");

  // SECTION 6 — ZERO PRE-SELECTED OPTIONS (Empty strings & arrays!)
  const [communicationChannels, setCommunicationChannels] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [studyFrequency, setStudyFrequency] = useState<string>("");
  const [expectedDuration, setExpectedDuration] = useState<string>("");

  // SECTION 7 — ZERO PRE-SELECTED OPTIONS (Empty strings!)
  const [consistencyRating, setConsistencyRating] = useState<string>("");
  const [postponeFrequency, setPostponeFrequency] = useState<string>("");
  const [trackingPreference, setTrackingPreference] = useState<string>("");
  const [accountabilityImportance, setAccountabilityImportance] = useState<string>("");
  const [feedbackQuestion, setFeedbackQuestion] = useState<string>("");

  // Toggle multi-select items
  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    setValidationError(null);
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics([...selectedTopics, trimmed]);
      setCustomTopicInput("");
    }
  };

  // Derive dynamic topics from selected subjects
  const availableDynamicTopics: string[] = Array.from(
    new Set(selectedSubjects.flatMap((s) => TOPIC_CATALOG[s] || []))
  );

  // Validate current section before proceeding to next section
  const validateSection = (section: number): boolean => {
    if (section === 1) {
      if (selectedSubjects.length === 0) {
        setValidationError("Please select at least one subject to study with your partner (Q1).");
        return false;
      }
      if (selectedSubjects.includes("Other (specify)") && !customSubject.trim()) {
        setValidationError("Please specify your custom subject name in the text box.");
        return false;
      }
    } else if (section === 2) {
      if (!understandingLevel) {
        setValidationError("Please select your current understanding level (Q3).");
        return false;
      }
      if (!problemSolvingComfort) {
        setValidationError("Please select your problem-solving comfort level (Q4).");
        return false;
      }
      if (!preferredPartnerLevel) {
        setValidationError("Please select your preferred study partner knowledge level (Q5).");
        return false;
      }
    } else if (section === 3) {
      if (!dailyHours) {
        setValidationError("Please select your daily study hours (Q6).");
        return false;
      }
      if (!preferredTime) {
        setValidationError("Please select when you are most comfortable studying (Q7).");
        return false;
      }
      if (availableDays.length === 0) {
        setValidationError("Please select at least one day you are available for study sessions (Q8).");
        return false;
      }
      if (!scheduleFlexibility) {
        setValidationError("Please select your schedule flexibility level.");
        return false;
      }
    } else if (section === 4) {
      if (!sessionDuration) {
        setValidationError("Please select your preferred study session duration (Q9).");
        return false;
      }
      if (!sessionStructure) {
        setValidationError("Please select your session structuring preference (Q10).");
        return false;
      }
    } else if (section === 5) {
      if (learningModes.length === 0) {
        setValidationError("Please select at least one preferred learning style (Q11).");
        return false;
      }
      if (!collaborationType) {
        setValidationError("Please select your preferred type of collaboration (Q12).");
        return false;
      }
      if (!partnerQuality) {
        setValidationError("Please select what kind of study partner you would prefer (Q13).");
        return false;
      }
    } else if (section === 6) {
      if (communicationChannels.length === 0) {
        setValidationError("Please select at least one preferred communication channel (Q14).");
        return false;
      }
      if (!primaryGoal) {
        setValidationError("Please select your primary academic goal (Q15).");
        return false;
      }
      if (!studyFrequency) {
        setValidationError("Please select your desired study frequency (Q16).");
        return false;
      }
      if (!expectedDuration) {
        setValidationError("Please select your expected partnership duration.");
        return false;
      }
    } else if (section === 7) {
      if (!consistencyRating) {
        setValidationError("Please rate your study consistency (Q17).");
        return false;
      }
      if (!postponeFrequency) {
        setValidationError("Please answer how often you postpone study sessions (Q18).");
        return false;
      }
      if (!trackingPreference) {
        setValidationError("Please answer if you prefer a partner who tracks progress (Q19).");
        return false;
      }
      if (!accountabilityImportance) {
        setValidationError("Please rate the importance of accountability (Q20).");
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleNextSection = () => {
    if (validateSection(currentSection)) {
      setCurrentSection((prev) => Math.min(7, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousSection = () => {
    setValidationError(null);
    setCurrentSection((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitQuestionnaire = async () => {
    if (!validateSection(7)) return;

    setIsSubmitting(true);
    try {
      const payload: QuestionnaireData = {
        study_space_id: space?.id,
        subjects: selectedSubjects,
        custom_subject: customSubject,
        topics: selectedTopics,
        custom_topics: customTopicInput,
        understanding_level: understandingLevel,
        problem_solving_comfort: problemSolvingComfort,
        preferred_partner_level: preferredPartnerLevel,
        daily_study_hours: dailyHours,
        preferred_study_time: preferredTime,
        available_days: availableDays,
        schedule_flexibility: scheduleFlexibility,
        session_duration: sessionDuration,
        session_structure: sessionStructure,
        learning_modes: learningModes,
        collaboration_type: collaborationType,
        partner_quality: partnerQuality,
        communication_channels: communicationChannels,
        primary_goal: primaryGoal,
        study_frequency: studyFrequency,
        expected_duration: expectedDuration,
        consistency_rating: consistencyRating,
        postpone_frequency: postponeFrequency,
        tracking_preference: trackingPreference,
        accountability_importance: accountabilityImportance,
        feedback_question: feedbackQuestion,
      };

      const result = await studyBuddyApi.submitQuestionnaire(payload);
      setTopMatches(result.top_matches);
      setCurrentSection(8); // Show Results Step
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      try {
        const fallbackList = await studyBuddyApi.getAvailablePartners();
        setTopMatches(fallbackList.slice(0, 5));
        setCurrentSection(8);
      } catch {
        alert("Failed to analyze matches. Please check network connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnect = async (partner: StudyPartner) => {
    if (!space) return;
    setConnectingPartnerId(partner.id);
    try {
      await studyBuddyApi.updateStudySpace(space.id, {
        partner_id: partner.id,
        status: "active",
        upcoming_sessions: 1,
      });
      onPartnerConnected(space.id, partner);
    } catch (err) {
      console.error("Error connecting partner:", err);
      onPartnerConnected(space.id, partner);
    } finally {
      setConnectingPartnerId(null);
    }
  };

  const progressPercent = Math.min(100, Math.round(((currentSection - 1) / 7) * 100));

  return (
    <div className={styles.pageWrapper}>
      {/* NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <BrandLogo size="md" />
          <button
            type="button"
            className={styles.backToDashboardBtn}
            onClick={onBack}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className={styles.mainContainer}>
        {/* GOAL CONTEXT CARD */}
        {space && (
          <div className={styles.goalContextCard}>
            <div className={styles.goalInfoLeft}>
              <span className={styles.goalLabel}>Finding Study Partner for Goal</span>
              <h2 className={styles.goalTitle}>{space.title}</h2>
            </div>
            <span className={styles.goalSubjectTag}>
              Subject: {space.subject || "General"}
            </span>
          </div>
        )}

        {/* SURVEY CARD */}
        <div className={styles.surveyCard}>
          {/* PROGRESS HEADER (Steps 1 to 7) */}
          {currentSection <= 7 && (
            <div className={styles.progressHeader}>
              <div className={styles.progressInfoRow}>
                <div>
                  <span className={styles.sectionBadge}>
                    Section {currentSection} of 7
                  </span>
                  <h3 className={styles.sectionTitleText}>
                    {currentSection === 1 && "Academic Interests & Subject Selection"}
                    {currentSection === 2 && "Subject Understanding & Knowledge Level"}
                    {currentSection === 3 && "Study Routine & Availability"}
                    {currentSection === 4 && "Study Duration & Focus"}
                    {currentSection === 5 && "Learning & Collaboration Preferences"}
                    {currentSection === 6 && "Communication & Academic Goals"}
                    {currentSection === 7 && "Consistency & Accountability"}
                  </h3>
                </div>
                <span className={styles.progressPercentText}>
                  {progressPercent}% Complete
                </span>
              </div>

              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.max(14, progressPercent)}%` }}
                />
              </div>

              <div className={styles.stepsPillsRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                  <div
                    key={step}
                    className={`${styles.stepPill} ${currentSection >= step ? styles.stepPillActive : ""}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SURVEY BODY */}
          <div className={styles.surveyBody}>
            {/* INLINE VALIDATION ALERT */}
            {validationError && (
              <div className={styles.validationAlert}>
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* SECTION 1 */}
            {currentSection === 1 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand what you want to learn so StudyBuddy AI can recommend compatible study partners who share your goals.
                  </p>
                </div>

                {/* Q1 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q1.</span>
                    Which subject(s) do you want to study with a partner?
                  </h4>
                  <p className={styles.questionSubtext}>Multiple selections allowed. Click to select.</p>

                  <div className={styles.optionsGrid}>
                    {SUBJECT_OPTIONS.map((subj) => {
                      const isSelected = selectedSubjects.includes(subj);
                      return (
                        <div
                          key={subj}
                          className={`${styles.pillCard} ${isSelected ? styles.pillCardSelected : ""}`}
                          onClick={() => toggleItem(selectedSubjects, subj, setSelectedSubjects)}
                        >
                          <span className={styles.pillBoxCheck}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{subj}</span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSubjects.includes("Other (specify)") && (
                    <div className={styles.customRow}>
                      <input
                        type="text"
                        className={styles.textInput}
                        placeholder="Type your custom subject name here..."
                        value={customSubject}
                        onChange={(e) => {
                          setValidationError(null);
                          setCustomSubject(e.target.value);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Q2 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q2.</span>
                    Which specific topics do you want to focus on within your selected subjects?
                  </h4>
                  <p className={styles.questionSubtext}>
                    Multiple selections allowed. Dynamic topic suggestions based on your selected subjects:
                  </p>

                  {availableDynamicTopics.length > 0 ? (
                    <div className={styles.optionsGrid}>
                      {availableDynamicTopics.map((topic) => {
                        const isSelected = selectedTopics.includes(topic);
                        return (
                          <div
                            key={topic}
                            className={`${styles.pillCard} ${isSelected ? styles.pillCardSelected : ""}`}
                            onClick={() => toggleItem(selectedTopics, topic, setSelectedTopics)}
                          >
                            <span className={styles.pillBoxCheck}>
                              {isSelected ? "✓" : ""}
                            </span>
                            <span>{topic}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.88rem", color: "#64748b", margin: "10px 0" }}>
                      Select one or more subjects above to display topic recommendations.
                    </p>
                  )}

                  <div className={styles.customRow}>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="Add custom topic (e.g. Normalization, Dynamic Programming)..."
                      value={customTopicInput}
                      onChange={(e) => setCustomTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTopic();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={handleAddCustomTopic}
                    >
                      + Add Topic
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2 */}
            {currentSection === 2 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand your current knowledge level and problem-solving comfort to pair you with someone whose proficiency complements yours.
                  </p>
                </div>

                {/* Q3 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q3.</span>
                    How would you rate your current understanding of the selected subject?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Beginner – I have little or no knowledge.",
                      "Basic – I understand fundamental concepts.",
                      "Intermediate – I understand most concepts but struggle with complex topics.",
                      "Advanced – I have strong subject knowledge.",
                      "Expert – I can independently apply and explain advanced concepts.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${understandingLevel === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setUnderstandingLevel(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {understandingLevel === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q4 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q4.</span>
                    How comfortable are you solving problems related to this subject?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "I need complete guidance.",
                      "I can solve basic problems with help.",
                      "I can solve moderate problems independently.",
                      "I can solve advanced problems independently.",
                      "I can solve and explain complex problems.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${problemSolvingComfort === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setProblemSolvingComfort(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {problemSolvingComfort === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q5 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q5.</span>
                    What kind of study partner would you prefer based on knowledge level?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Someone at my current level.",
                      "Someone slightly more advanced than me.",
                      "Someone at a beginner level.",
                      "Someone I can teach and learn with.",
                      "No preference.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${preferredPartnerLevel === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setPreferredPartnerLevel(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {preferredPartnerLevel === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3 */}
            {currentSection === 3 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand your study timing and weekly schedule to match you with peers whose availability coincides with yours.
                  </p>
                </div>

                {/* Q6 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q6.</span>
                    How many hours do you usually study per day?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Less than 1 hour.",
                      "1–2 hours.",
                      "2–4 hours.",
                      "4–6 hours.",
                      "More than 6 hours.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${dailyHours === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setDailyHours(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {dailyHours === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q7 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q7.</span>
                    When are you most comfortable studying?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Early morning (5 AM – 9 AM).",
                      "Morning (9 AM – 12 PM).",
                      "Afternoon (12 PM – 5 PM).",
                      "Evening (5 PM – 9 PM).",
                      "Night (9 PM onwards).",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${preferredTime === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setPreferredTime(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {preferredTime === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q8 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q8.</span>
                    Which days are you generally available for collaborative studying?
                  </h4>
                  <p className={styles.questionSubtext}>Multiple selections allowed. Click to choose days.</p>

                  <div className={styles.optionsGrid}>
                    {DAY_OPTIONS.map((day) => {
                      const isSelected = availableDays.includes(day);
                      return (
                        <div
                          key={day}
                          className={`${styles.pillCard} ${isSelected ? styles.pillCardSelected : ""}`}
                          onClick={() => toggleItem(availableDays, day, setAvailableDays)}
                        >
                          <span className={styles.pillBoxCheck}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{day}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "22px" }}>
                    <p style={{ fontSize: "0.94rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>
                      How flexible is your schedule?
                    </p>
                    <div className={styles.radioList}>
                      {[
                        "Very flexible.",
                        "Somewhat flexible.",
                        "Mostly fixed.",
                        "Completely fixed.",
                      ].map((opt) => (
                        <div
                          key={opt}
                          className={`${styles.radioOptionCard} ${scheduleFlexibility === opt ? styles.radioOptionCardSelected : ""}`}
                          onClick={() => {
                            setValidationError(null);
                            setScheduleFlexibility(opt);
                          }}
                        >
                          <span className={styles.circleIndicator}>
                            {scheduleFlexibility === opt && <span className={styles.innerDot} />}
                          </span>
                          <span className={styles.optionLabelText}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4 */}
            {currentSection === 4 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand your concentration span and preferred session formats to align your study rhythms.
                  </p>
                </div>

                {/* Q9 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q9.</span>
                    What is your preferred study session duration?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "15–30 minutes.",
                      "30–60 minutes.",
                      "1–2 hours.",
                      "2–3 hours.",
                      "More than 3 hours.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${sessionDuration === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setSessionDuration(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {sessionDuration === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q10 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q10.</span>
                    How do you prefer structuring your study sessions?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Short sessions with frequent breaks.",
                      "Long sessions with fewer breaks.",
                      "Pomodoro technique (25 minutes study, 5 minutes break).",
                      "Flexible sessions depending on the subject.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${sessionStructure === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setSessionStructure(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {sessionStructure === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5 */}
            {currentSection === 5 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand how you absorb concepts and collaborate with others for maximum peer synergy.
                  </p>
                </div>

                {/* Q11 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q11.</span>
                    How do you prefer learning?
                  </h4>
                  <p className={styles.questionSubtext}>Multiple selections allowed.</p>

                  <div className={styles.radioList}>
                    {[
                      "Visual learning (diagrams, videos and charts).",
                      "Reading and writing.",
                      "Listening to explanations.",
                      "Practical exercises and hands-on learning.",
                      "Group discussions and teaching others.",
                    ].map((opt) => {
                      const isSelected = learningModes.includes(opt);
                      return (
                        <div
                          key={opt}
                          className={`${styles.pillCard} ${isSelected ? styles.pillCardSelected : ""}`}
                          onClick={() => toggleItem(learningModes, opt, setLearningModes)}
                        >
                          <span className={styles.pillBoxCheck}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Q12 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q12.</span>
                    What type of collaboration do you prefer?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Solving problems together.",
                      "Teaching each other.",
                      "Discussing concepts.",
                      "Quiet parallel studying.",
                      "Sharing notes and resources.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${collaborationType === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setCollaborationType(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {collaborationType === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q13 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q13.</span>
                    What kind of study partner would you prefer?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Disciplined and serious.",
                      "Friendly and interactive.",
                      "Competitive and challenging.",
                      "Supportive and motivating.",
                      "A combination of these qualities.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${partnerQuality === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setPartnerQuality(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {partnerQuality === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6 */}
            {currentSection === 6 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand your communication channels and academic targets for an aligned partnership.
                  </p>
                </div>

                {/* Q14 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q14.</span>
                    How would you prefer communicating with your study partner?
                  </h4>
                  <p className={styles.questionSubtext}>Multiple selections allowed.</p>

                  <div className={styles.optionsGrid}>
                    {[
                      "Text messages.",
                      "Voice calls.",
                      "Video calls.",
                      "In-person discussions.",
                      "Shared documents and notes.",
                    ].map((opt) => {
                      const isSelected = communicationChannels.includes(opt);
                      return (
                        <div
                          key={opt}
                          className={`${styles.pillCard} ${isSelected ? styles.pillCardSelected : ""}`}
                          onClick={() => toggleItem(communicationChannels, opt, setCommunicationChannels)}
                        >
                          <span className={styles.pillBoxCheck}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Q15 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q15.</span>
                    What is your primary academic goal?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Examination preparation.",
                      "Improving subject knowledge.",
                      "Completing assignments.",
                      "Project development.",
                      "Placement preparation.",
                      "Learning new skills.",
                      "Competitive examination preparation.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${primaryGoal === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setPrimaryGoal(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {primaryGoal === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q16 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q16.</span>
                    How frequently would you like to study, and for how long?
                  </h4>

                  <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", margin: "14px 0 8px" }}>
                    Study Frequency:
                  </p>
                  <div className={styles.radioList}>
                    {[
                      "Daily.",
                      "4–5 times a week.",
                      "2–3 times a week.",
                      "Once a week.",
                      "Only when required.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${studyFrequency === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setStudyFrequency(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {studyFrequency === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", margin: "18px 0 8px" }}>
                    Expected Partnership Duration:
                  </p>
                  <div className={styles.radioList}>
                    {[
                      "A few weeks.",
                      "1–3 months.",
                      "3–6 months.",
                      "Long-term / ongoing.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${expectedDuration === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setExpectedDuration(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {expectedDuration === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7 */}
            {currentSection === 7 && (
              <div>
                <div className={styles.purposeCallout}>
                  <p>
                    <strong>Purpose:</strong> Understand your study discipline and accountability expectations so you are paired with an equally committed peer.
                  </p>
                </div>

                {/* Q17 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q17.</span>
                    How would you rate your study consistency?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Very consistent.",
                      "Mostly consistent.",
                      "Moderately consistent.",
                      "Inconsistent.",
                      "Highly inconsistent.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${consistencyRating === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setConsistencyRating(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {consistencyRating === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q18 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q18.</span>
                    How often do you postpone your planned study sessions?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Never.",
                      "Rarely.",
                      "Sometimes.",
                      "Often.",
                      "Almost always.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${postponeFrequency === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setPostponeFrequency(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {postponeFrequency === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q19 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q19.</span>
                    Would you prefer a study partner who motivates you and tracks your progress?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Yes, regularly.",
                      "Yes, occasionally.",
                      "Only when needed.",
                      "No preference.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${trackingPreference === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setTrackingPreference(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {trackingPreference === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q20 */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    <span className={styles.questionNumBadge}>Q20.</span>
                    How important is commitment and accountability in a study partnership?
                  </h4>
                  <div className={styles.radioList}>
                    {[
                      "Not important.",
                      "Slightly important.",
                      "Moderately important.",
                      "Very important.",
                      "Extremely important.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.radioOptionCard} ${accountabilityImportance === opt ? styles.radioOptionCardSelected : ""}`}
                        onClick={() => {
                          setValidationError(null);
                          setAccountabilityImportance(opt);
                        }}
                      >
                        <span className={styles.circleIndicator}>
                          {accountabilityImportance === opt && <span className={styles.innerDot} />}
                        </span>
                        <span className={styles.optionLabelText}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SURVEY FEEDBACK BOX */}
                <div className={styles.questionGroup}>
                  <h4 className={styles.questionLabel}>
                    💬 Survey Feedback & Question Suggestion
                  </h4>
                  <p className={styles.questionSubtext}>
                    What question do you think would be useful to add to this survey to help students find better study partners? Share your thought below:
                  </p>
                  <textarea
                    className={styles.textareaField}
                    placeholder="e.g. Which programming language or specific course syllabus are you following? (Optional suggestion)"
                    value={feedbackQuestion}
                    onChange={(e) => setFeedbackQuestion(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SUBMITTING STATE */}
            {isSubmitting && (
              <div className={styles.loadingBox}>
                <div className={styles.aiSpinner} />
                <h3 className={styles.loadingHeading}>Analyzing Compatibility with Peers...</h3>
                <p className={styles.loadingSubtext}>
                  StudyBuddy AI is evaluating your responses across academic subjects, knowledge level, daily schedule, and study habits.
                </p>
              </div>
            )}

            {/* SECTION 8: RESULTS VIEW (TOP 5 MATCHES) */}
            {currentSection === 8 && !isSubmitting && (
              <div className={styles.matchesViewContainer}>
                <div className={styles.matchesHeadingRow}>
                  <h3 className={styles.matchesHeading}>Top 5 Recommended Study Partners</h3>
                  <p className={styles.matchesSubheading}>
                    Algorithmically calculated based on your questionnaire responses for <strong>{space?.title}</strong>.
                  </p>
                </div>

                <div className={styles.matchesList}>
                  {topMatches.map((partner, index) => {
                    const isConnecting = connectingPartnerId === partner.id;
                    const initials = partner.name
                      ? partner.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "SB";

                    return (
                      <div key={partner.id} className={styles.matchCard}>
                        <div className={styles.matchCardTop}>
                          <div className={styles.partnerInfoCol}>
                            <div className={styles.avatarCircle}>
                              {partner.avatar ? (
                                <img
                                  src={partner.avatar}
                                  alt={partner.name}
                                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className={styles.partnerDetails}>
                              <div className={styles.partnerNameRow}>
                                <h4 className={styles.partnerName}>{partner.name}</h4>
                                <span
                                  className={`${styles.rankBadge} ${index === 0 ? styles.rankBest : ""}`}
                                >
                                  {index === 0 ? "⭐ #1 Best Match" : `#${index + 1} Match`}
                                </span>
                              </div>
                              <p className={styles.partnerMeta}>
                                {partner.branch} • Year {partner.year}
                              </p>
                            </div>
                          </div>

                          <div className={styles.compatibilityBadge}>
                            <span>{partner.compatibility}%</span>
                            <span className={styles.compatibilitySub}>Compatibility</span>
                          </div>
                        </div>

                        <p className={styles.partnerBio}>{partner.bio}</p>

                        {partner.matchReasons && partner.matchReasons.length > 0 && (
                          <div className={styles.reasonsList}>
                            {partner.matchReasons.map((reason, rIdx) => (
                              <span key={rIdx} className={styles.reasonChip}>
                                <span className={styles.reasonChipIcon}>✓</span>
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          className={styles.connectBtn}
                          onClick={() => handleConnect(partner)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? "Connecting Space..." : "Connect as Study Partner 🚀"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.matchesFooterActions}>
                  <button
                    type="button"
                    className={styles.retakeBtn}
                    onClick={() => {
                      setCurrentSection(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    ↺ Retake Survey
                  </button>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={onBack}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER BAR (Active during sections 1 to 7) */}
          {currentSection <= 7 && (
            <div className={styles.surveyFooter}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={handlePreviousSection}
                disabled={currentSection === 1 || isSubmitting}
              >
                ← Previous Section
              </button>

              {currentSection < 7 ? (
                <button
                  type="button"
                  className={styles.nextBtn}
                  onClick={handleNextSection}
                >
                  Next Section →
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleSubmitQuestionnaire}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Finding Best Matches..." : "🚀 Submit & Find Top 5 Matches"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuestionnairePage;

