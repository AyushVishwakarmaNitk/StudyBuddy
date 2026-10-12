import { useState } from "react";
import type { FormEvent } from "react";
import Modal from "../common/Modal";

interface GoalForm {
  title: string;
  subject: string;
  goal: string;
}

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: GoalForm) => void;
}

const emptyForm: GoalForm = { title: "", subject: "", goal: "" };
const fieldStyle = {
  boxSizing: "border-box" as const,
  width: "100%",
  border: "1.5px solid #ece7e3",
  borderRadius: "12px",
  padding: "12px 14px",
  background: "#faf7f5",
  color: "#1e242b",
  font: "inherit",
  fontSize: "13px",
};

const AddGoalModal = ({ isOpen, onClose, onSubmit }: AddGoalModalProps) => {
  const [form, setForm] = useState<GoalForm>(emptyForm);

  const updateField = (field: keyof GoalForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const goal = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      goal: form.goal.trim(),
    };
    if (!goal.title || !goal.subject || !goal.goal) return;
    onSubmit(goal);
    setForm(emptyForm);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a Study Goal" subtitle="Set a focus for your next study space.">
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <label style={{ display: "grid", gap: "7px", fontSize: "12.5px", fontWeight: 700 }}>
          Goal title *
          <input autoFocus value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g., Prepare for my DBMS exam" required maxLength={80} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: "7px", fontSize: "12.5px", fontWeight: 700 }}>
          Course or subject *
          <input value={form.subject} onChange={(event) => updateField("subject", event.target.value)} placeholder="e.g., Database Management Systems" required maxLength={80} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: "7px", fontSize: "12.5px", fontWeight: 700 }}>
          About this goal *
          <textarea value={form.goal} onChange={(event) => updateField("goal", event.target.value)} placeholder="What would you like to accomplish?" required maxLength={500} rows={4} style={{ ...fieldStyle, resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
          <button type="button" onClick={onClose} style={{ border: "1.5px solid #ece7e3", borderRadius: "20px", padding: "10px 20px", background: "white", color: "#5f6c7b", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ border: 0, borderRadius: "20px", padding: "10px 22px", background: "linear-gradient(135deg, #ff4b2b, #ff6e40)", color: "white", fontWeight: 700, cursor: "pointer" }}>Create Study Goal</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddGoalModal;
