import React from 'react';

interface TableProps {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto my-4 border border-border rounded-[8px]">
      <table className="min-w-full divide-y divide-border text-sm text-left">
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-muted/80 font-semibold text-foreground">
    {children}
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="bg-card divide-y divide-border">
    {children}
  </tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="hover:bg-muted/50 transition-colors">
    {children}
  </tr>
);

export const TableHeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="pl-4 pr-10 py-3 border-b border-border uppercase tracking-wider text-[11px]">
    {children}
  </th>
);

/**
 * TableCell component with whitespace-normal to prevent layout breakage on narrow viewports
 * when cells contain long content.
 */
export const TableCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="pl-4 pr-10 py-3 whitespace-normal text-muted-foreground">
    {children}
  </td>
);
