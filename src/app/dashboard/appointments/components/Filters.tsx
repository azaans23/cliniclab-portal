"use client";

import { GHLCalendar } from "@/lib/supabase";

interface FiltersProps {
  appointmentType: string;
  startDate: string;
  endDate: string;
  pageSize: number;
  calendars: GHLCalendar[];
  onAppointmentTypeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
}

export const Filters = ({
  appointmentType,
  startDate,
  endDate,
  pageSize,
  calendars,
  onAppointmentTypeChange,
  onStartDateChange,
  onEndDateChange,
  onPageSizeChange,
}: FiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Appointment Type Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Appointment Type
        </label>
        <select
          value={appointmentType}
          onChange={(e) => onAppointmentTypeChange(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Start Date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* End Date Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          End Date
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Page Size Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Page Size
        </label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  );
};
