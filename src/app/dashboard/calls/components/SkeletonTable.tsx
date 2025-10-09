export const SkeletonTable = () => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-neutral-800">
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Date
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Caller Name
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Phone Number
          </th>
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Status
          </th>
          {/* <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Disconnection Reason Test
          </th> */}
          <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-300">
            Duration
          </th>
          <th className="text-center py-3 px-4 text-sm font-semibold text-neutral-300">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {[...Array(10)].map((_, i) => (
          <tr key={i} className="border-b border-neutral-800/50 animate-pulse">
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-32"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-24"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-6 bg-neutral-700 rounded w-20"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-24"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-16"></div>
            </td>
            <td className="py-4 px-4">
              <div className="h-4 bg-neutral-700 rounded w-24"></div>
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
