import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./PartnerQuestionnaire.module.css";

type Answer = string | string[];
type Question = {
  id: string;
  title: string;
  required?: boolean;
  type: "select" | "multi" | "text" | "date";
  options?: string[];
  hint?: string;
  max?: number;
};

const sections: { title: string; description: string; questions: Question[] }[] = [
  {
    title: "Your study goal",
    description: "Tell us what you’re working toward so we can find a partner on a similar path.",
    questions: [
      { id: "subject", title: "What subject do you want to study?", required: true, type: "text", hint: "Try Data Structures, DBMS, Python…" },
      { id: "goal", title: "What is your main study goal?", required: true, type: "select", options: ["Prepare for an exam", "Learn a new skill", "Complete a project", "Practice and revise", "Prepare for an interview", "Other"] },
      { id: "level", title: "What is your current level in this subject?", required: true, type: "select", options: ["Beginner — just starting", "Basic — understand the fundamentals", "Intermediate — work independently on common tasks", "Advanced — comfortable with complex concepts"] },
      { id: "timeline", title: "When do you want to achieve your goal?", required: true, type: "select", options: ["Within 1 week", "Within 1 month", "Within 3 months", "More than 3 months", "No fixed deadline"] },
      { id: "deadline", title: "Do you have a target date? (optional)", type: "date" },
    ],
  },
  {
    title: "How you learn",
    description: "Good study partners can learn differently. These preferences help your sessions feel right.",
    questions: [
      { id: "style", title: "How do you prefer to study with a partner?", required: true, type: "select", options: ["Quiet co-study — work independently together", "Discussion — explain concepts and exchange ideas", "Problem-solving — solve questions together", "Teach and learn — take turns explaining", "Mixed approach", "Other"] },
      { id: "help", title: "What would you most like your partner to help with?", required: true, type: "multi", max: 3, options: ["Understanding difficult concepts", "Solving practice questions", "Revising and memorizing", "Building projects", "Staying focused", "Tracking progress", "Preparing for exams", "Other"] },
      { id: "interaction", title: "How interactive should your sessions be?", required: true, type: "select", options: ["Mostly quiet with minimal conversation", "Occasional discussion", "Frequent discussion and collaboration", "Fully interactive throughout"] },
    ],
  },
  {
    title: "Availability & commitment",
    description: "We’ll use your schedule and session preferences to find a practical time to meet.",
    questions: [
      { id: "days", title: "Which days are you available to study?", required: true, type: "multi", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      { id: "times", title: "What time do you usually prefer to study?", required: true, type: "multi", options: ["Early morning (5 AM–8 AM)", "Morning (8 AM–12 PM)", "Afternoon (12 PM–5 PM)", "Evening (5 PM–9 PM)", "Night (9 PM–12 AM)", "Other / custom time"] },
      { id: "duration", title: "How long should one study session last?", required: true, type: "select", options: ["25–30 minutes", "45 minutes", "60 minutes", "90 minutes", "2 hours or more"] },
      { id: "frequency", title: "How many study sessions do you want each week?", required: true, type: "select", options: ["1–2 sessions", "3–4 sessions", "5–6 sessions", "Daily"] },
      { id: "consistency", title: "How consistently can you follow a study schedule?", required: true, type: "select", options: ["I often struggle to follow a schedule", "I follow it sometimes", "I usually follow it", "I am highly consistent"] },
    ],
  },
  {
    title: "Accountability & motivation",
    description: "Everyone stays motivated differently. Choose the kind of support that works for you.",
    questions: [
      { id: "accountability", title: "What kind of accountability do you want from your partner?", required: true, type: "select", options: ["Gentle encouragement", "Regular reminders and check-ins", "Strong mutual accountability", "Minimal accountability — I prefer independence"] },
      { id: "missedSession", title: "What should happen if you miss a planned session?", required: true, type: "select", options: ["A friendly reminder", "Reschedule the session together", "Review what went wrong and make a new plan", "No follow-up unless I ask", "Other"] },
    ],
  },
  {
    title: "Communication preferences",
    description: "Set the language and ways of connecting that make studying comfortable.",
    questions: [
      { id: "languages", title: "Which language would you prefer to study in?", required: true, type: "multi", options: ["English", "Hindi", "Other"] },
      { id: "methods", title: "How would you prefer to study together?", required: true, type: "multi", options: ["Text chat", "Voice call", "Video call", "In-person study", "No strong preference"] },
      { id: "feedback", title: "How do you prefer your partner to give feedback? (optional)", type: "select", options: ["Gentle and encouraging", "Direct and constructive", "Detailed explanations", "No strong preference", "Other"] },
    ],
  },
  {
    title: "Your ideal study partner",
    description: "One last preference helps us prioritize what matters most to you.",
    questions: [
      { id: "priority", title: "What is the most important quality you want in a study partner? (optional)", type: "select", options: ["Consistency and punctuality", "Strong subject knowledge", "Patience and willingness to explain", "Motivation and encouragement", "Similar learning style", "Reliability and commitment", "Other"] },
    ],
  },
];

const questionSteps = sections.flatMap((section, sectionIndex) =>
  section.questions.map((question) => ({ question, section, sectionIndex })),
);

interface PartnerQuestionnaireProps {
  spaceId: string;
  spaceTitle?: string;
  onBack: () => void;
  onComplete: (answers: Record<string, Answer>) => void;
}

const readDraft = (spaceId: string) => {
  try {
    const draft = sessionStorage.getItem(`studybuddy-questionnaire:${spaceId}`);
    return draft ? JSON.parse(draft) as { step?: number; answers?: Record<string, Answer> } : {};
  } catch {
    return {};
  }
};

const PartnerQuestionnaire = ({ spaceId, spaceTitle, onBack, onComplete }: PartnerQuestionnaireProps) => {
  const [step, setStep] = useState(() => Math.min(Math.max(readDraft(spaceId).step ?? 0, 0), questionSteps.length - 1));
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => readDraft(spaceId).answers ?? {});
  const [error, setError] = useState("");
  const { question, section, sectionIndex } = questionSteps[step];

  useEffect(() => {
    if (Object.keys(answers).length) {
      sessionStorage.setItem(`studybuddy-questionnaire:${spaceId}`, JSON.stringify({ step, answers }));
    }
  }, [answers, spaceId, step]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!Object.keys(answers).length) return;
      event.preventDefault();
      event.returnValue = "Your questionnaire is unfinished. Your progress may be lost.";
    };
    const confirmBrowserBack = (event: PopStateEvent) => {
      if (!Object.keys(answers).length) return;
      const shouldLeave = window.confirm("Your questionnaire is unfinished. Your answers are saved on this device, but leaving now may interrupt your progress. Leave this page?");
      if (!shouldLeave) {
        event.stopImmediatePropagation();
        window.history.pushState({}, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    window.addEventListener("popstate", confirmBrowserBack, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      window.removeEventListener("popstate", confirmBrowserBack, true);
    };
  }, [answers]);

  const setAnswer = (id: string, value: Answer) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setError("");
  };

  const toggleChoice = (question: Question, option: string) => {
    const current = (answers[question.id] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : question.max && current.length >= question.max ? current : [...current, option];
    setAnswer(question.id, next);
  };

  const handleNext = () => {
    const answer = answers[question.id];
    const isMissing = question.required && (Array.isArray(answer) ? answer.length === 0 : !String(answer ?? "").trim());
    if (isMissing) {
      setError(`Please answer “${question.title.replace(/\s*\(.*?\)$/, "") }” to continue.`);
      return;
    }
    if (step < questionSteps.length - 1) setStep((current) => current + 1);
    else onComplete(answers);
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id];
    const hasOtherChoice = Array.isArray(value) ? value.includes("Other") : value === "Other";
    return (
      <fieldset className={styles.question} key={question.id}>
        <legend>{question.title}{question.required && <span className={styles.required}> *</span>}</legend>
        {question.type === "multi" && <p className={styles.hint}>{question.max ? `Choose up to ${question.max}` : "Choose all that apply"}</p>}
        {(question.type === "select" || question.type === "multi") && <div className={styles.options}>
          {question.options?.map((option) => {
            const isMulti = question.type === "multi";
            const checked = isMulti ? ((value as string[] | undefined) ?? []).includes(option) : value === option;
            const disabled = Boolean(isMulti && question.max && !checked && ((value as string[] | undefined) ?? []).length >= question.max);
            return <label className={`${styles.option} ${checked ? styles.selected : ""} ${disabled ? styles.disabled : ""}`} key={option}>
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={question.id}
                checked={checked}
                disabled={disabled}
                onChange={() => isMulti ? toggleChoice(question, option) : setAnswer(question.id, option)}
              />
              <span>{option}</span>
            </label>;
          })}
        </div>}
        {question.type === "text" && <>
          <input className={styles.textInput} list="study-subjects" value={(value as string) ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setAnswer(question.id, event.target.value)} placeholder={question.hint} />
          <datalist id="study-subjects">{["Data Structures", "DBMS", "Python", "Mathematics", "Web Development", "Operating Systems"].map((subject) => <option key={subject} value={subject} />)}</datalist>
        </>}
        {question.type === "date" && <input className={styles.textInput} type="date" value={(value as string) ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setAnswer(question.id, event.target.value)} />}
        {question.options?.includes("Other") && hasOtherChoice && <input className={styles.otherInput} value={(answers[`${question.id}Other`] as string) ?? ""} onChange={(event) => setAnswer(`${question.id}Other`, event.target.value)} placeholder={question.id === "languages" ? "Add another language" : "Tell us a little more"} aria-label={`Specify other ${question.title}`} />}
        {question.id === "times" && ((value as string[] | undefined) ?? []).includes("Other / custom time") && <input className={styles.otherInput} value={(answers.timesOther as string) ?? ""} onChange={(event) => setAnswer("timesOther", event.target.value)} placeholder="Add a preferred time range" aria-label="Custom time range" />}
      </fieldset>
    );
  };

  return <main className={styles.page}>
    <header className={styles.pageHeader}>
      <button type="button" className={styles.backLink} onClick={onBack}><span aria-hidden="true">←</span> Back to dashboard</button>
      <span className={styles.brand}>Study<span>Buddy</span></span>
    </header>
    <div className={styles.pageIntro}><span className={styles.pageBadge}>STUDY PREFERENCES</span><h1>Find your study partner</h1><p>{spaceTitle ? `A few quick questions for ${spaceTitle}.` : "A few quick questions to find your best match."} Your progress is saved as you go.</p></div>
    <section className={styles.wizard} aria-label="Study partner questionnaire">
      <div className={styles.progressHeader}><span>Question {step + 1} of {questionSteps.length}</span><span>{Math.round(((step + 1) / questionSteps.length) * 100)}% complete</span></div>
      <div className={styles.progressTrack}><span style={{ width: `${((step + 1) / questionSteps.length) * 100}%` }} /></div>
      <div className={styles.steps} aria-label="Questionnaire sections">{sections.map((item, index) => <span className={`${styles.stepDot} ${index <= sectionIndex ? styles.stepActive : ""}`} key={item.title} title={item.title} />)}</div>
      <div className={styles.sectionHeading}><span className={styles.sectionEyebrow}>SECTION {String.fromCharCode(65 + sectionIndex)}</span><h3>{section.title}</h3><p>{section.description}</p></div>
      <div className={styles.questions}>{renderQuestion(question)}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.footer}><span className={styles.timeHint}>About 4–6 minutes · Your preferences help improve matches</span><div className={styles.actions}>
        {step > 0 && <button className={styles.backButton} type="button" onClick={() => { setError(""); setStep((current) => current - 1); }}>Previous</button>}
        <button className={styles.nextButton} type="button" onClick={handleNext}>{step === questionSteps.length - 1 ? "See study partners" : "Next question"}<span aria-hidden="true">→</span></button>
      </div></div>
    </section>
  </main>;
};

export default PartnerQuestionnaire;
