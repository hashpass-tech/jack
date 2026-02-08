/**
 * App — Main Video Recorder application
 *
 * Standalone SPA for:
 * - Real-time AI avatar interaction (Gabber + MatureMaleSerious voice)
 * - Recording sessions with procedural JACK avatar
 * - Scene management: Intro → Dashboard walkthrough → End Card
 * - Export to Remotion for final rendering
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import GabberLiveSession from "./components/GabberLiveSession";
import JackProceduralAvatar from "./components/JackProceduralAvatar";
import RecorderControls from "./components/RecorderControls";

const SCENES = [
  "Intro",
  "Dashboard: Create Intent",
  "Dashboard: Executions",
  "Dashboard: Agent & Costs",
  "End Card",
];

const App: React.FC = () => {
  const [view, setView] = useState<"recorder" | "live">("recorder");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScene, setCurrentScene] = useState(SCENES[0]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState("sil");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const handlePauseRecording = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0A0A0A",
        color: "#FFF",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top navigation */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid #1A1A1A",
          background: "#0D0D0D",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#00D4AA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              color: "#000",
            }}
          >
            J
          </div>
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            JACK Video Recorder
          </span>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
            MatureMaleSerious
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setView("recorder")}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: view === "recorder" ? "#00D4AA" : "#333",
              background: view === "recorder" ? "#00D4AA22" : "transparent",
              color: view === "recorder" ? "#00D4AA" : "#888",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recorder
          </button>
          <button
            onClick={() => setView("live")}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: view === "live" ? "#0C85F3" : "#333",
              background: view === "live" ? "#0C85F322" : "transparent",
              color: view === "live" ? "#0C85F3" : "#888",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Live AI Avatar
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#555" }}>
          Remotion + Three.js + Gabber
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {view === "live" ? (
          /* ── Live AI Session (Gabber + Procedural Avatar) ── */
          <GabberLiveSession
            backgroundColor="#0A0A0A"
            showControls={true}
          />
        ) : (
          /* ── Recorder view with preview ── */
          <div style={{ height: "100%", position: "relative" }}>
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0A0A0A",
              }}
            >
              <div
                style={{
                  width: "min(85vh, 85vw)",
                  height: "min(85vh, 85vw)",
                  maxWidth: 800,
                  maxHeight: 800,
                  background: "#111",
                  borderRadius: 12,
                  border: isRecording ? "2px solid #FF4444" : "1px solid #222",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Procedural JACK avatar as recording preview */}
                <JackProceduralAvatar
                  isSpeaking={isSpeaking}
                  currentViseme={currentViseme}
                  backgroundColor="#0A0A0A"
                />

                {/* Scene label overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    padding: "6px 12px",
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: 6,
                    border: "1px solid #333",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#00D4AA", fontWeight: 600 }}>
                    SCENE
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {currentScene}
                  </div>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      background: "rgba(255,0,0,0.2)",
                      borderRadius: 12,
                      border: "1px solid #FF4444",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isPaused ? "#FFBD2E" : "#FF4444",
                        animation: isPaused ? "none" : "pulse 1s infinite",
                      }}
                    />
                    <span style={{ fontSize: 12, color: isPaused ? "#FFBD2E" : "#FF4444", fontFamily: "monospace" }}>
                      {isPaused ? "PAUSED" : "REC"} {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                )}

                {/* Bottom prompt */}
                {!isRecording && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 80,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      color: "#555",
                      fontSize: 13,
                    }}
                  >
                    Press record to begin • Use <b>Live AI Avatar</b> tab for real-time session
                  </div>
                )}

                {/* Recorder controls overlay */}
                <RecorderControls
                  isRecording={isRecording}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  onPauseRecording={handlePauseRecording}
                  isPaused={isPaused}
                  currentScene={currentScene}
                  scenes={SCENES}
                  onSceneChange={setCurrentScene}
                  isSpeaking={isSpeaking}
                  currentViseme={currentViseme}
                  recordingTime={recordingTime}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default App;
