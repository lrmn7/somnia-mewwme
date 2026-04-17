import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { FiHome, FiUser, FiServer, FiGlobe, FiBarChart2, FiHeart, FiMusic, FiRadio, FiFolder, FiSettings, FiLogOut, FiMessageCircle, FiUsers } from "react-icons/fi";
import type { DashboardView, DiscordUser } from "@/types/player";

interface Props {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onLikedSongsOpen: () => void;
  likedCount: number;
  user: DiscordUser | null;
  onLogout: () => void;
  guildName?: string;
  guildIcon?: string | null;
  connected?: boolean;
  isPremium?: boolean;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40 md:hidden lg:block">
      {label}
    </p>
  );
}

function NavItem({
  icon,
  label,
  href,
  onClick,
  active = false,
  badge,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}) {
  const baseClass = clsx(
    "group flex w-full items-center gap-3 rounded-xl py-2.5 transition-all duration-200",
    "px-3 md:justify-center md:px-0 md:py-3 lg:justify-start lg:px-3 lg:py-2.5",
    active && "bg-white/[0.08] font-semibold text-white",
    !active && !danger && "text-white/50 hover:bg-white/5 hover:scale-[1.02] hover:text-white",
    danger && "text-red-400 hover:bg-red-500/10 hover:scale-[1.02]"
  );
  const iconClass = clsx(
    "shrink-0 text-[18px] transition-colors duration-200",
    active ? "text-rose-400" : "text-white/50 group-hover:text-white/80"
  );
  const inner = (
    <>
      <span className={iconClass} title={label}>{icon}</span>
      <span className="block truncate text-sm md:hidden lg:block">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 md:hidden lg:flex">
          {badge}
        </span>
      )}
    </>
  );
  if (href) {
    return <Link to={href} className={baseClass} title={label}>{inner}</Link>;
  }
  return <button onClick={onClick} className={baseClass} title={label}>{inner}</button>;
}

export default function PlayerSidebar({
  activeView,
  onViewChange,
  onLikedSongsOpen,
  likedCount,
  user,
  onLogout,
  guildName,
  guildIcon,
  connected = true,
  isPremium = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user?.discriminator || "0") % 5}.png`;
  const displayName = user?.global_name ?? user?.username ?? "User";

  const isPlayerActive = activeView === "player";
  const isGuildStatsActive = activeView === "guild-stats";
  const isRadioActive = activeView === "radio";
  const isPlaylistsActive = activeView === "playlists";
  const isSettingsActive = activeView === "settings";
  const isAiChatActive = activeView === "ai-chat";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 md:hidden flex h-10 w-6 flex-col items-center justify-center gap-1 rounded-r-lg bg-white/[0.03] border border-l-0 border-white/[0.08] text-white/70 shadow-xl hover:text-white transition backdrop-blur-md"
        >
          <span className="block h-px w-3 bg-current" />
          <span className="block h-px w-3 bg-current" />
          <span className="block h-px w-3 bg-current" />
        </button>
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-40 flex h-full flex-col overflow-y-auto overflow-x-hidden",
          "bg-white/[0.02] border-r border-white/[0.08] backdrop-blur-md",
          "transition-transform duration-300 ease-in-out",
          "w-72 md:w-16 lg:w-60",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className="hidden lg:flex w-full shrink-0 flex-col justify-end"
          style={{
            minHeight: "5rem",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2.5 w-full">
            <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden border-2 border-white/15">
              {guildIcon ? (
                <img src={guildIcon} alt={guildName ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-500/35 text-white text-[0.85rem] font-bold">
                  {guildName?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-white font-bold text-sm leading-tight truncate">
                {guildName ?? "Unknown Server"}
              </span>
              <span
                className="text-[0.65rem] font-semibold leading-none"
                style={{
                  letterSpacing: "0.03em",
                  color: isPremium ? "#34d399" : "rgba(255,255,255,0.35)",
                }}
              >
                Premium: {isPremium ? "Activated" : "Not Activated"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex lg:hidden items-center justify-between px-4 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 shrink-0">
              {guildIcon ? (
                <img src={guildIcon} alt={guildName ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-500/20 text-sm font-bold text-white">
                  {guildName?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 md:hidden lg:flex">
              <span className="text-sm font-semibold text-white truncate">{guildName ?? "Unknown Server"}</span>
              <span
                className="text-[0.6rem] font-semibold leading-none"
                style={{
                  letterSpacing: "0.03em",
                  color: isPremium ? "#34d399" : "rgba(255,255,255,0.35)",
                }}
              >
                Premium: {isPremium ? "Activated" : "Not Activated"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="hidden md:flex lg:hidden justify-center py-3 shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10">
            {guildIcon ? (
              <img src={guildIcon} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-500/20 text-[11px] font-bold text-white">
                {guildName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </div>

        <div className="mx-3 mb-1 h-px bg-white/[0.06] md:mx-2" />

        {/* MAIN */}
        <nav className="flex flex-col gap-0.5 px-2">
          <SectionLabel label="Main" />
          <NavItem icon={<FiHome />} label="Home" href="/" />
          <NavItem icon={<FiUser />} label="Profile" href="/profile" />
          <NavItem icon={<FiServer />} label="Servers" href="/servers" />
          <NavItem icon={<FiGlobe />} label="Global Stats" href="/global-stats" />
          <NavItem icon={<FiUsers />} label="Community" href="/community" />
        </nav>

        <div className="mx-3 my-2 h-px bg-white/[0.06] md:mx-2" />

        {/* MUSIC */}
        <nav className="flex flex-col gap-0.5 px-2">
          <SectionLabel label="Music" />
          <NavItem icon={<FiBarChart2 />} label="Guild Stats" onClick={() => { onViewChange("guild-stats"); setOpen(false); }} active={isGuildStatsActive} />
          <NavItem icon={<FiHeart />} label="Liked Songs" onClick={() => { onLikedSongsOpen(); setOpen(false); }} badge={likedCount} />
          <NavItem icon={<FiMusic />} label="Music Player" onClick={() => { onViewChange("player"); setOpen(false); }} active={isPlayerActive} />
          <NavItem icon={<FiRadio />} label="Radio" onClick={() => { onViewChange("radio"); setOpen(false); }} active={isRadioActive} />
          <NavItem icon={<FiMessageCircle />} label="AI Chat" onClick={() => { onViewChange("ai-chat"); setOpen(false); }} active={isAiChatActive} />
        </nav>

        <div className="mx-3 my-2 h-px bg-white/[0.06] md:mx-2" />

        {/* PLAYLIST */}
        <nav className="flex flex-col gap-0.5 px-2">
          <SectionLabel label="Playlist" />
          <NavItem icon={<FiFolder />} label="Custom Playlist" onClick={() => { onViewChange("playlists"); setOpen(false); }} active={isPlaylistsActive} />
        </nav>

        <div className="mx-3 my-2 h-px bg-white/[0.06] md:mx-2" />

        {/* SETTING */}
        <nav className="flex flex-col gap-0.5 px-2">
          <SectionLabel label="Setting" />
          <NavItem icon={<FiSettings />} label="Guild Settings" onClick={() => { onViewChange("settings"); setOpen(false); }} active={isSettingsActive} />
        </nav>

        <div className="flex-1" />

        {/* User card at bottom */}
        {user && (
          <div className="shrink-0 px-2 pb-4 md:px-1 lg:px-2">
            <div className="mx-1 mb-3 h-px bg-white/[0.06]" />
            <div
              className={clsx(
                "flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5",
                "md:justify-center md:px-2 lg:justify-start lg:px-3"
              )}
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10">
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1 block md:hidden lg:block">
                <p className="truncate text-xs font-semibold leading-tight text-white">{displayName}</p>
                <p className={clsx("text-[10px] leading-tight", connected ? "text-green-400" : "text-white/40")}>
                  {connected ? "Online" : "Connecting…"}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="shrink-0 rounded-md p-1 text-white/40 transition hover:text-red-400 block md:hidden lg:block"
              >
                <FiLogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
