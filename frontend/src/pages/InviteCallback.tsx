import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function InviteCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const guildId = searchParams.get("guild_id");
    if (guildId) {
      navigate(`/servers?invited=${guildId}`, { replace: true });
    } else {
      navigate("/servers", { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">Redirecting back to servers…</p>
    </div>
  );
}
