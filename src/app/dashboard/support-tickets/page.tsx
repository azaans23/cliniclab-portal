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
import { Modal } from "@/components/ui/modal";
import { supabase, SupportTicket, TicketStatus } from "@/lib/supabase";
import { SupportTicketsTable } from "./components/SupportTicketsTable";
import { NewTicketForm } from "./components/NewTicketForm";
import { Filters } from "./components/Filters";

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [filters, setFilters] = useState({
    status: "all" as "all" | TicketStatus,
  });

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      let query = supabase
        .from("support_ticket")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching support tickets:", error);
        return;
      }

      setTickets(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: {
    title: string;
    description: string;
  }) => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      // Create the ticket in the database
      const { data, error } = await supabase
        .from("support_ticket")
        .insert([
          {
            client_id: user.id,
            title: ticketData.title,
            description: ticketData.description,
            status: "Opened",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating support ticket:", error);
        return;
      }

      // Send webhook notification to n8n
      try {
        await fetch("https://n8n.cliniclab.ai/webhook/support-ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clinic: user.name || user.email, // Use name if available, fallback to email
            title: ticketData.title,
            description: ticketData.description,
          }),
        });
      } catch (webhookError) {
        console.error("Error sending webhook notification:", webhookError);
        // Don't fail the ticket creation if webhook fails
      }

      setTickets((prev) => [data, ...prev]);
      setShowNewTicketForm(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleStatusChange = (value: "all" | TicketStatus) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
          <p className="text-neutral-400 mt-2">
            Manage your support requests and track their status
          </p>
        </div>
        <Button
          onClick={() => setShowNewTicketForm(true)}
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Ticket
        </Button>
      </div>

      {/* Filters */}
      <Filters status={filters.status} onStatusChange={handleStatusChange} />

      {/* Support Tickets Table */}
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Support Tickets</CardTitle>
          <CardDescription className="text-neutral-400">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportTicketsTable tickets={tickets} loading={loading} />
        </CardContent>
      </Card>

      {/* New Ticket Modal */}
      <Modal
        isOpen={showNewTicketForm}
        onClose={() => setShowNewTicketForm(false)}
        title="Create New Support Ticket"
        description="Describe your issue and we'll help you resolve it"
        maxWidth="max-w-3xl"
      >
        <NewTicketForm
          onSubmit={handleCreateTicket}
          onCancel={() => setShowNewTicketForm(false)}
        />
      </Modal>
    </div>
  );
}
