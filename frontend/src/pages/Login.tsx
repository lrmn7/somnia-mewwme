import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const loginTriggered = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      loginTriggered.current = false;
      navigate("/servers", { replace: true });
    }
  }, [status, login, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === "loading" ? (
          <>
            <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking your session...</p>
          </>
        ) : (
          <button
            onClick={() => {
              if (loginTriggered.current) return;
              loginTriggered.current = true;
              login();
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Login with Discord
          </button>
        )}
      </div>
    </div>
  );
}
