/**
 * GabberLiveSession — Real-time AI avatar session using Gabber SDK
 *
 * Uses the procedural JACK avatar (no VRM file needed) with:
 * - Gabber WebRTC connection for voice AI
 * - MatureMaleSerious voice (African American Man)
 * - Live viseme-driven lip-sync
 * - Microphone input for conversation
 * - Dashboard walkthrough system prompt
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import JackProceduralAvatar from "./JackProceduralAvatar";
import {
  GABBER_API_KEY,
  GABBER_API_URL,
  GABBER_RUN_ID,
  GABBER_WEBHOOK_URL,
  visemeAvatarGraph,
  generateGabberToken,
} from "../../config/gabber";

export interface GabberLiveSessionProps {
  /** Override the background color */
  backgroundColor?: string;
  /** Show the controls panel */
  showControls?: boolean;
  /** Canvas dimensions (for Remotion) */
  width?: number;
  height?: number;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

const GabberLiveSession: React.FC<GabberLiveSessionProps> = ({
  backgroundColor = "#0A0A0A",
  showControls = true,
  width,
  height,
  autoConnect = false,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState("sil");
  const [isMicOn, setIsMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const visemeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // ── Connect to Gabber ──
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setError(null);
    setStatus("Authenticating...");

    try {
      // 1. Get token
      const token = await generateGabberToken();
      if (!token) throw new Error("No token returned");

      setStatus("Starting AI session...");

      // 2. Start graph run
      const res = await fetch(`${GABBER_API_URL}/app/run_from_graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          run_id: GABBER_RUN_ID,
          graph: visemeAvatarGraph,
          webhook_url: GABBER_WEBHOOK_URL,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Graph start failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      const connDetails = data.connection_details;
      if (!connDetails) throw new Error("No WebRTC connection details");

      setStatus("Establishing WebRTC...");

      // 3. WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: connDetails.iceServers || [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      // Handle incoming AI audio
      pc.ontrack = (ev) => {
        if (ev.track.kind === "audio" && audioRef.current) {
          audioRef.current.srcObject = new MediaStream([ev.track]);
          audioRef.current.play().catch(console.error);
          setStatus("AI voice connected");
        }
      };

      // Handle viseme data channel
      pc.ondatachannel = (ev) => {
        const ch = ev.channel;
        if (ch.label === "viseme") {
          ch.onmessage = (msg) => {
            try {
              const raw = JSON.parse(msg.data);
              const v = raw?.value || raw?.viseme || raw;
              if (typeof v === "string") {
                setCurrentViseme(v);
                setIsSpeaking(true);
                if (visemeTimerRef.current) clearTimeout(visemeTimerRef.current);
                visemeTimerRef.current = setTimeout(() => {
                  setCurrentViseme("sil");
                  setIsSpeaking(false);
                }, 300);
              }
            } catch {
              /* ignore */
            }
          };
        }
        if (ch.label === "transcript") {
          ch.onmessage = (msg) => {
            try {
              const t = JSON.parse(msg.data);
              if (t?.text) {
                setTranscript((prev) => [...prev.slice(-20), t.text]);
              }
            } catch {
              /* ignore */
            }
          };
        }
      };

      // Handle SDP/ICE exchange
      if (connDetails.offer) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(connDetails.offer),
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer back
        await fetch(`${GABBER_API_URL}/app/webrtc/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            run_id: GABBER_RUN_ID,
            answer: pc.localDescription,
          }),
        });
      }

      setIsConnected(true);
      setStatus("Connected — JACK is ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setStatus(`Error: ${msg}`);
      console.error("[GabberLiveSession] connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (visemeTimerRef.current) clearTimeout(visemeTimerRef.current);
    setIsConnected(false);
    setIsMicOn(false);
    setIsSpeaking(false);
    setCurrentViseme("sil");
    setTranscript([]);
    setStatus("Disconnected");
  }, []);

  // ── Toggle Mic ──
  const toggleMic = useCallback(async () => {
    if (!isConnected || !pcRef.current) return;
    if (isMicOn) {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setIsMicOn(false);
      setStatus("Mic off");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        mediaStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          pcRef.current?.addTrack(track, stream);
        });
        setIsMicOn(true);
        setStatus("Mic on — Talk to JACK");
      } catch (err) {
        setError("Microphone access denied");
      }
    }
  }, [isConnected, isMicOn]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect) connect();
    return () => disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
        background: backgroundColor,
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Avatar viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <JackProceduralAvatar
          isSpeaking={isSpeaking}
          currentViseme={currentViseme}
          backgroundColor={backgroundColor}
          width={width}
          height={height ? height - (showControls ? 120 : 0) : undefined}
        />

        {/* Viseme/speaking indicator */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isSpeaking ? "#00D4AA" : "#444",
              boxShadow: isSpeaking ? "0 0 8px #00D4AA" : "none",
              transition: "all 0.15s",
            }}
          />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#888" }}>
            {currentViseme.toUpperCase()}
          </span>
        </div>

        {/* Live transcript overlay */}
        {transcript.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              maxHeight: 80,
              overflow: "hidden",
              background: "rgba(0,0,0,0.7)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "#ccc",
              lineHeight: 1.4,
            }}
          >
            {transcript.slice(-3).join(" ")}
          </div>
        )}
      </div>

      {/* Controls bar */}
      {showControls && (
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderTop: "1px solid #222",
            background: "#111",
            flexShrink: 0,
          }}
        >
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: isConnected ? "#FF4444" : "#00D4AA",
              color: isConnected ? "#fff" : "#000",
              fontWeight: 600,
              fontSize: 13,
              cursor: isConnecting ? "wait" : "pointer",
              opacity: isConnecting ? 0.5 : 1,
            }}
          >
            {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect JACK AI"}
          </button>

          <button
            onClick={toggleMic}
            disabled={!isConnected}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "1px solid #333",
              background: isMicOn ? "#0C85F3" : "#222",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: isConnected ? "pointer" : "not-allowed",
              opacity: isConnected ? 1 : 0.4,
            }}
          >
            {isMicOn ? "Mic ON" : "Mic OFF"}
          </button>

          <div style={{ flex: 1 }} />

          <span
            style={{
              fontSize: 12,
              color: error ? "#FF6B6B" : "#555",
              fontFamily: "monospace",
            }}
          >
            {error || status}
          </span>
        </div>
      )}

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
};

export default GabberLiveSession;
