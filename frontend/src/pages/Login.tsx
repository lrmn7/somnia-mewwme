import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "@/lib/config";

export default function Login() {
  const { status, login } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      login();
    } else if (status === "authenticated") {
      window.location.href = "/servers";
    }
  }, [status, login]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to Discord login...</p>
      </div>
    </div>
  );
}
