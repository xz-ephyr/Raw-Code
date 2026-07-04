import React from 'react';

interface TableProps {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto my-4 border border-neutral-700 rounded-[8px]">
      <table className="min-w-full divide-y divide-neutral-700 text-sm text-left">
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-neutral-800/80 font-semibold text-neutral-300">
    {children}
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="bg-[#1a1a1a] divide-y divide-neutral-800">
    {children}
  </tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="hover:bg-neutral-800/50 transition-colors">
    {children}
  </tr>
);

export const TableHeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="pl-4 pr-10 py-3 border-b border-neutral-700 uppercase tracking-wider text-[11px]">
    {children}
  </th>
);

/**
 * TableCell component with whitespace-normal to prevent layout breakage on narrow viewports
 * when cells contain long content.
 */
export const TableCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="pl-4 pr-10 py-3 whitespace-normal text-neutral-400">
    {children}
  </td>
);
