"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FiltersProps {
  callType: "inbound" | "outbound";
  startDate: string;
  endDate: string;
  pageSize: number;
  onCallTypeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
}

export const Filters = ({
  callType,
  startDate,
  endDate,
  pageSize,
  onCallTypeChange,
  onStartDateChange,
  onEndDateChange,
  onPageSizeChange,
}: FiltersProps) => {
  return (
    <Card className="bg-neutral-900/80 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white">Filters</CardTitle>
        <CardDescription className="text-neutral-400">
          Filter calls by type and date range
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-200">
              Call Type
            </Label>
            <select
              value={callType}
              onChange={(e) => onCallTypeChange(e.target.value)}
              className="w-full h-10 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 focus:border-sky-500 focus:ring-sky-500/20"
            >
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-200">
              Start Date
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white focus:border-sky-500 focus:ring-sky-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-200">
              End Date
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white focus:border-sky-500 focus:ring-sky-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-200">
              Page Size
            </Label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-full h-10 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 focus:border-sky-500 focus:ring-sky-500/20"
            >
              <option value={10}>10 calls</option>
              <option value={15}>15 calls</option>
              <option value={20}>20 calls</option>
              <option value={25}>25 calls</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
