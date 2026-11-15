import React, { useState, useRef, useEffect } from "react";
import type { IncomingPartnerRequest, StudentNotification } from "../../types/dashboard";
import { studyBuddyApi } from "../../api/studyBuddy";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import styles from "./NotificationBell.module.css";

interface NotificationBellProps {
  requests: IncomingPartnerRequest[];
  notifications: StudentNotification[];
  onRequestActioned: () => void; // triggers dashboard refresh
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ requests, notifications, onRequestActioned }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<IncomingPartnerRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const count = requests.length + notifications.length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAccept = async (req: IncomingPartnerRequest) => {
    setActioningId(req.id);
    try {
      await studyBuddyApi.acceptPartnerRequest(req.id);
      const senderName = req.sender?.name || "Your new study partner";
      toast.success(`You and ${senderName} are now study partners! 🎉`, "Partner Matched!");
      onRequestActioned();
      setIsOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err, "Could not accept request");
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (req: IncomingPartnerRequest) => {
    setActioningId(req.id);
    try {
      await studyBuddyApi.declinePartnerRequest(req.id);
      toast.info("Partner request declined.", "Request Declined");
      onRequestActioned();
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err, "Could not decline request");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkRead = async (notification: StudentNotification) => {
    setActioningId(`notification-${notification.id}`);
    try {
      await studyBuddyApi.markNotificationRead(notification.id);
      onRequestActioned();
    } catch (err) {
      toast.error(err, "Could not update notification");
    } finally {
      setActioningId(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={bellRef}
        type="button"
        className={styles.notifBell}
        onClick={() => setIsOpen((v) => !v)}
        title={count > 0 ? `${count} partner request${count > 1 ? "s" : ""}` : "Notifications"}
        aria-label="Notifications"
      >
        🔔
        {count > 0 && (
          <span className={styles.notifBadge}>{count > 9 ? "9+" : count}</span>
        )}
      </button>

      {isOpen && (
        <div ref={panelRef} className={styles.notifPanel} role="dialog" aria-label="Notifications panel">
          <div className={styles.notifPanelHeader}>
            <span className={styles.notifPanelTitle}>
              Partner Requests {count > 0 && `(${count})`}
            </span>
            {count > 0 && (
              <button className={styles.notifMarkRead} onClick={() => setIsOpen(false)}>
                Close
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {requests.length === 0 && notifications.length === 0 ? (
              <div className={styles.notifEmpty}>
                <span className={styles.notifEmptyIcon}>🔔</span>
                <span>No pending partner requests</span>
              </div>
            ) : (
              <>
              {notifications.map((notification) => (
                <div key={`notification-${notification.id}`} className={styles.notifItem}>
                  <div className={styles.notifItemTitle}>{notification.title}</div>
                  <div className={styles.notifItemSubtitle}>{notification.message}</div>
                  <div className={styles.notifItemActions}>
                    <button
                      type="button"
                      className={styles.viewBtn}
                      onClick={() => handleMarkRead(notification)}
                      disabled={actioningId === `notification-${notification.id}`}
                    >
                      {actioningId === `notification-${notification.id}` ? "Updating…" : "Mark as read"}
                    </button>
                  </div>
                </div>
              ))}
              {requests.map((req) => {
                const senderName = req.sender?.name || "A student";
                const initials = getInitials(senderName);
                const isActioning = actioningId === req.id;

                return (
                  <div key={req.id} className={styles.notifItem}>
                    <div className={styles.notifItemHeader}>
                      <div className={styles.notifAvatar}>{initials}</div>
                      <div className={styles.notifItemContent}>
                        <div className={styles.notifItemTitle}>
                          {senderName} wants to study with you!
                        </div>
                        <div className={styles.notifItemSubtitle}>
                          For: <strong>{req.study_space_title || req.study_space_subject}</strong>
                        </div>
                        <div className={styles.notifTime}>{formatRelativeTime(req.created_at)}</div>
                      </div>
                      {req.compatibility_score > 0 && (
                        <span className={styles.notifCompatibility}>
                          {req.compatibility_score}%
                        </span>
                      )}
                    </div>

                    <div className={styles.notifItemActions}>
                      <button type="button" className={styles.viewBtn} onClick={() => setSelectedRequest(req)} disabled={isActioning}>
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>
      )}
      <Modal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title="Study partner request"
        subtitle={selectedRequest ? `${selectedRequest.sender?.name || "A student"} would like to study with you.` : undefined}
        badge="PARTNER REQUEST"
      >
        {selectedRequest && (
          <div className={styles.requestDetails}>
            <div className={styles.requestDetailRow}><span>Study goal</span><strong>{selectedRequest.study_space_title}</strong></div>
            <div className={styles.requestDetailRow}><span>Course or subject</span><strong>{selectedRequest.study_space_subject}</strong></div>
            <div className={styles.requestGoal}><span>About this goal</span><p>{selectedRequest.study_space_goal || "No additional goal details were provided."}</p></div>
            {selectedRequest.compatibility_score > 0 && <div className={styles.requestMatch}>{selectedRequest.compatibility_score}% compatibility match</div>}
            <div className={styles.requestDetailActions}>
              <button type="button" className={styles.declineBtn} onClick={() => handleDecline(selectedRequest)} disabled={actioningId === selectedRequest.id}>
                {actioningId === selectedRequest.id ? "Processing…" : "Decline"}
              </button>
              <button type="button" className={styles.acceptBtn} onClick={() => handleAccept(selectedRequest)} disabled={actioningId === selectedRequest.id}>
                {actioningId === selectedRequest.id ? "Processing…" : "Accept request"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationBell;
