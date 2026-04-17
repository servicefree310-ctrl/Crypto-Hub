import { FormEvent, useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRows, postAction } from "@/services/api";
import { hasPermission } from "@/utils/auth";

export default function RolesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const allowed = hasPermission("roles");
  const load = () => getRows("/admin/roles").then(setRows);

  useEffect(() => { load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await postAction("/admin/roles", { name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
    await load();
  };

  if (!allowed) return <div className="rounded-2xl border border-border bg-card p-6 text-destructive">You do not have permission for roles.</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Roles & Permissions</h1><p className="text-muted-foreground">Create roles for admin, support and finance teams.</p></div>
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-[220px_1fr_140px]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Role name" />
        <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Create Role</Button>
      </form>
      <DataTable title="Admin roles" rows={rows} columns={["id", "name", "description"]} />
    </div>
  );
}
