import { useEffect, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import DataTable from "@/components/admin/DataTable";
import { blockUser, listUsers } from "@/services/api";

export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [target, setTarget] = useState<any | null>(null);
  const load = () => listUsers().then(setRows);

  useEffect(() => { load(); }, []);

  const confirm = async () => {
    if (!target) return;
    await blockUser(target.id);
    setTarget(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">User Management</h1><p className="text-muted-foreground">Search, view, block and unblock users.</p></div>
      <DataTable title="Exchange users" rows={rows} columns={["id", "name", "email", "role", "kyc", "status", "balance"]} actions={[{ label: "Block / Unblock", onClick: setTarget, danger: true }]} />
      <ConfirmModal open={Boolean(target)} title="Update user status" description={`Block/unblock ${target?.email ?? "this user"}?`} confirmText="Apply" onClose={() => setTarget(null)} onConfirm={confirm} />
    </div>
  );
}
