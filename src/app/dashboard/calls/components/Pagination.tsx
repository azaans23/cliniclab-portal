"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  callsCount: number;
  paginationLoaded: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export const Pagination = ({
  hasNextPage,
  hasPrevPage,
  currentPage,
  callsCount,
  paginationLoaded,
  onNextPage,
  onPrevPage,
}: PaginationProps) => {
  if (!hasNextPage && !hasPrevPage) {
    return null;
  }

  return (
    <Card className="bg-neutral-900/80 border-neutral-800">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            Page {currentPage} • {callsCount} calls on this page
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              variant="outline"
              size="sm"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Previous
            </Button>
            <Button
              onClick={onNextPage}
              disabled={!hasNextPage || !paginationLoaded}
              variant="outline"
              size="sm"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
