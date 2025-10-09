"use client";

import { RetellCall } from "@/lib/supabase";
import { RecordingActions } from "./RecordingActions";

interface CallsTableProps {
  calls: RetellCall[];
  callType: "inbound" | "outbound";
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "ended":
      return "bg-green-500/20 text-green-400";
    case "ongoing":
      return "bg-blue-500/20 text-blue-400";
    case "error":
      return "bg-red-500/20 text-red-400";
    case "registered":
      return "bg-yellow-500/20 text-yellow-400";
    default:
      return "bg-neutral-500/20 text-neutral-400";
  }
};

// const formatDisconnectionReason = (reason?: string) => {
//   if (!reason) return "N/A";
//   return reason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
// };

// const getDisconnectionReasonColor = (reason?: string) => {
//   if (!reason) return "bg-neutral-500/20 text-neutral-400";

//   switch (reason) {
//     case "agent_hangup":
//       return "bg-green-500/20 text-green-400";
//     case "user_hangup":
//       return "bg-blue-500/20 text-blue-400";
//     case "call_failed":
//       return "bg-red-500/20 text-red-400";
//     case "no_answer":
//       return "bg-yellow-500/20 text-yellow-400";
//     case "call_transfer":
//       return "bg-purple-500/20 text-purple-400";
//     case "voicemail_reached":
//       return "bg-orange-500/20 text-orange-400";
//     case "inactivity":
//       return "bg-yellow-500/20 text-yellow-400";
//     case "max_duration_reached":
//       return "bg-red-500/20 text-red-400";
//     case "concurrency_limit_reached":
//       return "bg-red-500/20 text-red-400";
//     case "no_valid_payment":
//       return "bg-red-500/20 text-red-400";
//     case "scam_detected":
//       return "bg-red-500/20 text-red-400";
//     case "dial_busy":
//       return "bg-yellow-500/20 text-yellow-400";
//     case "dial_failed":
//       return "bg-red-500/20 text-red-400";
//     case "dial_no_answer":
//       return "bg-yellow-500/20 text-yellow-400";
//     case "invalid_destination":
//       return "bg-red-500/20 text-red-400";
//     case "telephony_provider_permission_denied":
//       return "bg-red-500/20 text-red-400";
//     case "telephony_provider_unavailable":
//       return "bg-red-500/20 text-red-400";
//     case "sip_routing_error":
//       return "bg-red-500/20 text-red-400";
//     case "marked_as_spam":
//       return "bg-red-500/20 text-red-400";
//     case "user_declined":
//       return "bg-yellow-500/20 text-yellow-400";
//     case "error_llm_websocket_open":
//       return "bg-red-500/20 text-red-400";
//     case "error_llm_websocket_lost_connection":
//       return "bg-red-500/20 text-red-400";
//     case "error_llm_websocket_runtime":
//       return "bg-red-500/20 text-red-400";
//     case "error_llm_websocket_corrupt_payload":
//       return "bg-red-500/20 text-red-400";
//     case "error_no_audio_received":
//       return "bg-red-500/20 text-red-400";
//     case "error_asr":
//       return "bg-red-500/20 text-red-400";
//     case "error_retell":
//       return "bg-red-500/20 text-red-400";
//     case "error_unknown":
//       return "bg-red-500/20 text-red-400";
//     case "error_user_not_joined":
//       return "bg-red-500/20 text-red-400";
//     case "registered_call_timeout":
//       return "bg-yellow-500/20 text-yellow-400";
//     default:
//       return "bg-neutral-500/20 text-neutral-400";
//   }
// };

export const CallsTable = ({ calls, callType }: CallsTableProps) => {
  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No calls found</h3>
        <p className="text-neutral-400">
          No {callType} calls match your current filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-800">
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Caller Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Phone Number
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Status
            </th>
            {/* <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Disconnection Reason
            </th> */}
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Duration
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr
              key={call.call_id}
              className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
            >
              <td className="py-4 px-4">
                <span className="text-neutral-400 text-sm">
                  {formatDate(call.start_timestamp)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-white font-medium">
                  {getCallerName(call)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-neutral-300">{getPhoneNumber(call)}</span>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                    call.call_status
                  )}`}
                >
                  {call.call_status}
                </span>
              </td>
              {/* <td className="py-4 px-4">
                <span
                  className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getDisconnectionReasonColor(
                    call.disconnection_reason
                  )}`}
                >
                  {formatDisconnectionReason(call.disconnection_reason)}
                </span>
              </td> */}
              <td className="py-4 px-4">
                <span className="text-neutral-300">
                  {formatDuration(call.duration_ms)}
                </span>
              </td>

              <td className="py-4 px-4">
                <RecordingActions call={call} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
