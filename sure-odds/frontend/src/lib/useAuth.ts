// Re-export from AuthContext so existing imports continue to work.
// Auth state is now shared via AuthProvider — getSession() is called once per
// page load instead of once per component that uses this hook.
export { useAuth } from "./AuthContext";
