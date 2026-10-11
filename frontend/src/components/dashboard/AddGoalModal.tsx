import React, { useState } from "react";
import Modal from "../common/Modal";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: {
    title: string;
    subject: string;
    goal: string;
    schedule: string;
    duration: string;
    learningStyle: string;
  }) => void;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    goal: "",
    schedule: "Evenings 7:00 PM - 9:00 PM",
    duration: "60 mins",
    learningStyle: "Pomodoro Focus",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.goal.trim()) return;

    onSubmit({
      ...formData,
      subject: formData.subject.trim() || formData.title.trim(),
    });

    setFormData({
      title: "",
      subject: "",
      goal: "",
      schedule: "Evenings 7:00 PM - 9:00 PM",
      duration: "60 mins",
      learningStyle: "Pomodoro Focus",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="+ Add a Study Goal"
      subtitle="Create a dedicated study space to track progress and find matching partners."
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
            Goal Title / Focus *
          </label>
          <input
            type="text"
            placeholder="e.g., Learn Python, DBMS Exam Prep, GATE Mathematics"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            style={{
              width: "100%",
              background: "#faf7f5",
              border: "1.5px solid #ece7e3",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
            Subject / Course *
          </label>
          <input
            type="text"
            placeholder="e.g., Computer Science, Database Systems, Web Development"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            style={{
              width: "100%",
              background: "#faf7f5",
              border: "1.5px solid #ece7e3",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
            Specific Target / Objective *
          </label>
          <textarea
            placeholder="e.g., Complete Python fundamentals and solve 30 LeetCode questions together."
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            required
            style={{
              width: "100%",
              background: "#faf7f5",
              border: "1.5px solid #ece7e3",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
              minHeight: "80px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
            Preferred Schedule
          </label>
          <input
            type="text"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            style={{
              width: "100%",
              background: "#faf7f5",
              border: "1.5px solid #ece7e3",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
            Session Duration & Style
          </label>
          <select
            value={formData.learningStyle}
            onChange={(e) => setFormData({ ...formData, learningStyle: e.target.value })}
            style={{
              width: "100%",
              background: "#faf7f5",
              border: "1.5px solid #ece7e3",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            <option value="Pomodoro Focus">Pomodoro (25m Focus / 5m Break)</option>
            <option value="Silent Accountability">Silent Accountability</option>
            <option value="Active Problem Solving">Active Problem Solving & Discussion</option>
            <option value="Collaborative Pair Coding">Collaborative Pair Coding</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1.5px solid #ece7e3",
              padding: "11px 22px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#5f6c7b",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              background: "linear-gradient(135deg, #ff4b2b 0%, #ff6e40 100%)",
              color: "#ffffff",
              border: "none",
              padding: "11px 26px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(255, 75, 43, 0.28)",
              fontFamily: "inherit",
            }}
          >
            Create Study Space
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddGoalModal;

