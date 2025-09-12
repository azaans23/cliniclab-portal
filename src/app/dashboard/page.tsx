"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  supabase,
  MessagesTaken,
  RetellCall,
  RetellConfig,
  GHLAppointment,
  GHLCalendar,
  ClinicConfig,
  GHLService,
} from "@/lib/supabase";
import Link from "next/link";

// Dummy data
const stats = {
  totalCalls: 1247,
  totalAppointments: 89,
  totalMessages: 342,
  supportTickets: 23,
};

interface MessageWithDetails extends MessagesTaken {
  caller_name: string;
  caller_phone: string;
  message_content: string;
  date_time: string;
}

const SkeletonTable = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg animate-pulse"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
          <div className="space-y-1">
            <div className="h-4 bg-neutral-700 rounded w-24"></div>
            <div className="h-3 bg-neutral-700 rounded w-32"></div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="h-4 bg-neutral-700 rounded w-16"></div>
          <div className="h-3 bg-neutral-700 rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

// Helper functions for calls
const getCallerName = (call: RetellCall) => {
  if (
    call.collected_dynamic_variables?.firstName &&
    call.collected_dynamic_variables?.lastName
  ) {
    return `${call.collected_dynamic_variables.firstName} ${call.collected_dynamic_variables.lastName}`;
  }
  return "Unknown Caller";
};

const getPhoneNumber = (call: RetellCall) => {
  if (call.direction === "inbound") {
    return call.from_number || "Unknown";
  } else {
    return call.to_number || "Unknown";
  }
};

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return "0:00";
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatCallDate = (timestamp?: number) => {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ended":
      return "text-green-400";
    case "ongoing":
      return "text-blue-400";
    case "error":
      return "text-red-400";
    default:
      return "text-neutral-400";
  }
};

// Helper functions for appointments
const getPatientName = (appointment: GHLAppointment) => {
  const email = appointment.contact?.email || "Unknown";
  const name = email.split("@")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const getAppointmentType = (appointment: GHLAppointment, calendars: GHLCalendar[]) => {
  const calendar = calendars.find(cal => cal.id === appointment.calendarId);
  return calendar?.name || "Unknown Type";
};

const formatAppointmentDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const getAppointmentStatusColor = (status: string) => {
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

export default function Dashboard() {
  const [recentMessages, setRecentMessages] = useState<MessageWithDetails[]>(
    []
  );
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState<RetellCall[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState<GHLAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentCalendars, setAppointmentCalendars] = useState<GHLCalendar[]>([]);
  const [retellConfig, setRetellConfig] = useState<RetellConfig | null>(null);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);

  useEffect(() => {
    fetchRetellConfig();
    fetchClinicConfig();
    fetchRecentMessages();
  }, []);

  useEffect(() => {
    if (retellConfig) {
      fetchRecentCalls();
    }
  }, [retellConfig]);

  useEffect(() => {
    if (clinicConfig) {
      fetchAppointmentCalendars();
      fetchRecentAppointments();
    }
  }, [clinicConfig]);

  const fetchRetellConfig = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      const { data, error } = await supabase
        .from("retell_config")
        .select("*")
        .eq("client_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching retell config:", error);
        return;
      }

      setRetellConfig(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchClinicConfig = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      const { data, error } = await supabase
        .from("clinic_config")
        .select("*")
        .eq("client_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching clinic config:", error);
        return;
      }

      setClinicConfig(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchAppointmentCalendars = async () => {
    if (!clinicConfig) return;

    try {
      const response = await fetch("https://rest.gohighlevel.com/v1/calendars/services", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clinicConfig.ghl_api}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Services API Error:", response.status);
        return;
      }

      const data = await response.json();
      
      // Create calendar objects from services, matching with calendar_ids
      const serviceMap = new Map<string, GHLService>();
      data.services?.forEach((service: GHLService) => {
        serviceMap.set(service.id, service);
      });

      const calendarList: GHLCalendar[] = clinicConfig.calendar_ids
        .map((calendarId) => {
          const service = serviceMap.get(calendarId);
          if (service) {
            return {
              id: calendarId,
              name: service.name.replace(/\b\w/g, (char: string) => char.toUpperCase()),
              description: service.description || `Service ${calendarId}`,
            } as GHLCalendar;
          }
          return null;
        })
        .filter((calendar): calendar is GHLCalendar => calendar !== null);

      setAppointmentCalendars(calendarList);
    } catch (error) {
      console.error("Error fetching appointment calendars:", error);
    }
  };

  const fetchRecentAppointments = async () => {
    if (!clinicConfig) return;

    setAppointmentsLoading(true);
    try {
      // Set date range to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      let allAppointments: GHLAppointment[] = [];

      // Fetch appointments for all calendar IDs
      for (const calendarId of clinicConfig.calendar_ids) {
        const params = new URLSearchParams();
        params.append("startDate", startDate.getTime().toString());
        params.append("endDate", endDate.getTime().toString());
        params.append("includeAll", "true");
        params.append("locationId", clinicConfig.location_id);
        params.append("calendarId", calendarId);

        const response = await fetch(
          `https://rest.gohighlevel.com/v1/appointments/?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${clinicConfig.ghl_api}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(`API Error for calendar ${calendarId}:`, response.status);
          continue;
        }

        const data = await response.json();
        if (data.appointments) {
          allAppointments = [...allAppointments, ...data.appointments];
        }
      }

      // Sort appointments by createdAt (newest first) and take first 4
      allAppointments.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startTime).getTime();
        const dateB = new Date(b.createdAt || b.startTime).getTime();
        return dateB - dateA;
      });
      setRecentAppointments(allAppointments.slice(0, 4));
    } catch (error) {
      console.error("Error fetching recent appointments:", error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchRecentCalls = async () => {
    if (!retellConfig) return;

    setCallsLoading(true);
    try {
      const agentId = retellConfig.inbound_agent_id;

      if (!agentId) {
        console.error("No inbound agent ID found");
        setCallsLoading(false);
        return;
      }

      const requestBody = {
        sort_order: "descending",
        limit: 3,
        filter_criteria: {
          agent_id: [agentId],
          call_type: ["phone_call"],
          direction: ["inbound"],
        },
      };

      const response = await fetch("https://api.retellai.com/v2/list-calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${retellConfig.retell_api}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecentCalls(data || []);
    } catch (error) {
      console.error("Error fetching recent calls:", error);
    } finally {
      setCallsLoading(false);
    }
  };

  const fetchRecentMessages = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      const { data, error } = await supabase
        .from("messages_taken")
        .select("*")
        .eq("client_id", user.id)
        .order("date_time", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setRecentMessages(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 mt-2">
          Overview of your AI receptionist system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Total Calls
            </CardTitle>
            <svg
              className="h-4 w-4 text-sky-500"
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalCalls.toLocaleString()}
            </div>
            <p className="text-xs text-green-400">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Appointments
            </CardTitle>
            <svg
              className="h-4 w-4 text-indigo-500"
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalAppointments}
            </div>
            <p className="text-xs text-green-400">+8% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Messages
            </CardTitle>
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalMessages}
            </div>
            <p className="text-xs text-green-400">+15% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Support Tickets
            </CardTitle>
            <svg
              className="h-4 w-4 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.supportTickets}
            </div>
            <p className="text-xs text-red-400">+3 from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Activity Chart */}
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">
              Call Activity (Last 7 Days)
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Daily call volume and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-neutral-400">
                  Chart visualization would go here
                </p>
                <p className="text-sm text-neutral-500">
                  Integration with chart library needed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Calls</CardTitle>
            <CardDescription className="text-neutral-400">
              Latest incoming calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <SkeletonTable />
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-neutral-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-neutral-400"
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
                <h3 className="text-sm font-medium text-white mb-1">
                  No calls yet
                </h3>
                <p className="text-xs text-neutral-400">
                  Recent calls will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.call_id}
                    className="p-3 bg-neutral-800/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {getCallerName(call).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {getCallerName(call)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium ${getStatusColor(
                          call.call_status
                        )}`}
                      >
                        {call.call_status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>{getPhoneNumber(call)}</span>
                      <div className="flex items-center gap-3">
                        <span>{formatDuration(call.duration_ms)}</span>
                        <span>{formatCallDate(call.start_timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/calls">
              <Button className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white">
                View All Calls
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Appointments</CardTitle>
            <CardDescription className="text-neutral-400">
              Latest created appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <SkeletonTable />
            ) : recentAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-neutral-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-neutral-400"
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
                <h3 className="text-sm font-medium text-white mb-1">
                  No appointments yet
                </h3>
                <p className="text-xs text-neutral-400">
                  Recent appointments will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-3 bg-neutral-800/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {getPatientName(appointment).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {getPatientName(appointment)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium ${getAppointmentStatusColor(
                          appointment.appoinmentStatus
                        )}`}
                      >
                        {appointment.appoinmentStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>{getAppointmentType(appointment, appointmentCalendars)}</span>
                      <div className="flex items-center gap-3">
                        <span>{formatAppointmentDateTime(appointment.createdAt || appointment.startTime)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/appointments">
              <Button className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 text-white">
                View All Appointments
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">
              Latest Caller Communications
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Recent messages from callers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <SkeletonTable />
            ) : recentMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-neutral-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">
                  No messages yet
                </h3>
                <p className="text-xs text-neutral-400">
                  Messages from callers will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 bg-neutral-800/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {message.caller_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {message.caller_name}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {formatDate(message.date_time)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 mb-1">
                      {truncateMessage(message.message_content)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {message.caller_phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/messages">
              <Button className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white">
                View All Messages
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
