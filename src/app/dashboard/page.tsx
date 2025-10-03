"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Dynamic stats interface
interface CallStats {
  current: number;
  previous: number;
}

interface MessageWithDetails extends MessagesTaken {
  caller_name: string;
  caller_phone: string;
  message_content: string;
  date_time: string;
}

interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  retryCount: number;
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

const getAppointmentType = (
  appointment: GHLAppointment,
  calendars: GHLCalendar[]
) => {
  const calendar = calendars.find((cal) => cal.id === appointment.calendarId);
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
  const [openTickets, setOpenTickets] = useState<number | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [currentMessagesCount, setCurrentMessagesCount] = useState(0);
  const [previousMessagesCount, setPreviousMessagesCount] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState<RetellCall[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [callStats, setCallStats] = useState<CallStats>({
    current: 0,
    previous: 0,
  });
  const [appointmentStats, setAppointmentStats] = useState<CallStats>({
    current: 0,
    previous: 0,
  });
  const [weeklyCallData, setWeeklyCallData] = useState<
    Array<{ date: string; calls: number }>
  >([]);
  const [weeklyCallsLoading, setWeeklyCallsLoading] = useState(true);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(true);
  const [callStatsLoading, setCallStatsLoading] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState<
    GHLAppointment[]
  >([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentCalendars, setAppointmentCalendars] = useState<
    GHLCalendar[]
  >([]);
  const [retellConfig, setRetellConfig] = useState<RetellConfig | null>(null);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    retryCount: 0,
  });

  useEffect(() => {
    fetchRetellConfig();
    fetchClinicConfig();
    fetchRecentMessages();
    fetchOpenTickets();
    fetchMessagesStats();
  }, []);

  useEffect(() => {
    if (retellConfig) {
      fetchRecentCalls();
      fetchCallStats();
      fetchWeeklyCallData();
    }
  }, [retellConfig]);

  useEffect(() => {
    if (clinicConfig) {
      fetchAppointmentCalendars();
      fetchAppointments();
    }
  }, [clinicConfig]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitState.isRateLimited && rateLimitState.retryAfter > 0) {
      const timer = setInterval(() => {
        setRateLimitState((prev) => {
          if (prev.retryAfter <= 1) {
            // Retry fetch when countdown reaches 0
            if (retellConfig) {
              fetchRecentCalls();
              fetchCallStats();
              fetchWeeklyCallData();
            }
            return { isRateLimited: false, retryAfter: 0, retryCount: 0 };
          }
          return { ...prev, retryAfter: prev.retryAfter - 1 };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [rateLimitState.isRateLimited, rateLimitState.retryAfter, retellConfig]);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleRateLimit = async (
    response: Response,
    retryCount: number = 0
  ): Promise<{ shouldRetry: boolean; waitTime: number }> => {
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const baseWaitTime = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : 5;

      // Exponential backoff with jitter
      const exponentialWait = Math.min(
        baseWaitTime * Math.pow(2, retryCount),
        60
      );
      const jitter = Math.random() * 2;
      const waitTime = Math.floor(exponentialWait + jitter);

      console.warn(
        `Rate limit hit (attempt ${retryCount + 1}), waiting ${waitTime}s...`
      );

      setRateLimitState({
        isRateLimited: true,
        retryAfter: waitTime,
        retryCount: retryCount + 1,
      });

      return { shouldRetry: retryCount < 3, waitTime };
    }

    return { shouldRetry: false, waitTime: 0 };
  };

  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          const { shouldRetry, waitTime } = await handleRateLimit(
            response,
            attempt
          );

          if (shouldRetry) {
            await sleep(waitTime * 1000);
            continue;
          } else {
            console.error("Max rate limit retries exceeded");
            return null;
          }
        }

        if (!response.ok && response.status !== 429) {
          console.error(`HTTP error! status: ${response.status}`);
          return response;
        }

        // Reset rate limit state on successful request
        if (rateLimitState.isRateLimited) {
          setRateLimitState({
            isRateLimited: false,
            retryAfter: 0,
            retryCount: 0,
          });
        }

        return response;
      } catch (error) {
        console.error(`Request attempt ${attempt + 1} failed:`, error);
        if (attempt === maxRetries) {
          return null;
        }
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }

    return null;
  };

  const fetchMessagesStats = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;
      const user = JSON.parse(userData);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(now.getDate() - 60);

      const { count: current, error: currentError } = await supabase
        .from("messages_taken")
        .select("id", { count: "exact" })
        .eq("client_id", user.id)
        .gte("date_time", thirtyDaysAgo.toISOString())
        .lte("date_time", now.toISOString());

      if (currentError) {
        console.error("Error fetching current messages:", currentError);
        return;
      }

      const { count: previous, error: prevError } = await supabase
        .from("messages_taken")
        .select("id", { count: "exact" })
        .eq("client_id", user.id)
        .gte("date_time", sixtyDaysAgo.toISOString())
        .lt("date_time", thirtyDaysAgo.toISOString());

      if (prevError) {
        console.error("Error fetching previous messages:", prevError);
        return;
      }

      setCurrentMessagesCount(current || 0);
      setPreviousMessagesCount(previous || 0);
    } catch (err) {
      console.error("Error fetching messages stats:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchOpenTickets = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      const { count, error } = await supabase
        .from("support_ticket")
        .select("*", { count: "exact" })
        .eq("client_id", user.id)
        .eq("status", "Opened");

      if (error) {
        console.error("Error fetching open tickets:", error);
        return;
      }

      setOpenTickets(count || 0);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

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

  const fetchCallStats = async () => {
    if (!retellConfig || rateLimitState.isRateLimited) return;

    setCallStatsLoading(true);
    try {
      const now = new Date();

      const currentEndDate = new Date(now);
      currentEndDate.setHours(23, 59, 59, 999);
      const currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      currentStartDate.setHours(0, 0, 0, 0);

      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      previousStartDate.setHours(0, 0, 0, 0);

      const currentInboundCalls = await fetchCallsForPeriod(
        retellConfig.inbound_agent_id,
        "inbound",
        currentStartDate.getTime(),
        currentEndDate.getTime()
      );

      const currentOutboundCalls = await fetchCallsForPeriod(
        retellConfig.outbound_agent_id,
        "outbound",
        currentStartDate.getTime(),
        currentEndDate.getTime()
      );

      const previousInboundCalls = await fetchCallsForPeriod(
        retellConfig.inbound_agent_id,
        "inbound",
        previousStartDate.getTime(),
        previousEndDate.getTime()
      );

      const previousOutboundCalls = await fetchCallsForPeriod(
        retellConfig.outbound_agent_id,
        "outbound",
        previousStartDate.getTime(),
        previousEndDate.getTime()
      );

      if (
        currentInboundCalls !== null &&
        currentOutboundCalls !== null &&
        previousInboundCalls !== null &&
        previousOutboundCalls !== null
      ) {
        const currentTotal = currentInboundCalls + currentOutboundCalls;
        const previousTotal = previousInboundCalls + previousOutboundCalls;

        setCallStats({
          current: currentTotal,
          previous: previousTotal,
        });
      }
    } catch (error) {
      console.error("Error fetching call stats:", error);
    } finally {
      setCallStatsLoading(false);
    }
  };

  const fetchCallsForWeeklyData = async (
    agentId: string | null,
    direction: "inbound" | "outbound",
    startTimestamp: number,
    endTimestamp: number
  ): Promise<RetellCall[] | null> => {
    if (!agentId || !retellConfig || rateLimitState.isRateLimited) return null;

    try {
      let allCalls: RetellCall[] = [];
      let paginationKey = "";
      let hasMoreCalls = true;

      while (hasMoreCalls) {
        const requestBody: {
          sort_order: string;
          limit: number;
          filter_criteria: {
            agent_id: string[];
            call_type: string[];
            direction: string[];
            start_timestamp: {
              lower_threshold: number;
              upper_threshold: number;
            };
          };
          pagination_key?: string;
        } = {
          sort_order: "descending",
          limit: 1000,
          filter_criteria: {
            agent_id: [agentId],
            call_type: ["phone_call"],
            direction: [direction],
            start_timestamp: {
              lower_threshold: startTimestamp,
              upper_threshold: endTimestamp,
            },
          },
        };

        if (paginationKey) {
          requestBody.pagination_key = paginationKey;
        }

        const response = await fetchWithRetry(
          "https://api.retellai.com/v2/list-calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${retellConfig.retell_api}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response) {
          return null;
        }

        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          return null;
        }

        const data = await response.json();
        const calls = data || [];
        allCalls = [...allCalls, ...calls];

        if (calls.length === 1000) {
          paginationKey = calls[calls.length - 1]?.call_id;
          hasMoreCalls = true;
        } else {
          hasMoreCalls = false;
        }
      }

      return allCalls;
    } catch (error) {
      console.error(
        `Error fetching ${direction} calls for weekly data:`,
        error
      );
      return null;
    }
  };

  const fetchWeeklyCallData = async () => {
    if (!retellConfig || rateLimitState.isRateLimited) return;

    setWeeklyCallsLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [inboundCalls, outboundCalls] = await Promise.all([
        fetchCallsForWeeklyData(
          retellConfig.inbound_agent_id,
          "inbound",
          sevenDaysAgo.getTime(),
          now.getTime()
        ),
        fetchCallsForWeeklyData(
          retellConfig.outbound_agent_id,
          "outbound",
          sevenDaysAgo.getTime(),
          now.getTime()
        ),
      ]);

      // Only update if we got valid data
      if (inboundCalls !== null && outboundCalls !== null) {
        const allCalls = [...inboundCalls, ...outboundCalls];

        const callsByDay = new Map<string, number>();

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          callsByDay.set(dateStr, 0);
        }

        allCalls.forEach((call) => {
          if (call.start_timestamp) {
            const callDate = new Date(call.start_timestamp);
            const dateStr = callDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            if (callsByDay.has(dateStr)) {
              callsByDay.set(dateStr, (callsByDay.get(dateStr) || 0) + 1);
            }
          }
        });

        const chartData = Array.from(callsByDay.entries()).map(
          ([date, calls]) => ({
            date,
            calls,
          })
        );

        setWeeklyCallData(chartData);
      }
    } catch (error) {
      console.error("Error fetching weekly call data:", error);
    } finally {
      setWeeklyCallsLoading(false);
    }
  };

  const fetchCallsForPeriod = async (
    agentId: string | null,
    direction: "inbound" | "outbound",
    startTimestamp: number,
    endTimestamp: number
  ): Promise<number | null> => {
    if (!agentId || !retellConfig || rateLimitState.isRateLimited) return null;

    try {
      let totalCalls = 0;
      let paginationKey = "";
      let hasMoreCalls = true;

      while (hasMoreCalls) {
        const requestBody: {
          sort_order: string;
          limit: number;
          filter_criteria: {
            agent_id: string[];
            call_type: string[];
            direction: string[];
            start_timestamp: {
              lower_threshold: number;
              upper_threshold: number;
            };
          };
          pagination_key?: string;
        } = {
          sort_order: "descending",
          limit: 1000,
          filter_criteria: {
            agent_id: [agentId],
            call_type: ["phone_call"],
            direction: [direction],
            start_timestamp: {
              lower_threshold: startTimestamp,
              upper_threshold: endTimestamp,
            },
          },
        };

        if (paginationKey) {
          requestBody.pagination_key = paginationKey;
        }

        const response = await fetchWithRetry(
          "https://api.retellai.com/v2/list-calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${retellConfig.retell_api}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response) {
          return null;
        }

        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          return null;
        }

        const data = await response.json();
        const calls = data || [];
        totalCalls += calls.length;

        if (calls.length === 1000) {
          paginationKey = calls[calls.length - 1]?.call_id;
          hasMoreCalls = true;
        } else {
          hasMoreCalls = false;
        }
      }

      return totalCalls;
    } catch (error) {
      console.error(`Error fetching ${direction} calls for period:`, error);
      return null;
    }
  };

  const fetchAppointmentCalendars = async () => {
    if (!clinicConfig) return;

    try {
      const response = await fetch(
        "https://rest.gohighlevel.com/v1/calendars/services",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${clinicConfig.ghl_api}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Services API Error:", response.status);
        return;
      }

      const data = await response.json();

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
              name: service.name.replace(/\b\w/g, (char: string) =>
                char.toUpperCase()
              ),
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

  const fetchAppointments = async () => {
    if (!clinicConfig) return;

    setAppointmentStatsLoading(true);
    setAppointmentsLoading(true);

    try {
      const [recentData, previousData] = await Promise.all([
        fetchAppointmentsForPeriod(30, 0),
        fetchAppointmentsForPeriod(60, 30),
      ]);

      setAppointmentStats({
        current: recentData.count,
        previous: previousData.count,
      });

      setRecentAppointments(recentData.appointments.slice(0, 4));
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setAppointmentStatsLoading(false);
      setAppointmentsLoading(false);
    }
  };

  const fetchAppointmentsForPeriod = async (
    daysAgo: number,
    offsetDays: number
  ): Promise<{ appointments: GHLAppointment[]; count: number }> => {
    if (!clinicConfig) return { appointments: [], count: 0 };

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - offsetDays);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let allAppointments: GHLAppointment[] = [];

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
          console.error(
            `API Error for calendar ${calendarId}:`,
            response.status
          );
          continue;
        }

        const data = await response.json();
        if (data.appointments) {
          allAppointments = [...allAppointments, ...data.appointments];
        }
      }

      allAppointments.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startTime).getTime();
        const dateB = new Date(b.createdAt || b.startTime).getTime();
        return dateB - dateA;
      });

      return {
        appointments: allAppointments,
        count: allAppointments.length,
      };
    } catch (error) {
      console.error("Error fetching appointments for period:", error);
      return { appointments: [], count: 0 };
    }
  };

  const fetchRecentCalls = async () => {
    if (!retellConfig || rateLimitState.isRateLimited) return;

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

      const response = await fetchWithRetry(
        "https://api.retellai.com/v2/list-calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${retellConfig.retell_api}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response) {
        setRecentCalls([]);
        return;
      }

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        setRecentCalls([]);
        return;
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

  function formatPercentageChange(current: number, previous: number) {
    if (previous === 0 && current > 0)
      return <p className="text-xs text-green-400">+100%</p>;
    if (previous === 0 && current === 0)
      return <p className="text-xs text-neutral-400">0%</p>;

    const change = ((current - previous) / previous) * 100;
    const rounded = Math.round(change);

    if (change > 0) {
      return (
        <p className="text-xs text-green-400">+{rounded}% from last month</p>
      );
    } else if (change < 0) {
      return <p className="text-xs text-red-400">{rounded}% from last month</p>;
    } else {
      return <p className="text-xs text-neutral-400">No change</p>;
    }
  }

  const memoizedChartData = useMemo(() => weeklyCallData, [weeklyCallData]);

  const ChartComponent = useMemo(() => {
    if (memoizedChartData.length === 0) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={memoizedChartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#fff",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
            }}
            labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
            itemStyle={{ color: "#0ea5e9" }}
            cursor={{
              stroke: "#0ea5e9",
              strokeWidth: 1,
              strokeDasharray: "3 3",
            }}
          />
          <Line
            type="monotone"
            dataKey="calls"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{
              fill: "#0ea5e9",
              r: 5,
              strokeWidth: 2,
              stroke: "#1f2937",
            }}
            activeDot={{
              r: 7,
              strokeWidth: 2,
              stroke: "#1f2937",
              fill: "#0ea5e9",
            }}
            animationDuration={1500}
            animationEasing="ease-in-out"
            fill="url(#callsGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, [memoizedChartData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 mt-2">
          Overview of your AI receptionist system
        </p>
      </div>

      {/* {rateLimitState.isRateLimited && (
        <Card className="bg-yellow-900/20 border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-yellow-500 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-200 font-medium">
                  Rate limit reached - Retrying in {rateLimitState.retryAfter}s
                </p>
                <p className="text-yellow-300/70 text-sm mt-1">
                  Call data will refresh automatically once the limit resets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Total Calls (last 30 days)
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
            {callStatsLoading || rateLimitState.isRateLimited ? (
              <div className="space-y-2">
                <div className="h-8 bg-neutral-700 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-neutral-700 rounded animate-pulse w-32"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {callStats.current.toLocaleString()}
                </div>
                {formatPercentageChange(callStats.current, callStats.previous)}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Appointments (last 30 days)
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
            {appointmentStatsLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-neutral-700 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-neutral-700 rounded animate-pulse w-32"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {appointmentStats.current.toLocaleString()}
                </div>
                {formatPercentageChange(
                  appointmentStats.current,
                  appointmentStats.previous
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/80 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Messages (last 30 days)
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
            {loadingMessages ? (
              <div className="space-y-2">
                <div className="h-8 bg-neutral-700 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-neutral-700 rounded animate-pulse w-32"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {currentMessagesCount.toLocaleString()}
                </div>
                {formatPercentageChange(
                  currentMessagesCount,
                  previousMessagesCount
                )}
              </>
            )}
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
            {loadingTickets ? (
              <div className="space-y-2">
                <div className="h-8 bg-neutral-700 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-neutral-700 rounded animate-pulse w-32"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {openTickets?.toLocaleString()}
                </div>
                <p className="text-xs text-red-400">
                  {openTickets && openTickets > 0
                    ? `+${openTickets} open`
                    : "No open tickets"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {weeklyCallsLoading || rateLimitState.isRateLimited ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <div className="relative w-full h-full">
                    <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="h-3 bg-neutral-700 rounded animate-pulse"
                          style={{ width: "24px" }}
                        ></div>
                      ))}
                    </div>
                    <div className="absolute left-12 right-0 top-0 bottom-8 flex items-end justify-between gap-2">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-sky-500/20 to-sky-500/5 rounded-t animate-pulse"
                          style={{
                            height: `${Math.random() * 60 + 30}%`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        ></div>
                      ))}
                    </div>
                    <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="h-3 bg-neutral-700 rounded animate-pulse"
                          style={{ width: "40px" }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </ResponsiveContainer>
              </div>
            ) : ChartComponent ? (
              ChartComponent
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
                    <svg
                      className="w-12 h-12 text-sky-500/40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-neutral-300 font-medium">
                    No call data available
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Data will appear here once calls are recorded
                  </p>
                </div>
              </div>
            )}
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
                            {getPatientName(appointment)
                              .charAt(0)
                              .toUpperCase()}
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
                      <span>
                        {getAppointmentType(appointment, appointmentCalendars)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>
                          {formatAppointmentDateTime(
                            appointment.createdAt || appointment.startTime
                          )}
                        </span>
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
