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
import { supabase, RetellCall, RetellConfig } from "@/lib/supabase";
import { SkeletonTable } from "./components/SkeletonTable";
import { CallsTable } from "./components/CallsTable";
import { Filters } from "./components/Filters";
import { Pagination } from "./components/Pagination";

export default function CallsPage() {
  const [calls, setCalls] = useState<RetellCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [retellConfig, setRetellConfig] = useState<RetellConfig | null>(null);
  const [filters, setFilters] = useState({
    callType: "inbound" as "inbound" | "outbound",
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
    fetchRetellConfig();
  }, []);

  useEffect(() => {
    if (retellConfig) {
      fetchCalls();
    }
  }, [retellConfig, filters, pagination.pageSize, pagination.currentPage]);

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

  // Update the fetchCalls function to handle partial date filtering
  const fetchCalls = async () => {
    if (!retellConfig) return;

    setLoading(true);
    setPaginationLoaded(false);
    try {
      const agentId =
        filters.callType === "inbound"
          ? retellConfig.inbound_agent_id
          : retellConfig.outbound_agent_id;

      if (!agentId) {
        console.error("No agent ID found for call type:", filters.callType);
        setLoading(false);
        return;
      }

      const requestBody: {
        sort_order: string;
        limit: number;
        filter_criteria: {
          agent_id: string[];
          call_type: string[];
          direction: string[];
          start_timestamp?: {
            lower_threshold?: number;
            upper_threshold?: number;
          };
        };
        pagination_key?: string;
      } = {
        sort_order: "descending",
        limit: pagination.pageSize,
        filter_criteria: {
          agent_id: [agentId],
          call_type: ["phone_call"],
          direction: [filters.callType],
        },
      };

      // Add date filters if provided - handle partial dates
      if (filters.startDate || filters.endDate) {
        requestBody.filter_criteria.start_timestamp = {};

        if (filters.startDate) {
          // Set start of day for start date
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          requestBody.filter_criteria.start_timestamp.lower_threshold =
            startDate.getTime();
        }

        if (filters.endDate) {
          // Set end of day for end date
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          requestBody.filter_criteria.start_timestamp.upper_threshold =
            endDate.getTime();
        }
      }

      // Add pagination key if available (this is a call_id)
      if (pagination.paginationKey) {
        requestBody.pagination_key = pagination.paginationKey;
      }

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
      setCalls(data || []);

      // Update pagination state
      // If we got fewer calls than requested, there are no more pages
      const hasNext = data && data.length === pagination.pageSize;
      setHasNextPage(hasNext);

      // For previous page, check if we have history
      setHasPrevPage(paginationHistory.length > 0);

      // Mark pagination as loaded
      setPaginationLoaded(true);
    } catch (error) {
      console.error("Error fetching calls:", error);
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
    if (hasNextPage && calls.length > 0) {
      // Save current pagination key to history for back navigation
      setPaginationHistory((prev) => [...prev, pagination.paginationKey]);

      // Use the last call's ID as the pagination key for next page
      const lastCallId = calls[calls.length - 1]?.call_id;
      if (lastCallId) {
        setPagination((prev) => ({
          ...prev,
          currentPage: prev.currentPage + 1,
          paginationKey: lastCallId,
        }));
      }
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage && paginationHistory.length > 0) {
      // Remove the last pagination key from history
      const newHistory = [...paginationHistory];
      const prevPaginationKey = newHistory.pop();

      setPaginationHistory(newHistory);
      setPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage - 1,
        paginationKey: prevPaginationKey || "",
      }));
    }
  };

  if (!retellConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Call History</h1>
          <p className="text-neutral-400 mt-2">Loading configuration...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Call History</h1>
        </div>
        <Button
          onClick={fetchCalls}
          className="bg-sky-500 hover:bg-sky-600 text-white"
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
      <Filters
        callType={filters.callType}
        startDate={filters.startDate}
        endDate={filters.endDate}
        pageSize={pagination.pageSize}
        onCallTypeChange={(value) => handleFilterChange("callType", value)}
        onStartDateChange={(value) => handleFilterChange("startDate", value)}
        onEndDateChange={(value) => handleFilterChange("endDate", value)}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Calls Table */}
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Call Records</CardTitle>
          <CardDescription className="text-neutral-400">
            {filters.callType === "inbound" ? "Inbound" : "Outbound"} calls from
            your AI receptionist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : (
            <CallsTable calls={calls} callType={filters.callType} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        currentPage={pagination.currentPage}
        callsCount={calls.length}
        paginationLoaded={paginationLoaded}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />
    </div>
  );
}
