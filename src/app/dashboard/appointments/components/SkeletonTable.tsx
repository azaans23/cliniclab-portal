"use client";

export const SkeletonTable = () => (
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
              <div className="h-4 bg-neutral-700 rounded w-20"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-20"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-16"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
