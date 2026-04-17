import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = {
  label: string;
  onClick: (row: Record<string, any>) => void;
  danger?: boolean;
};

type Props = {
  title: string;
  rows: Record<string, any>[];
  columns: string[];
  actions?: Action[];
};

export default function DataTable({ title, rows, columns, actions = [] }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} live database records</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search / filter" className="pl-9" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {columns.map((column) => <th key={column} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{column}</th>)}
              {actions.length > 0 && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={row.id ?? index} className="border-b border-border/50 hover:bg-secondary/20">
                {columns.map((column) => <td key={column} className="px-4 py-3 whitespace-nowrap">{String(row[column] ?? "")}</td>)}
                {actions.length > 0 && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {actions.map((action) => (
                        <Button key={action.label} size="sm" variant="outline" onClick={() => action.onClick(row)} className={action.danger ? "border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" : ""}>
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!visible.length && <tr><td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + (actions.length ? 1 : 0)}>No records found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</Button>
        </div>
      </div>
    </section>
  );
}
