"use client";

import { GHLAppointment, GHLCalendar } from "@/lib/supabase";

interface AppointmentsTableProps {
  appointments: GHLAppointment[];
  calendars: GHLCalendar[];
}

// Helper functions
const getPatientName = (appointment: GHLAppointment) => {
  // Use fullNameLowerCase from contact data and capitalize each word
  const fullName = appointment.contact?.fullNameLowerCase || "Unknown";
  return fullName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getAppointmentType = (
  appointment: GHLAppointment,
  calendars: GHLCalendar[]
) => {
  const calendar = calendars.find((cal) => cal.id === appointment.calendarId);
  return calendar?.name || "Unknown Type";
};

const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "booked":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    case "cancelled":
      return "text-red-400";
    default:
      return "text-neutral-400";
  }
};

export const AppointmentsTable = ({
  appointments,
  calendars,
}: AppointmentsTableProps) => {
  if (appointments.length === 0) {
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No appointments found
        </h3>
        <p className="text-neutral-400">
          No appointments match your current filters
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
              Patient
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Appointment Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Start Time
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              End Time
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr
              key={appointment.id}
              className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {getPatientName(appointment).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {getPatientName(appointment)}
                    </p>
                    <p className="text-neutral-400 text-xs">
                      {appointment.contact?.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="text-neutral-300">
                  {getAppointmentType(appointment, calendars)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-neutral-300">
                  {formatDateTime(appointment.startTime)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-neutral-300">
                  {formatDateTime(appointment.endTime)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`text-xs font-medium ${getStatusColor(
                    appointment.appoinmentStatus
                  )}`}
                >
                  {appointment.appoinmentStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
