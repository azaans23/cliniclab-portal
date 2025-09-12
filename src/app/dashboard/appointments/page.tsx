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
  GHLAppointment,
  GHLCalendar,
  ClinicConfig,
  GHLService,
} from "@/lib/supabase";
import { SkeletonTable } from "./components/SkeletonTable";
import { AppointmentsTable } from "./components/AppointmentsTable";
import { Filters as AppointmentsFilters } from "./components/Filters";
import { Pagination } from "./components/Pagination";

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<GHLAppointment[]>([]);
  const [calendars, setCalendars] = useState<GHLCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [filters, setFilters] = useState({
    appointmentType: "all",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    pageSize: 10,
    currentPage: 1,
    paginationKey: "",
  });
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [paginationHistory, setPaginationHistory] = useState<string[]>([]);
  const [paginationLoaded, setPaginationLoaded] = useState(false);

  useEffect(() => {
    fetchClinicConfig();
  }, []);

  useEffect(() => {
    if (clinicConfig) {
      fetchServices();
      fetchAppointments();
    }
  }, [clinicConfig, filters, pagination.pageSize, pagination.currentPage]);

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

  const fetchServices = async () => {
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
      console.log("Services response:", data);

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
              name: capitalizeWords(service.name),
              description: service.description || `Service ${calendarId}`,
            } as GHLCalendar;
          }
          return null;
        })
        .filter((calendar): calendar is GHLCalendar => calendar !== null);

      setCalendars(calendarList);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchAppointments = async () => {
    if (!clinicConfig) return;

    setLoading(true);
    setPaginationLoaded(false);
    try {
      // Set default date range if no dates are provided
      let startDate, endDate;

      if (filters.startDate) {
        startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Set to 1 year ago if no start date
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
      }

      if (filters.endDate) {
        endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Set to current time if no end date
        endDate = new Date();
      }

      let allAppointments: GHLAppointment[] = [];

      if (filters.appointmentType === "all") {
        // Fetch appointments for all calendar IDs
        for (const calendarId of clinicConfig.calendar_ids) {
          const params = new URLSearchParams();
          params.append("startDate", startDate.getTime().toString());
          params.append("endDate", endDate.getTime().toString());
          params.append("includeAll", "true");
          params.append("locationId", clinicConfig.location_id);
          params.append("calendarId", calendarId);

          console.log(
            `Fetching appointments for calendar ${calendarId} with params:`,
            params.toString()
          );

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
            const errorText = await response.text();
            console.error(
              `API Error for calendar ${calendarId}:`,
              response.status,
              errorText
            );
            continue; // Skip this calendar and continue with others
          }

          const data = await response.json();
          if (data.appointments) {
            allAppointments = [...allAppointments, ...data.appointments];
          }
        }
      } else {
        // Fetch appointments for specific calendar
        const params = new URLSearchParams();
        params.append("startDate", startDate.getTime().toString());
        params.append("endDate", endDate.getTime().toString());
        params.append("includeAll", "true");
        params.append("locationId", clinicConfig.location_id);
        params.append("calendarId", filters.appointmentType);

        console.log(
          "Fetching appointments for specific calendar with params:",
          params.toString()
        );

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
          const errorText = await response.text();
          console.error("API Error:", response.status, errorText);
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        allAppointments = data.appointments || [];
      }

      // Sort appointments by start time (newest first)
      allAppointments.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      // Apply client-side pagination
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedAppointments = allAppointments.slice(startIndex, endIndex);

      console.log(
        "All appointments:",
        allAppointments.length,
        "Paginated:",
        paginatedAppointments.length
      );
      setAppointments(paginatedAppointments);

      // Update pagination state
      const hasNext = endIndex < allAppointments.length;
      setHasNextPage(hasNext);
      setHasPrevPage(pagination.currentPage > 1);
      setPaginationLoaded(true);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1, paginationKey: "" }));
    setPaginationHistory([]);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1,
      paginationKey: "",
    }));
    setPaginationHistory([]);
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage + 1,
      }));
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage - 1,
      }));
    }
  };

  if (!clinicConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Appointments</h1>
          <p className="text-neutral-400 mt-2">Loading configuration...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Appointments</h1>
          <p className="text-neutral-400 mt-2">
            {loading
              ? "Loading..."
              : `${appointments.length} appointment${
                  appointments.length !== 1 ? "s" : ""
                } found`}
          </p>
        </div>
        <Button
          onClick={fetchAppointments}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          disabled={loading}
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <AppointmentsFilters
        appointmentType={filters.appointmentType}
        startDate={filters.startDate}
        endDate={filters.endDate}
        calendars={calendars}
        pageSize={pagination.pageSize}
        onAppointmentTypeChange={(value) =>
          handleFilterChange("appointmentType", value)
        }
        onStartDateChange={(value) => handleFilterChange("startDate", value)}
        onEndDateChange={(value) => handleFilterChange("endDate", value)}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Appointments Table */}
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Appointment Records</CardTitle>
          <CardDescription className="text-neutral-400">
            Scheduled patient appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : (
            <AppointmentsTable
              appointments={appointments}
              calendars={calendars}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        currentPage={pagination.currentPage}
        appointmentsCount={appointments.length}
        paginationLoaded={paginationLoaded}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />
    </div>
  );
}
