import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle, Mic, MicOff, Phone, PhoneOff, Video } from "../common/StudySpaceIcon";
import type { StudyRoom, StudyRoomSignal } from "../../types/dashboard";
import { studyBuddyApi } from "../../api/studyBuddy";
import styles from "./StudyVideoRoomModal.module.css";

interface StudyVideoRoomModalProps {
  isOpen: boolean;
  spaceId: string;
  currentUserId: number;
  partnerName: string;
  onClose: () => void;
  onRoomChanged: () => void;
}

type CallPhase = "loading" | "lobby" | "connecting" | "connected" | "ended" | "error";

const StudyVideoRoomModal = ({ isOpen, spaceId, currentUserId, partnerName, onClose, onRoomChanged }: StudyVideoRoomModalProps) => {
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [phase, setPhase] = useState<CallPhase>("loading");
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const roomRef = useRef<StudyRoom | null>(null);
  const lastSignalIdRef = useRef(0);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const processingRef = useRef(false);
  const phaseRef = useRef<CallPhase>("loading");

  const changePhase = (value: CallPhase) => {
    phaseRef.current = value;
    setPhase(value);
  };

  const cleanupMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    changePhase("loading");
    setError("");
    setElapsed(0);
    setRoom(null);
    roomRef.current = null;
    lastSignalIdRef.current = 0;
    studyBuddyApi.getActiveVideoRoom(spaceId)
      .then((activeRoom) => {
        if (!mounted) return;
        setRoom(activeRoom);
        roomRef.current = activeRoom;
        changePhase("lobby");
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load the video room.");
        changePhase("error");
      });
    return () => {
      mounted = false;
      cleanupMedia();
    };
  }, [cleanupMedia, isOpen, spaceId]);

  useEffect(() => {
    if (!isOpen || phase !== "connected") return;
    const interval = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, phase]);

  useEffect(() => {
    if (!localVideoRef.current || !localStreamRef.current) return;
    localVideoRef.current.srcObject = localStreamRef.current;
  }, [phase]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const flushPendingIce = async (peer: RTCPeerConnection) => {
    if (!peer.remoteDescription) return;
    const candidates = pendingIceRef.current.splice(0);
    for (const candidate of candidates) {
      try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (candidateError) { console.warn("Could not apply remote ICE candidate:", candidateError); }
    }
  };

  const processSignal = async (signal: StudyRoomSignal, peer: RTCPeerConnection) => {
    if (signal.kind === "end") {
      cleanupMedia();
      changePhase("ended");
      onRoomChanged();
      return;
    }

    if (signal.kind === "offer" && peer.signalingState === "stable") {
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as unknown as RTCSessionDescriptionInit));
      await flushPendingIce(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      const currentRoom = roomRef.current;
      if (currentRoom) await studyBuddyApi.sendVideoSignal(currentRoom.id, "answer", answer as unknown as Record<string, unknown>);
      return;
    }

    if (signal.kind === "answer" && peer.signalingState === "have-local-offer") {
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as unknown as RTCSessionDescriptionInit));
      await flushPendingIce(peer);
      changePhase("connecting");
      return;
    }

    if (signal.kind === "ice_candidate") {
      const candidate = signal.payload as RTCIceCandidateInit;
      if (peer.remoteDescription) await peer.addIceCandidate(new RTCIceCandidate(candidate));
      else pendingIceRef.current.push(candidate);
    }
  };

  const startOrJoin = async () => {
    setError("");
    changePhase("connecting");
    try {
      let selectedRoom = roomRef.current;
      if (!selectedRoom) {
        const started = await studyBuddyApi.startVideoRoom(spaceId);
        selectedRoom = started.room;
        roomRef.current = selectedRoom;
        setRoom(selectedRoom);
      }
      const initiator = selectedRoom.initiatorId === currentUserId;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => {
        const [streamWithPartner] = event.streams;
        if (streamWithPartner) setRemoteStream(streamWithPartner);
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && roomRef.current) {
          void studyBuddyApi.sendVideoSignal(
            roomRef.current.id,
            "ice_candidate",
            event.candidate.toJSON() as unknown as Record<string, unknown>,
          ).catch((signalError) => setError(signalError instanceof Error ? signalError.message : "Could not send connection data."));
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") changePhase("connected");
        if (peer.connectionState === "failed") setError("The direct video connection failed. Check your network and try again.");
      };

      if (initiator) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await studyBuddyApi.sendVideoSignal(selectedRoom.id, "offer", offer as unknown as Record<string, unknown>);
      } else {
        const initial = await studyBuddyApi.getVideoSignals(selectedRoom.id, 0);
        const offer = initial.signals.find((signal) => signal.kind === "offer");
        if (!offer) throw new Error("Your partner has not sent a call offer yet. Ask them to start the call again.");
        for (const signal of initial.signals) {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, signal.id);
          if (signal.id >= offer.id) await processSignal(signal, peer);
        }
      }
      changePhase("connecting");
    } catch (callError) {
      cleanupMedia();
      setError(callError instanceof Error ? callError.message : "Unable to start the video call. Allow camera and microphone access.");
      changePhase("error");
    }
  };

  useEffect(() => {
    if (!isOpen || !room || !peerRef.current || processingRef.current || phase === "ended") return;
    let active = true;
    const pollSignals = async () => {
      if (!active || processingRef.current || !roomRef.current || !peerRef.current) return;
      processingRef.current = true;
      try {
        const result = await studyBuddyApi.getVideoSignals(roomRef.current.id, lastSignalIdRef.current);
        for (const signal of result.signals) {
          if (!active) break;
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, signal.id);
          await processSignal(signal, peerRef.current!);
        }
        if (result.roomStatus === "ended" && phaseRef.current !== "ended") {
          cleanupMedia();
          changePhase("ended");
          onRoomChanged();
        }
      } catch (pollError) {
        console.warn("Video room signaling poll failed:", pollError);
      } finally {
        processingRef.current = false;
      }
    };
    void pollSignals();
    const intervalId = window.setInterval(() => void pollSignals(), 1200);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [cleanupMedia, isOpen, onRoomChanged, phase, room]);

  const endCall = async () => {
    const currentRoom = roomRef.current;
    if (currentRoom?.status === "active") {
      try { await studyBuddyApi.sendVideoSignal(currentRoom.id, "end"); }
      catch (endError) { console.warn("Could not notify your partner that the call ended:", endError); }
    }
    cleanupMedia();
    changePhase("ended");
    onRoomChanged();
  };

  const formatElapsed = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <section className={styles.modalCard} role="dialog" aria-label="Study Video Room">
        <header className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIconBadge}><Video className="h-5 w-5" /></span>
            <div>
              <h2 className={styles.headerTitle}>Study Room Call</h2>
              <p className={styles.headerSubtitle}>Studying with {partnerName}</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {phase === "connected" && <span className={styles.callTimer}>{formatElapsed(elapsed)}</span>}
            <button type="button" onClick={() => void endCall()} className={styles.closeBtn} aria-label="Close call">
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </header>

        {phase === "loading" ? (
          <div className={styles.centerBox}>
            <LoaderCircle className="h-8 w-8 animate-spin text-orange-400" />
            <p style={{ marginTop: 12, color: "#9ca3af", fontSize: 13 }}>Connecting to study space…</p>
          </div>
        ) : phase === "lobby" || phase === "error" ? (
          <div className={styles.centerBox}>
            <div className={styles.lobbyIcon}>
              <Video className="h-8 w-8" />
            </div>
            <h3 className={styles.lobbyTitle}>
              {room ? "Your partner started a study call" : "Start a Live Video Study Session"}
            </h3>
            <p className={styles.lobbyDesc}>
              Study together face-to-face just like Google Meet. Grant camera and microphone permissions when prompted to connect directly with your study partner.
            </p>
            {error && <div className={styles.errorBox} role="alert">{error}</div>}
            <button type="button" onClick={() => void startOrJoin()} className={styles.startCallBtn}>
              <Phone className="h-4 w-4" /> {room ? (room.initiatorId === currentUserId ? "Reconnect to Room" : "Join Study Call") : "Start Study Call"}
            </button>
          </div>
        ) : phase === "ended" ? (
          <div className={styles.centerBox}>
            <div className={styles.lobbyIcon} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <PhoneOff className="h-8 w-8" />
            </div>
            <h3 className={styles.lobbyTitle}>Study Call Ended</h3>
            <p className={styles.lobbyDesc}>The live video study session has ended for both partners.</p>
            <button type="button" onClick={onClose} className={styles.startCallBtn} style={{ background: "#374151" }}>
              Back to Study Space
            </button>
          </div>
        ) : (
          <>
            <div className={styles.videoGrid}>
              <div className={styles.videoTile}>
                <video ref={remoteVideoRef} autoPlay playsInline className={styles.videoElement} />
                {!remoteStream && (
                  <div className={styles.videoWaitingText}>
                    <LoaderCircle className="h-6 w-6 animate-spin text-orange-400" style={{ marginBottom: 8 }} />
                    <span>Connecting with {partnerName}…</span>
                  </div>
                )}
                <span className={styles.videoParticipantTag}>{partnerName}</span>
              </div>
              <div className={styles.videoTile}>
                <video ref={localVideoRef} autoPlay playsInline muted className={styles.videoElement} />
                <span className={styles.videoParticipantTag}>You (Me)</span>
              </div>
            </div>
            <footer className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => {
                  localStreamRef.current?.getAudioTracks().forEach((track) => {
                    track.enabled = !microphoneOn;
                  });
                  setMicrophoneOn((value) => !value);
                }}
                className={`${styles.controlCircleBtn} ${microphoneOn ? styles.controlBtnActive : styles.controlBtnMuted}`}
                title={microphoneOn ? "Mute Microphone" : "Unmute Microphone"}
                aria-label={microphoneOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {microphoneOn ? <Mic /> : <MicOff />}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStreamRef.current?.getVideoTracks().forEach((track) => {
                    track.enabled = !cameraOn;
                  });
                  setCameraOn((value) => !value);
                }}
                className={`${styles.controlCircleBtn} ${cameraOn ? styles.controlBtnActive : styles.controlBtnMuted}`}
                title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
                aria-label={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {cameraOn ? <Camera /> : <CameraOff />}
              </button>
              <button type="button" onClick={() => void endCall()} className={styles.hangUpBtn}>
                <PhoneOff className="h-5 w-5" /> Leave Call
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

export default StudyVideoRoomModal;
