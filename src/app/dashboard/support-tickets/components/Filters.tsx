"use client";

import { TicketStatus } from "@/lib/supabase";

interface FiltersProps {
  status: "all" | TicketStatus;
  onStatusChange: (status: "all" | TicketStatus) => void;
}

export const Filters = ({ status, onStatusChange }: FiltersProps) => {
  const statusOptions = [
    { value: "all", label: "All Tickets" },
    { value: "Opened", label: "Opened" },
    { value: "In Progress", label: "In Progress" },
    { value: "Closed", label: "Closed" },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-300">Status:</label>
        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as "all" | TicketStatus)
          }
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
