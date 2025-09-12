"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewTicketFormProps {
  onSubmit: (data: { title: string; description: string }) => void;
  onCancel: () => void;
}

export const NewTicketForm = ({ onSubmit, onCancel }: NewTicketFormProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ title: "", description: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title" className="text-white">
            Title *
          </Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Brief description of your issue"
            className="mt-2 bg-neutral-800 border-neutral-700 text-white placeholder-neutral-400"
            required
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-white">
            Description *
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Please provide detailed information about your issue..."
            rows={8}
            className="mt-2 w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none min-h-[200px] max-h-[400px] overflow-y-auto"
            required
          />
          <p className="text-xs text-neutral-500 mt-1">
            {formData.description.length}/2000 characters
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !formData.title.trim() ||
              !formData.description.trim()
            }
            className="bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </form>
    </div>
  );
};
