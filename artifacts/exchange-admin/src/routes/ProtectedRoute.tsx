import { Navigate, Outlet } from "react-router-dom";
import { getSession, hasPermission } from "@/utils/auth";

export default function ProtectedRoute({ permission }: { permission?: string }) {
  const session = getSession();
  if (!session?.token) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;
  return <Outlet />;
}
