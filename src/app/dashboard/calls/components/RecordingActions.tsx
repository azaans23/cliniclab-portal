"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RetellCall } from "@/lib/supabase";

interface RecordingActionsProps {
  call: RetellCall;
}

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return "N/A";
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const RecordingActions = ({ call }: RecordingActionsProps) => {
  const [showTranscript, setShowTranscript] = useState(false);

  const handleDownload = () => {
    if (call.recording_url) {
      // Create a temporary link to download the file
      const link = document.createElement("a");
      link.href = call.recording_url;
      link.download = `call-${call.call_id}-recording.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

  const getCallerName = (call: RetellCall) => {
    const firstName = call.collected_dynamic_variables?.firstName;
    const lastName = call.collected_dynamic_variables?.lastName;

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    return "Anonymous";
  };

  const getPhoneNumber = (call: RetellCall): string => {
    // For inbound calls, show the caller's number (from_number)
    // For outbound calls, show the number being called (to_number)
    if (call.direction === "inbound") {
      return call.from_number || "N/A";
    } else {
      return call.to_number || "N/A";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Download Button */}
      {call.recording_url && (
        <Button
          onClick={handleDownload}
          size="sm"
          variant="ghost"
          className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
          title="Download recording"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </Button>
      )}

      {/* Transcript Button */}
      {call.transcript && (
        <Button
          onClick={handleTranscript}
          size="sm"
          variant="ghost"
          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
          title="View transcript"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </Button>
      )}

      {/* No recording or transcript available */}
      {!call.recording_url && !call.transcript && (
        <span className="text-xs text-neutral-500">No media</span>
      )}

      {/* Transcript Modal - Matching messages modal styling */}
      {showTranscript && call.transcript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Call Transcript</h2>
              <Button
                onClick={() => setShowTranscript(false)}
                variant="ghost"
                size="sm"
                className="text-neutral-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Caller Info */}
              <div className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-lg">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {getCallerName(call).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {getCallerName(call)}
                  </h3>
                  <p className="text-neutral-400">{getPhoneNumber(call)}</p>
                </div>
              </div>

              {/* Transcript Content */}
              <div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-3">
                  Transcript
                </h4>
                <div className="p-4 bg-neutral-800/30 rounded-lg border border-neutral-700">
                  <p className="text-white leading-relaxed whitespace-pre-wrap">
                    {call.transcript}
                  </p>
                </div>
              </div>

              {/* Call Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">
                    Call Date
                  </h4>
                  <p className="text-white">
                    {formatDate(call.start_timestamp)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">
                    Duration
                  </h4>
                  <p className="text-neutral-400">
                    {formatDuration(call.duration_ms)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800 flex-shrink-0">
              <Button
                onClick={() => setShowTranscript(false)}
                variant="outline"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(call.transcript || "");
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Transcript
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
