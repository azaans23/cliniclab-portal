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
import { supabase, MessagesTaken } from "@/lib/supabase";

interface MessageWithDetails extends MessagesTaken {
  caller_name: string;
  caller_phone: string;
  message_content: string;
  date_time: string;
}

// Skeleton components
const SkeletonTable = () => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-800">
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Date
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Caller
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Phone
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Message
          </th>
          <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-300">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {[...Array(5)].map((_, i) => (
          <tr key={i} className="border-b border-neutral-800/50 animate-pulse">
            <td className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
                <div className="h-4 bg-neutral-700 rounded w-24"></div>
              </div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-32"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-48"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-20"></div>
            </td>
            <td className="py-4 px-4">
              <div className="w-8 h-8 bg-neutral-700 rounded mx-auto"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] =
    useState<MessageWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);

      const { data, error } = await supabase
        .from("messages_taken")
        .select("*")
        .eq("client_id", user.id)
        .order("date_time", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (message: MessageWithDetails) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedMessage(null);
    setIsModalOpen(false);
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

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");

    // Get the last 10 digits (in case there's a country code)
    const last10 = cleaned.slice(-10);

    // Format as (XXX) XXX-XXXX
    if (last10.length === 10) {
      return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
    }

    // Return original if not 10 digits
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Messages</h1>
          <p className="text-neutral-400 mt-2">
            {loading
              ? "Loading..."
              : `${messages.length} message${
                  messages.length !== 1 ? "s" : ""
                } received`}
          </p>
        </div>
        <Button
          onClick={fetchMessages}
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

      {/* Messages Table */}
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Received Messages</CardTitle>
          <CardDescription className="text-neutral-400">
            Messages taken by your AI receptionist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : messages.length === 0 ? (
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No messages yet
              </h3>
              <p className="text-neutral-400">
                Messages from callers will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                      Caller
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
                      Message
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr
                      key={message.id}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="text-neutral-400 text-sm">
                          {formatDate(message.date_time)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {message.caller_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white font-medium">
                            {message.caller_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-neutral-300">
                          {formatPhoneNumber(message.caller_phone)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-neutral-300 max-w-xs">
                          {truncateMessage(message.message_content)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          onClick={() => openModal(message)}
                          variant="ghost"
                          size="sm"
                          className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Modal */}
      {isModalOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white">Message Details</h2>
              <Button
                onClick={closeModal}
                variant="ghost"
                size="sm"
                className="text-neutral-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Caller Info */}
              <div className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-lg">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {selectedMessage.caller_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedMessage.caller_name}
                  </h3>
                  <p className="text-neutral-400">
                    {selectedMessage.caller_phone}
                  </p>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-3">
                  Message Content
                </h4>
                <div className="p-4 bg-neutral-800/30 rounded-lg border border-neutral-700">
                  <p className="text-white leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.message_content}
                  </p>
                </div>
              </div>

              {/* Message Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 mb-2">
                    Received Date
                  </h4>
                  <p className="text-white">
                    {new Date(selectedMessage.date_time).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
              <Button
                onClick={closeModal}
                variant="outline"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  // Add copy to clipboard functionality
                  navigator.clipboard.writeText(
                    selectedMessage.message_content
                  );
                }}
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
