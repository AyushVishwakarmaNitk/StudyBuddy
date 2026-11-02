import React, { useState, useEffect } from "react";
import type { StudySpace, StudyPartner, QuestionnaireData } from "../../types/dashboard";
import { studyBuddyApi } from "../../api/studyBuddy";
import styles from "./FindPartnerModal.module.css";

interface FindPartnerModalProps {
  isOpen: boolean;
  space: StudySpace | null;
  partners?: StudyPartner[];
  onClose: () => void;
  onConnect: (partner: StudyPartner) => void;
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

export const FindPartnerModal: React.FC<FindPartnerModalProps> = ({
  isOpen,
  space,
  onClose,
  onConnect,
}) => {
  // Navigation: 1 to 7 = questionnaire sections; 8 = results view
  const [currentSection, setCurrentSection] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<StudyPartner[]>([]);
  const [connectingPartnerId, setConnectingPartnerId] = useState<string | null>(null);
  const [customTopicInput, setCustomTopicInput] = useState<string>("");

  // Section 1
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Section 2
  const [understandingLevel, setUnderstandingLevel] = useState<string>(
    "Intermediate – I understand most concepts but struggle with complex topics."
  );
  const [problemSolvingComfort, setProblemSolvingComfort] = useState<string>(
    "I can solve moderate problems independently."
  );
  const [preferredPartnerLevel, setPreferredPartnerLevel] = useState<string>(
    "Someone at my current level."
  );

  // Section 3
  const [dailyHours, setDailyHours] = useState<string>("2–4 hours.");
  const [preferredTime, setPreferredTime] = useState<string>("Evening (5 PM – 9 PM).");
  const [availableDays, setAvailableDays] = useState<string[]>([
    "Monday",
    "Wednesday",
    "Friday",
  ]);
  const [scheduleFlexibility, setScheduleFlexibility] = useState<string>(
    "Somewhat flexible."
  );

  // Section 4
  const [sessionDuration, setSessionDuration] = useState<string>("1–2 hours.");
  const [sessionStructure, setSessionStructure] = useState<string>(
    "Pomodoro technique (25 minutes study, 5 minutes break)."
  );

  // Section 5
  const [learningModes, setLearningModes] = useState<string[]>([
    "Visual learning (diagrams, videos and charts).",
    "Practical exercises and hands-on learning.",
  ]);
  const [collaborationType, setCollaborationType] = useState<string>(
    "Solving problems together."
  );
  const [partnerQuality, setPartnerQuality] = useState<string>(
    "Disciplined and serious."
  );

  // Section 6
  const [communicationChannels, setCommunicationChannels] = useState<string[]>([
    "Text messages.",
    "Video calls.",
  ]);
  const [primaryGoal, setPrimaryGoal] = useState<string>(
    "Examination preparation."
  );
  const [studyFrequency, setStudyFrequency] = useState<string>("2–3 times a week.");
  const [expectedDuration, setExpectedDuration] = useState<string>("1–3 months.");

  // Section 7
  const [consistencyRating, setConsistencyRating] = useState<string>(
    "Mostly consistent."
  );
  const [postponeFrequency, setPostponeFrequency] = useState<string>("Rarely.");
  const [trackingPreference, setTrackingPreference] = useState<string>(
    "Yes, regularly."
  );
  const [accountabilityImportance, setAccountabilityImportance] = useState<string>(
    "Very important."
  );
  const [feedbackQuestion, setFeedbackQuestion] = useState<string>("");

  // Initialize or pre-fill subjects from current study space
  useEffect(() => {
    if (space && isOpen) {
      setCurrentSection(1);
      setTopMatches([]);
      setConnectingPartnerId(null);

      // Pre-fill subject if space has a subject
      const initialSubject = space.subject || space.title;
      const matchedCatalogSubject = SUBJECT_OPTIONS.find(
        (s) =>
          initialSubject.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(initialSubject.toLowerCase())
      );

      if (matchedCatalogSubject) {
        setSelectedSubjects([matchedCatalogSubject]);
      } else if (initialSubject.trim()) {
        setSelectedSubjects(["Computer Science"]);
      }
    }
  }, [space, isOpen]);

  if (!isOpen || !space) return null;

  // Toggle multi-select items
  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
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
    new Set(
      selectedSubjects.flatMap((s) => TOPIC_CATALOG[s] || [])
    )
  );

  // Handle final submission and call AI matching algorithm
  const handleSubmitQuestionnaire = async () => {
    setIsSubmitting(true);
    try {
      const payload: QuestionnaireData = {
        study_space_id: space.id,
        // Section 1
        subjects: selectedSubjects.length > 0 ? selectedSubjects : ["Computer Science"],
        custom_subject: customSubject,
        topics: selectedTopics,
        custom_topics: customTopicInput,
        // Section 2
        understanding_level: understandingLevel,
        problem_solving_comfort: problemSolvingComfort,
        preferred_partner_level: preferredPartnerLevel,
        // Section 3
        daily_study_hours: dailyHours,
        preferred_study_time: preferredTime,
        available_days: availableDays,
        schedule_flexibility: scheduleFlexibility,
        // Section 4
        session_duration: sessionDuration,
        session_structure: sessionStructure,
        // Section 5
        learning_modes: learningModes,
        collaboration_type: collaborationType,
        partner_quality: partnerQuality,
        // Section 6
        communication_channels: communicationChannels,
        primary_goal: primaryGoal,
        study_frequency: studyFrequency,
        expected_duration: expectedDuration,
        // Section 7
        consistency_rating: consistencyRating,
        postpone_frequency: postponeFrequency,
        tracking_preference: trackingPreference,
        accountability_importance: accountabilityImportance,
        // Survey Feedback
        feedback_question: feedbackQuestion,
      };

      const result = await studyBuddyApi.submitQuestionnaire(payload);
      setTopMatches(result.top_matches);
      setCurrentSection(8); // Show Results Step
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      // Fallback: fetch available partners
      try {
        const fallbackList = await studyBuddyApi.getAvailablePartners();
        setTopMatches(fallbackList.slice(0, 5));
        setCurrentSection(8);
      } catch {
        alert("Failed to analyze matches. Please verify network and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectPartner = async (partner: StudyPartner) => {
    setConnectingPartnerId(partner.id);
    try {
      await onConnect(partner);
      onClose();
    } finally {
      setConnectingPartnerId(null);
    }
  };

  // Progress Calculations
  const progressPercent = Math.min(100, Math.round(((currentSection - 1) / 7) * 100));

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        {/* MODAL HEADER */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.badgeRow}>
              <span className={styles.spaceBadge}>
                🎯 Goal: {space.title}
              </span>
              <span className={styles.subjectBadge}>
                {space.subject || "All Subjects"}
              </span>
            </div>
            <h2 className={styles.title}>
              {currentSection === 8
                ? "Top 5 Recommended Study Partners"
                : "Study Partner Compatibility Questionnaire"}
            </h2>
            <p className={styles.subtitle}>
              {currentSection === 8
                ? "Algorithmically ranked by StudyBuddy AI based on your learning style, schedule, and academic goals."
                : "Help StudyBuddy AI understand your study routine, knowledge level, and preferences to calculate your best matches."}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* PROGRESS BAR (Active during steps 1-7) */}
        {currentSection <= 7 && (
          <div className={styles.progressSection}>
            <div className={styles.progressInfo}>
              <div className={styles.stepTitle}>
                <span className={styles.stepNumber}>Section {currentSection} of 7</span>
                {currentSection === 1 && "Academic Interests & Subject Selection"}
                {currentSection === 2 && "Subject Understanding & Knowledge Level"}
                {currentSection === 3 && "Study Routine & Availability"}
                {currentSection === 4 && "Study Duration & Focus"}
                {currentSection === 5 && "Learning & Collaboration Preferences"}
                {currentSection === 6 && "Communication & Academic Goals"}
                {currentSection === 7 && "Consistency & Accountability"}
              </div>
              <span className={styles.progressPercent}>{progressPercent}% completed</span>
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${Math.max(14, progressPercent)}%` }}
              />
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className={styles.modalBody}>
          {/* SECTION 1 */}
          {currentSection === 1 && (
            <div>
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand what subjects and specific topics you want to learn so StudyBuddy AI can recommend compatible peers who share your focus.
                </p>
              </div>

              {/* Q1 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q1.</span> Which subject(s) do you want to study with a partner?
                </h3>
                <p className={styles.questionHint}>Multiple selections allowed.</p>
                <div className={styles.optionsGrid}>
                  {SUBJECT_OPTIONS.map((subj) => {
                    const isSelected = selectedSubjects.includes(subj);
                    return (
                      <div
                        key={subj}
                        className={`${styles.optionPill} ${isSelected ? styles.optionPillSelected : ""}`}
                        onClick={() => toggleItem(selectedSubjects, subj, setSelectedSubjects)}
                      >
                        <span className={styles.pillCheckbox}>
                          {isSelected ? "✓" : ""}
                        </span>
                        <span>{subj}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedSubjects.includes("Other (specify)") && (
                  <div className={styles.customInputBox}>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder="Specify your other subject name..."
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Q2 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q2.</span> Which specific topics do you want to focus on within your selected subjects?
                </h3>
                <p className={styles.questionHint}>
                  Multiple selections allowed. Dynamic suggestions based on your selected subjects:
                </p>

                {availableDynamicTopics.length > 0 ? (
                  <div className={styles.optionsGrid}>
                    {availableDynamicTopics.map((topic) => {
                      const isSelected = selectedTopics.includes(topic);
                      return (
                        <div
                          key={topic}
                          className={`${styles.optionPill} ${isSelected ? styles.optionPillSelected : ""}`}
                          onClick={() => toggleItem(selectedTopics, topic, setSelectedTopics)}
                        >
                          <span className={styles.pillCheckbox}>
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{topic}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#8a9ba8" }}>
                    Select one or more subjects above to view topic recommendations.
                  </p>
                )}

                <div className={styles.customInputBox}>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="Add a custom topic (e.g. Normalization, Dynamic Programming)..."
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
                    className={styles.addCustomBtn}
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
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand your current proficiency so we can pair you with someone whose knowledge level complements your goals.
                </p>
              </div>

              {/* Q3 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q3.</span> How would you rate your current understanding of the selected subject?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Beginner – I have little or no knowledge.",
                    "Basic – I understand fundamental concepts.",
                    "Intermediate – I understand most concepts but struggle with complex topics.",
                    "Advanced – I have strong subject knowledge.",
                    "Expert – I can independently apply and explain advanced concepts.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${understandingLevel === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setUnderstandingLevel(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {understandingLevel === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q4 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q4.</span> How comfortable are you solving problems related to this subject?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "I need complete guidance.",
                    "I can solve basic problems with help.",
                    "I can solve moderate problems independently.",
                    "I can solve advanced problems independently.",
                    "I can solve and explain complex problems.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${problemSolvingComfort === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setProblemSolvingComfort(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {problemSolvingComfort === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q5 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q5.</span> What kind of study partner would you prefer based on knowledge level?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Someone at my current level.",
                    "Someone slightly more advanced than me.",
                    "Someone at a beginner level.",
                    "Someone I can teach and learn with.",
                    "No preference.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${preferredPartnerLevel === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setPreferredPartnerLevel(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {preferredPartnerLevel === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3 */}
          {currentSection === 3 && (
            <div>
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand your study timing and weekly availability to discover partners with overlapping schedules.
                </p>
              </div>

              {/* Q6 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q6.</span> How many hours do you usually study per day?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Less than 1 hour.",
                    "1–2 hours.",
                    "2–4 hours.",
                    "4–6 hours.",
                    "More than 6 hours.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${dailyHours === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setDailyHours(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {dailyHours === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q7 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q7.</span> When are you most comfortable studying?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Early morning (5 AM – 9 AM).",
                    "Morning (9 AM – 12 PM).",
                    "Afternoon (12 PM – 5 PM).",
                    "Evening (5 PM – 9 PM).",
                    "Night (9 PM onwards).",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${preferredTime === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setPreferredTime(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {preferredTime === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q8 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q8.</span> Which days are you generally available for collaborative studying?
                </h3>
                <p className={styles.questionHint}>Multiple selections allowed.</p>
                <div className={styles.optionsGrid}>
                  {DAY_OPTIONS.map((day) => {
                    const isSelected = availableDays.includes(day);
                    return (
                      <div
                        key={day}
                        className={`${styles.optionPill} ${isSelected ? styles.optionPillSelected : ""}`}
                        onClick={() => toggleItem(availableDays, day, setAvailableDays)}
                      >
                        <span className={styles.pillCheckbox}>
                          {isSelected ? "✓" : ""}
                        </span>
                        <span>{day}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "18px" }}>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>
                    How flexible is your study schedule?
                  </p>
                  <div className={styles.cardsList}>
                    {[
                      "Very flexible.",
                      "Somewhat flexible.",
                      "Mostly fixed.",
                      "Completely fixed.",
                    ].map((opt) => (
                      <div
                        key={opt}
                        className={`${styles.choiceCard} ${scheduleFlexibility === opt ? styles.choiceCardSelected : ""}`}
                        onClick={() => setScheduleFlexibility(opt)}
                      >
                        <span className={styles.radioCircle}>
                          {scheduleFlexibility === opt && <span className={styles.radioDot} />}
                        </span>
                        <span className={styles.choiceCardLabel}>{opt}</span>
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
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand your concentration span and preferred session structures to match you with compatible study rhythms.
                </p>
              </div>

              {/* Q9 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q9.</span> What is your preferred study session duration?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "15–30 minutes.",
                    "30–60 minutes.",
                    "1–2 hours.",
                    "2–3 hours.",
                    "More than 3 hours.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${sessionDuration === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setSessionDuration(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {sessionDuration === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q10 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q10.</span> How do you prefer structuring your study sessions?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Short sessions with frequent breaks.",
                    "Long sessions with fewer breaks.",
                    "Pomodoro technique (25 minutes study, 5 minutes break).",
                    "Flexible sessions depending on the subject.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${sessionStructure === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setSessionStructure(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {sessionStructure === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5 */}
          {currentSection === 5 && (
            <div>
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand how you absorb concepts and collaborate with others for maximum peer synergy.
                </p>
              </div>

              {/* Q11 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q11.</span> How do you prefer learning?
                </h3>
                <p className={styles.questionHint}>Multiple selections allowed.</p>
                <div className={styles.cardsList}>
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
                        className={`${styles.optionPill} ${isSelected ? styles.optionPillSelected : ""}`}
                        onClick={() => toggleItem(learningModes, opt, setLearningModes)}
                      >
                        <span className={styles.pillCheckbox}>
                          {isSelected ? "✓" : ""}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Q12 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q12.</span> What type of collaboration do you prefer?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Solving problems together.",
                    "Teaching each other.",
                    "Discussing concepts.",
                    "Quiet parallel studying.",
                    "Sharing notes and resources.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${collaborationType === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setCollaborationType(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {collaborationType === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q13 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q13.</span> What kind of study partner would you prefer?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Disciplined and serious.",
                    "Friendly and interactive.",
                    "Competitive and challenging.",
                    "Supportive and motivating.",
                    "A combination of these qualities.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${partnerQuality === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setPartnerQuality(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {partnerQuality === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6 */}
          {currentSection === 6 && (
            <div>
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand your communication channels and academic objectives for a focused, goal-oriented partnership.
                </p>
              </div>

              {/* Q14 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q14.</span> How would you prefer communicating with your study partner?
                </h3>
                <p className={styles.questionHint}>Multiple selections allowed.</p>
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
                        className={`${styles.optionPill} ${isSelected ? styles.optionPillSelected : ""}`}
                        onClick={() => toggleItem(communicationChannels, opt, setCommunicationChannels)}
                      >
                        <span className={styles.pillCheckbox}>
                          {isSelected ? "✓" : ""}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Q15 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q15.</span> What is your primary academic goal?
                </h3>
                <div className={styles.cardsList}>
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
                      className={`${styles.choiceCard} ${primaryGoal === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setPrimaryGoal(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {primaryGoal === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q16 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q16.</span> How frequently would you like to study with your partner, and for how long do you expect the partnership to last?
                </h3>

                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", margin: "14px 0 8px" }}>
                  Session Frequency:
                </p>
                <div className={styles.cardsList}>
                  {[
                    "Daily.",
                    "4–5 times a week.",
                    "2–3 times a week.",
                    "Once a week.",
                    "Only when required.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${studyFrequency === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setStudyFrequency(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {studyFrequency === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", margin: "18px 0 8px" }}>
                  Expected Partnership Duration:
                </p>
                <div className={styles.cardsList}>
                  {[
                    "A few weeks.",
                    "1–3 months.",
                    "3–6 months.",
                    "Long-term / ongoing.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${expectedDuration === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setExpectedDuration(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {expectedDuration === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7 */}
          {currentSection === 7 && (
            <div>
              <div className={styles.sectionPurposeBox}>
                <p className={styles.sectionPurposeText}>
                  <strong>Purpose:</strong> Understand your study discipline and accountability preferences so we pair you with someone equally committed.
                </p>
              </div>

              {/* Q17 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q17.</span> How would you rate your study consistency?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Very consistent.",
                    "Mostly consistent.",
                    "Moderately consistent.",
                    "Inconsistent.",
                    "Highly inconsistent.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${consistencyRating === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setConsistencyRating(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {consistencyRating === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q18 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q18.</span> How often do you postpone your planned study sessions?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Never.",
                    "Rarely.",
                    "Sometimes.",
                    "Often.",
                    "Almost always.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${postponeFrequency === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setPostponeFrequency(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {postponeFrequency === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q19 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q19.</span> Would you prefer a study partner who motivates you and tracks your progress?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Yes, regularly.",
                    "Yes, occasionally.",
                    "Only when needed.",
                    "No preference.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${trackingPreference === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setTrackingPreference(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {trackingPreference === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q20 */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  <span className={styles.questionNum}>Q20.</span> How important is commitment and accountability in a study partnership?
                </h3>
                <div className={styles.cardsList}>
                  {[
                    "Not important.",
                    "Slightly important.",
                    "Moderately important.",
                    "Very important.",
                    "Extremely important.",
                  ].map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.choiceCard} ${accountabilityImportance === opt ? styles.choiceCardSelected : ""}`}
                      onClick={() => setAccountabilityImportance(opt)}
                    >
                      <span className={styles.radioCircle}>
                        {accountabilityImportance === opt && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.choiceCardLabel}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* USER FEEDBACK QUESTION */}
              <div className={styles.questionBlock}>
                <h3 className={styles.questionTitle}>
                  💬 Survey Feedback & Question Suggestion
                </h3>
                <p className={styles.questionHint}>
                  Is there any specific question you thought would be useful for this survey to better match students? Share your suggestion below for our team to review:
                </p>
                <textarea
                  className={styles.textareaInput}
                  placeholder="e.g. Which programming language or specific textbook edition are you following? (Optional suggestion)"
                  value={feedbackQuestion}
                  onChange={(e) => setFeedbackQuestion(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* SUBMITTING STATE */}
          {isSubmitting && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <h3 className={styles.loadingTitle}>Analyzing Your Learning Profile...</h3>
              <p className={styles.loadingSubtitle}>
                StudyBuddy AI is computing multidimensional compatibility across academic subjects, knowledge level, daily schedule, and study habits.
              </p>
            </div>
          )}

          {/* SECTION 8: RESULTS VIEW (TOP 5 MATCHES) */}
          {currentSection === 8 && !isSubmitting && (
            <div>
              <div className={styles.matchesHeader}>
                <h3 className={styles.matchesTitle}>Top 5 Compatible Study Partners</h3>
                <p className={styles.matchesSubtitle}>
                  Select your preferred partner to connect and activate your <strong>{space.title}</strong> study space.
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
                        onClick={() => handleConnectPartner(partner)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? "Connecting Space..." : "Connect as Study Partner 🚀"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={styles.modalFooter}>
          {currentSection <= 7 ? (
            <>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setCurrentSection((prev) => Math.max(1, prev - 1))}
                disabled={currentSection === 1 || isSubmitting}
              >
                ← Back
              </button>

              <div className={styles.footerActions}>
                {currentSection < 7 ? (
                  <button
                    type="button"
                    className={styles.nextBtn}
                    onClick={() => setCurrentSection((prev) => Math.min(7, prev + 1))}
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
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.retakeBtn}
                onClick={() => setCurrentSection(1)}
              >
                ↺ Retake Questionnaire
              </button>
              <button
                type="button"
                className={styles.backBtn}
                onClick={onClose}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindPartnerModal;
