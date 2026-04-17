import { useEffect, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import DataTable from "@/components/admin/DataTable";
import { getRows, postAction } from "@/services/api";
import { hasPermission } from "@/utils/auth";

type Props = { title: string; endpoint: string; columns: string[]; actionEndpoint?: string; actionLabel?: string; permission?: string };

export default function RecordsPage({ title, endpoint, columns, actionEndpoint, actionLabel = "Approve / Reject", permission }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [target, setTarget] = useState<any | null>(null);
  const allowed = permission ? hasPermission(permission) : true;
  const load = () => getRows(endpoint).then(setRows);

  useEffect(() => { load(); }, [endpoint]);

  const approve = async (status: "Approved" | "Rejected") => {
    if (!target || !actionEndpoint) return;
    await postAction(actionEndpoint, { id: target.id, status });
    setTarget(null);
    await load();
  };

  if (!allowed) return <div className="rounded-2xl border border-border bg-card p-6 text-destructive">You do not have permission for this section.</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">{title}</h1><p className="text-muted-foreground">Live API data with search, pagination and action modals.</p></div>
      <DataTable title={title} rows={rows} columns={columns} actions={actionEndpoint ? [{ label: actionLabel, onClick: setTarget }] : []} />
      <ConfirmModal open={Boolean(target)} title={actionLabel} description={`Apply action to record #${target?.id ?? ""}?`} confirmText="Approve" onClose={() => setTarget(null)} onConfirm={() => approve(actionLabel === "Toggle" ? "Approved" : "Approved")} />
      {target && actionLabel !== "Toggle" && <div className="fixed inset-x-0 bottom-8 z-50 flex justify-center"><button onClick={() => approve("Rejected")} className="rounded-full border border-destructive/50 bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground shadow-xl">Reject selected request</button></div>}
    </div>
  );
}
