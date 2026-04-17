export type AdminSession = {
  token: string;
  admin: {
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
};

const key = "cryptox_admin_session";

export function saveSession(session: AdminSession) {
  sessionStorage.setItem(key, JSON.stringify(session));
}

export function getSession(): AdminSession | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function getAdmin() {
  return getSession()?.admin ?? null;
}

export function hasPermission(permission: string) {
  const admin = getAdmin();
  return admin?.role === "admin" || Boolean(admin?.permissions.includes(permission));
}

export function clearSession() {
  sessionStorage.removeItem(key);
}
