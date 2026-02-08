/**
 * RecorderControls — UI overlay for the recording interface
 *
 * Provides:
 * - Record/Stop/Pause buttons
 * - Scene selection
 * - Connection status
 * - Viseme indicator
 */
import React, { useState, useCallback } from "react";

interface RecorderControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  isPaused: boolean;
  currentScene: string;
  scenes: string[];
  onSceneChange: (scene: string) => void;
  isSpeaking: boolean;
  currentViseme: string;
  recordingTime: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const RecorderControls: React.FC<RecorderControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  isPaused,
  currentScene,
  scenes,
  onSceneChange,
  isSpeaking,
  currentViseme,
  recordingTime,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
        padding: "40px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Scene selector */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {scenes.map((scene) => (
          <button
            key={scene}
            onClick={() => onSceneChange(scene)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: currentScene === scene ? "#00D4AA" : "#333",
              background: currentScene === scene ? "#00D4AA22" : "#111",
              color: currentScene === scene ? "#00D4AA" : "#888",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {scene}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Recording time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 100,
          }}
        >
          {isRecording && (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isPaused ? "#FFA500" : "#FF0000",
                animation: isPaused ? "none" : "pulse 1s infinite",
              }}
            />
          )}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 18,
              fontWeight: 700,
              color: isRecording ? "#FF4444" : "#666",
            }}
          >
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Record/Stop/Pause */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!isRecording ? (
            <button
              onClick={onStartRecording}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "3px solid #FF4444",
                background: "#FF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#FFF",
                }}
              />
            </button>
          ) : (
            <>
              <button
                onClick={onPauseRecording}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "2px solid #FFA500",
                  background: isPaused ? "#FFA500" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: isPaused ? "#000" : "#FFA500", fontSize: 18 }}>
                  {isPaused ? "▶" : "⏸"}
                </span>
              </button>
              <button
                onClick={onStopRecording}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid #FF4444",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    background: "#FF4444",
                  }}
                />
              </button>
            </>
          )}
        </div>

        {/* Viseme status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 100,
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isSpeaking ? "#00D4AA" : "#333",
              transition: "background 0.15s",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#666",
            }}
          >
            {currentViseme.toUpperCase()}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default RecorderControls;
