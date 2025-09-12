"use client";

import { SupportTicket, TicketStatus } from "@/lib/supabase";

interface SupportTicketsTableProps {
  tickets: SupportTicket[];
  loading: boolean;
}

const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case "Opened":
      return "text-yellow-400 bg-yellow-400/10";
    case "In Progress":
      return "text-blue-400 bg-blue-400/10";
    case "Closed":
      return "text-green-400 bg-green-400/10";
    default:
      return "text-neutral-400 bg-neutral-400/10";
  }
};

const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const SupportTicketsTable = ({
  tickets,
  loading,
}: SupportTicketsTableProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-neutral-800 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No support tickets found
        </h3>
        <p className="text-neutral-400">
          You haven&apos;t created any support tickets yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="bg-neutral-800/50 rounded-lg p-6 hover:bg-neutral-800/70 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-white">
                  {ticket.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    ticket.status
                  )}`}
                >
                  {ticket.status}
                </span>
              </div>
              <p className="text-neutral-300 text-sm mb-3 line-clamp-2">
                {ticket.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <span>Created: {formatDateTime(ticket.created_at)}</span>
                {ticket.updated_at !== ticket.created_at && (
                  <span>Updated: {formatDateTime(ticket.updated_at)}</span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <svg
                className="w-5 h-5 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
