/**
 * VRMAvatarDemo — Gabber SDK integration for real-time AI avatar
 *
 * Handles:
 * - Connecting to Gabber real-time AI backend
 * - Publishing microphone audio
 * - Subscribing to AI audio output
 * - Subscribing to live viseme stream for lip-sync
 * - Controls UI for connect/disconnect and mic toggle
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import VRMScene from "./VRMScene";
import {
  GABBER_API_URL,
  GABBER_RUN_ID,
  visemeAvatarGraph,
} from "../../config/gabber";

export interface VRMAvatarDemoProps {
  /** Gabber API URL override */
  apiUrl?: string;
  /** Gabber run ID override */
  runId?: string;
  /** VRM model path */
  modelPath?: string;
  /** Animation path */
  animationPath?: string;
}

/**
 * Generates a user token for Gabber authentication.
 * In production, this should call your backend.
 */
async function generateUserToken(apiUrl: string): Promise<{ token: string }> {
  try {
    const response = await fetch(`${apiUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "user" }),
    });
    return response.json();
  } catch (err) {
    console.error("Failed to generate token:", err);
    return { token: "" };
  }
}

const VRMAvatarDemo: React.FC<VRMAvatarDemoProps> = ({
  apiUrl = GABBER_API_URL,
  runId = GABBER_RUN_ID,
  modelPath,
  animationPath,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState("sil");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to connect");

  const audioOutputRef = useRef<HTMLAudioElement>(null);
  const visemeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  /**
   * Connect to Gabber AI backend
   */
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setStatusMessage("Connecting to AI backend...");

    try {
      // Get authentication token
      const { token: userToken } = await generateUserToken(apiUrl);

      if (!userToken) {
        throw new Error("Failed to obtain authentication token");
      }

      // Start the graph run
      const response = await fetch(`${apiUrl}/app/run_from_graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          run_id: runId,
          graph: visemeAvatarGraph,
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph start failed: ${response.status}`);
      }

      const data = await response.json();
      const connectionDetails = data.connection_details;

      if (!connectionDetails) {
        throw new Error("No connection details returned");
      }

      // Set up WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: connectionDetails.iceServers || [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // Handle incoming audio track (AI voice output)
      pc.ontrack = (event) => {
        if (event.track.kind === "audio" && audioOutputRef.current) {
          const stream = new MediaStream([event.track]);
          audioOutputRef.current.srcObject = stream;
          audioOutputRef.current.play().catch(console.error);
          setStatusMessage("AI audio connected");
        }
      };

      // Handle data channel for visemes
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        if (channel.label === "viseme") {
          channel.onmessage = (msgEvent) => {
            try {
              const visemeData = JSON.parse(msgEvent.data);
              const visemeShape = visemeData?.value || visemeData;

              if (visemeShape) {
                setCurrentViseme(
                  typeof visemeShape === "string" ? visemeShape : "sil",
                );
                setIsSpeaking(true);

                // Auto-reset to silence after 300ms of no viseme data
                if (visemeTimeoutRef.current) {
                  clearTimeout(visemeTimeoutRef.current);
                }
                visemeTimeoutRef.current = setTimeout(() => {
                  setCurrentViseme("sil");
                  setIsSpeaking(false);
                }, 300);
              }
            } catch {
              // Ignore parse errors
            }
          };
        }
      };

      setIsConnected(true);
      setStatusMessage("Connected — Avatar ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setStatusMessage(`Error: ${message}`);
      console.error("Connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [apiUrl, runId]);

  /**
   * Disconnect and clean up all resources
   */
  const handleDisconnect = useCallback(async () => {
    try {
      // Stop microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Clear viseme timeout
      if (visemeTimeoutRef.current) {
        clearTimeout(visemeTimeoutRef.current);
        visemeTimeoutRef.current = null;
      }

      setIsConnected(false);
      setIsMicOn(false);
      setIsSpeaking(false);
      setCurrentViseme("sil");
      setStatusMessage("Disconnected");
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }, []);

  /**
   * Toggle microphone input
   */
  const toggleMicrophone = useCallback(async () => {
    if (!isConnected) return;

    if (isMicOn) {
      // Turn off mic
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setIsMicOn(false);
      setStatusMessage("Microphone off");
    } else {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        // Add audio track to peer connection
        if (peerConnectionRef.current) {
          stream.getAudioTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, stream);
          });
        }

        setIsMicOn(true);
        setStatusMessage("Microphone active — Speak to the avatar");
      } catch (err) {
        console.error("Microphone error:", err);
        setError("Failed to access microphone");
      }
    }
  }, [isConnected, isMicOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visemeTimeoutRef.current) clearTimeout(visemeTimeoutRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0A0A0A",
        color: "#FFFFFF",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 3D Avatar Viewport */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 400,
        }}
      >
        <VRMScene
          isSpeaking={isSpeaking}
          currentViseme={currentViseme}
          modelPath={modelPath}
          animationPath={animationPath}
        />

        {/* Viseme indicator overlay */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: isSpeaking ? "#00D4AA" : "#444",
              transition: "background-color 0.15s",
            }}
          />
          <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>
            {currentViseme.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderTop: "1px solid #222",
          background: "#111",
        }}
      >
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: isConnected ? "#FF4444" : "#00D4AA",
            color: isConnected ? "#FFF" : "#000",
            fontWeight: 600,
            fontSize: 14,
            cursor: isConnecting ? "wait" : "pointer",
            opacity: isConnecting ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {isConnecting
            ? "Connecting..."
            : isConnected
              ? "Disconnect"
              : "Connect AI"}
        </button>

        <button
          onClick={toggleMicrophone}
          disabled={!isConnected}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid #333",
            background: isMicOn ? "#0C85F3" : "#222",
            color: "#FFF",
            fontWeight: 600,
            fontSize: 14,
            cursor: isConnected ? "pointer" : "not-allowed",
            opacity: isConnected ? 1 : 0.4,
            transition: "all 0.2s",
          }}
        >
          {isMicOn ? "🎤 Mic On" : "🎤 Mic Off"}
        </button>

        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: error ? "#FF6B6B" : "#666",
            textAlign: "right",
          }}
        >
          {error || statusMessage}
        </span>
      </div>

      {/* Hidden audio element for AI voice playback */}
      <audio ref={audioOutputRef} style={{ display: "none" }} />
    </div>
  );
};

export default VRMAvatarDemo;
