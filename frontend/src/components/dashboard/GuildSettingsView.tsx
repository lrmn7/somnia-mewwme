import { useState, useEffect, useCallback, useRef } from "react";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import clsx from "clsx";
import {
  FiCommand, FiGlobe, FiVolume2, FiSliders, FiHeadphones,
  FiRefreshCw, FiMonitor, FiAlertTriangle, FiLock,
  FiChevronDown, FiChevronUp, FiX, FiCheck, FiPlay, FiMusic,
} from "react-icons/fi";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { GuildSettings } from "@/types/player";

interface Props {
  guildId: string;
}

export default function GuildSettingsView({ guildId }: Props) {
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prefixDraft, setPrefixDraft] = useState("");
  const [languageDraft, setLanguageDraft] = useState("");
  const [locales, setLocales] = useState<string[]>(["en"]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<GuildSettings>(`/api/guild/${guildId}/settings`);
      setSettings(data);
      setPrefixDraft(data.prefix);
      setLanguageDraft(data.language);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error ?? "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchSettings();
    api.get<{ locales: string[] }>(`/api/guild/${guildId}/settings/locales`)
      .then(({ data }) => setLocales(data.locales))
      .catch(() => {});
  }, [fetchSettings, guildId]);

  async function patchField(field: string, value: unknown) {
    setSaving(field);
    try {
      await api.patch(`/api/guild/${guildId}/settings`, { [field]: value });
      toast.success(`${field} updated successfully`);
      const { data } = await api.get<GuildSettings>(`/api/guild/${guildId}/settings`);
      setSettings(data);
      setPrefixDraft(data.prefix);
      setLanguageDraft(data.language);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? `Failed to update ${field}`);
      try {
        const { data: fresh } = await api.get<GuildSettings>(`/api/guild/${guildId}/settings`);
        setSettings(fresh);
        setPrefixDraft(fresh.prefix);
        setLanguageDraft(fresh.language);
      } catch { /* keep stale */ }
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-white/40">Loading guild settings...</p>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <FiAlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm font-semibold text-red-400">{error ?? "Failed to load settings"}</p>
          <button onClick={fetchSettings} className="mt-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.1] transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6 gap-6 overflow-y-auto scrollbar-none pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Server Settings</h1>
          <p className="text-xs text-white/40">{settings.guildName}</p>
        </div>
      </div>

      {/* General Settings */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/30">
          <span className="w-0.5 h-4 rounded-full bg-purple-500" />
          General Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prefix */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Prefix" hasAccess={settings.hasPrefixAccess !== false} requirement={settings.requirementPrefix} />
            <SettingCard title="Prefix" description="Bot command prefix for this server" icon={<FiCommand className="h-5 w-5" />}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={prefixDraft}
                  onChange={(e) => setPrefixDraft(e.target.value)}
                  maxLength={10}
                  className="w-24 rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition"
                />
                <button
                  onClick={() => patchField("prefix", prefixDraft)}
                  disabled={saving === "prefix" || prefixDraft === settings.prefix || !prefixDraft}
                  className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {saving === "prefix" ? "Saving..." : "Save"}
                </button>
              </div>
            </SettingCard>
          </div>

          {/* Default Search Source */}
          <div className="relative rounded-2xl">
            <AccessGate
              settings={settings}
              field="default search source"
              hasAccess={settings.hasManageGuild === true || settings.isOwner === true || settings.isAdmin === true}
              requirement="Manager"
            />
            <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col gap-3 transition-colors duration-300 ease-out hover:bg-white/[0.04] hover:border-white/[0.12]">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:text-purple-300">
                  <FiMusic className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white">Default Search Source</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">Choose the default music search source for the web player</p>
                </div>
              </div>
              <div>
                <DefaultSourceSelector
                  settings={settings}
                  saving={saving}
                  onSelect={(source) => patchField("defaultSource", source)}
                />
              </div>
            </div>
          </div>

          {/* Voice Channel Status */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Voice Channel Status" hasAccess={settings.hasStatusVCAccess !== false} requirement={settings.requirementStatusVC} />
            <SettingCard title="Voice Channel Status" description="Show currently playing track in VC name" icon={<FiVolume2 className="h-5 w-5" />}>
              <ToggleSwitch
                checked={settings.statusVoiceChannel}
                saving={saving === "statusVoiceChannel"}
                onChange={(val) => {
                  setSettings((prev) => prev ? { ...prev, statusVoiceChannel: val } : prev);
                  patchField("statusVoiceChannel", val);
                }}
              />
            </SettingCard>
          </div>

          {/* Control Buttons */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Player Control Buttons" hasAccess={settings.hasControlButtonAccess !== false} requirement={settings.requirementControlButton} />
            <SettingCard title="Player Control Buttons" description="Show interactive control buttons on now-playing messages" icon={<FiSliders className="h-5 w-5" />}>
              <ToggleSwitch
                checked={settings.controlButton === "enable"}
                saving={saving === "controlButton"}
                onChange={(val) => {
                  setSettings((prev) => prev ? { ...prev, controlButton: val ? "enable" : "disable" } : prev);
                  patchField("controlButton", val ? "enable" : "disable");
                }}
              />
            </SettingCard>
          </div>

          {/* DJ Role */}
          <div className={clsx("relative rounded-2xl md:col-span-2", !settings.hasDjRoleAccess && "overflow-hidden")}>
            <AccessGate settings={settings} field="DJ Role" hasAccess={settings.hasDjRoleAccess !== false} requirement={settings.requirementDjRole} />
            <DjRoleCard
              settings={settings}
              saving={saving}
              patchField={patchField}
              setSettings={setSettings}
            />
          </div>
        </div>
      </section>

      {/* Player Settings */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/30">
          <span className="w-0.5 h-4 rounded-full bg-blue-500" />
          Player Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 24/7 */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="24/7 mode" hasAccess={settings.has247Access !== false} requirement={settings.requirement247} />
            <SettingCard title="24/7 Mode" description="Keep the bot in voice channel even when no one is listening" icon={<FiRefreshCw className="h-5 w-5" />}>
              <div className="flex flex-col gap-2">
                <ToggleSwitch
                  checked={settings.twentyfourseven}
                  saving={saving === "twentyfourseven"}
                  onChange={(val) => {
                    setSettings((prev) => prev ? { ...prev, twentyfourseven: val } : prev);
                    patchField("twentyfourseven", val);
                  }}
                />
                <p className="text-[10px] text-white/25">You must be in a voice channel to enable 24/7 mode.</p>
              </div>
            </SettingCard>
          </div>

          {/* Autoplay */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Autoplay" hasAccess={settings.hasAutoplaySettingAccess !== false} requirement={settings.requirementAutoplaySetting} />
            <SettingCard title="Autoplay" description="Allow the autoplay button in the player to be used in this server" icon={<FiPlay className="h-5 w-5" />}>
              <ToggleSwitch
                checked={settings.autoplaySetting ?? true}
                saving={saving === "autoplaySetting"}
                onChange={(val) => {
                  setSettings((prev) => prev ? { ...prev, autoplaySetting: val } : prev);
                  patchField("autoplaySetting", val);
                }}
              />
            </SettingCard>
          </div>

          {/* Player Setup Channel */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Player Setup Channel" hasAccess={settings.hasSetupAccess !== false} requirement={settings.requirementSetup} />
            <SettingCard title="Player Setup Channel" description="Create a dedicated song-request channel with player controls" icon={<FiMonitor className="h-5 w-5" />}>
              {settings.setup?.enable ? (
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">Active</span>
                  <button
                    onClick={() => patchField("setup", "delete")}
                    disabled={saving === "setup"}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {saving === "setup" ? "Deleting..." : "Delete Setup"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => patchField("setup", "create")}
                  disabled={saving === "setup"}
                  className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {saving === "setup" ? "Creating..." : "Create Setup Channel"}
                </button>
              )}
            </SettingCard>
          </div>

          {/* Language */}
          <div className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.01]">
            <AccessGate settings={settings} field="Language" hasAccess={settings.hasLanguageAccess !== false} requirement={settings.requirementLanguage} />
            <SettingCard title="Language" description="Bot response language" icon={<FiGlobe className="h-5 w-5" />}>
              <div className="flex items-center gap-2">
                <select
                  value={languageDraft}
                  onChange={(e) => {
                    setLanguageDraft(e.target.value);
                    patchField("language", e.target.value);
                  }}
                  disabled={saving === "language"}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500/50 transition appearance-none cursor-pointer"
                >
                  {locales.map((loc) => (
                    <option key={loc} value={loc} className="bg-[#1a1a1e] text-white">{loc}</option>
                  ))}
                </select>
              </div>
            </SettingCard>
          </div>
        </div>
      </section>

      {/* Web3 Tip Contract */}
      <Web3TipContractSection guildId={guildId} isOwner={settings.isGuildOwner === true} />
    </div>
  );
}

function AccessGate({
  settings,
  field,
  hasAccess,
  requirement,
}: {
  settings: GuildSettings;
  field: string;
  hasAccess: boolean;
  requirement?: string;
}) {
  if (hasAccess) return null;

  const isAdminReq = requirement === "Admin" || requirement === "Owner";
  const isVoterReq = requirement === "Voter";
  const lacksManageServer = !(settings.hasManageGuild || settings.isOwner || settings.isAdmin);

  if (isAdminReq) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-2xl pointer-events-auto">
        <FiLock className="h-5 w-5 text-white/70" />
        <h3 className="text-sm font-bold text-white">This Feature is Under Maintenance</h3>
        <p className="text-xs text-white/50 text-center px-4">This feature is currently unavailable. Please try again later.</p>
      </div>
    );
  }

  if (lacksManageServer) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-2xl pointer-events-auto">
        <FiLock className="h-5 w-5 text-white/70" />
        <h3 className="text-sm font-bold text-white">Manage Server Required</h3>
        <p className="text-xs text-white/50 text-center px-4">You need the Manage Server permission to change {field}.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-2xl pointer-events-auto">
      <FiLock className="h-5 w-5 text-white/70" />
      <h3 className="text-sm font-bold text-white">{isVoterReq ? "Vote Required" : "Premium Plan Required"}</h3>
      <a
        href={isVoterReq && settings.voteUrl ? settings.voteUrl : "/premium"}
        target={isVoterReq && settings.voteUrl ? "_blank" : undefined}
        rel={isVoterReq && settings.voteUrl ? "noopener noreferrer" : undefined}
        className="btn-glow relative flex items-center gap-1 overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.15] hover:border-white/25 active:scale-95"
      >
        <span className="btn-shimmer pointer-events-none absolute inset-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <span className="relative z-10">{isVoterReq ? "Vote on Top.gg" : "Get Premium"}</span>
      </a>
    </div>
  );
}

function SettingCard({
  title, description, icon, wide, children,
}: {
  title: string; description: string; icon: React.ReactNode; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={clsx(
      "group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col gap-3 cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(168,85,247,0.12)] hover:bg-white/[0.05] hover:border-white/[0.15] hover:-translate-y-0.5",
      wide && "md:col-span-2",
    )}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:text-purple-300 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-white/40 mt-0.5">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked, saving, onChange,
}: {
  checked: boolean; saving: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={saving}
      className={clsx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-purple-500" : "bg-white/[0.15]",
      )}
      role="switch"
      aria-checked={checked}
    >
      <span className={clsx(
        "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

function DjRoleCard({
  settings,
  saving,
  patchField,
  setSettings,
}: {
  settings: GuildSettings;
  saving: string | null;
  patchField: (field: string, value: unknown) => void;
  setSettings: React.Dispatch<React.SetStateAction<GuildSettings | null>>;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const roles = settings.roles ?? [];
  const selectedRole = roles.find((r) => r.id === settings.djRole.roleid);

  const handleSelectRole = (roleId: string) => {
    if (settings.djRole.enable) {
      patchField("djRole", { enable: true, roleid: roleId });
    } else {
      setSettings((prev) =>
        prev ? { ...prev, djRole: { ...prev.djRole, roleid: roleId } } : prev
      );
    }
    setDropdownOpen(false);
  };

  const handleRemoveRole = () => {
    if (settings.djRole.enable) {
      patchField("djRole", { enable: false, roleid: null });
    } else {
      setSettings((prev) =>
        prev ? { ...prev, djRole: { ...prev.djRole, roleid: null } } : prev
      );
    }
  };

  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col gap-4 transition-all duration-300 ease-out hover:bg-white/[0.04] hover:border-white/[0.12]">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60 transition-colors duration-300 group-hover:bg-white/[0.1] group-hover:text-white/80">
          <FiHeadphones className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">DJ Mode</h3>
          <p className="text-[11px] text-white/40 mt-0.5">Restrict music commands to DJ roles</p>
        </div>
        <ToggleSwitch
          checked={settings.djRole.enable}
          saving={saving === "djRole"}
          onChange={(val) => {
            if (val) {
              const roleid = settings.djRole.roleid?.trim() || null;
              if (!roleid) {
                toast.error("Select a role before enabling DJ Mode");
                return;
              }
              patchField("djRole", { enable: true, roleid });
            } else {
              patchField("djRole", { enable: false, roleid: null });
            }
          }}
        />
      </div>

      {/* Role dropdown */}
      <div ref={containerRef} className="relative">
        <p className="text-xs font-semibold text-white/30 mb-1.5">DJ Roles</p>
        <button
          type="button"
          onClick={() => !settings.djRole.enable && setDropdownOpen((o) => !o)}
          disabled={settings.djRole.enable}
          className={clsx(
            "flex w-full items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-left transition focus:outline-none focus:border-purple-500/50",
            settings.djRole.enable
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-white/[0.2] hover:bg-white/[0.06] cursor-pointer"
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 min-h-[28px]">
            {selectedRole ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-300">
                @{selectedRole.name}
                {!settings.djRole.enable && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveRole(); }}
                    className="flex items-center justify-center rounded-full hover:bg-white/10 transition p-0.5"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                )}
              </span>
            ) : (
              <span className="text-sm text-white/30">Select a role...</span>
            )}
          </div>
          {dropdownOpen ? (
            <FiChevronUp className="h-4 w-4 text-white/40 shrink-0" />
          ) : (
            <FiChevronDown className="h-4 w-4 text-white/40 shrink-0" />
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#1a1a1e] shadow-2xl scrollbar-none">
            {roles.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/30 text-center">No roles found</div>
            ) : (
              roles.map((role) => {
                const isSelected = role.id === settings.djRole.roleid;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.id)}
                    className={clsx(
                      "flex w-full items-center justify-between px-3 py-2.5 text-sm text-left transition-colors",
                      isSelected
                        ? "bg-purple-500/10 text-purple-300 border-l-2 border-purple-500"
                        : "text-white/80 hover:bg-white/[0.06] border-l-2 border-transparent",
                    )}
                  >
                    <span className="font-medium">@{role.name}</span>
                    {isSelected && <FiCheck className="h-4 w-4 text-purple-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Source accent colours (static strings so Tailwind can include them) ───────
const SOURCE_STYLES: Record<string, { border: string; bg: string; text: string; check: string }> = {
  spotify:      { border: "border-green-500/50",  bg: "bg-green-500/10",  text: "text-green-300",  check: "text-green-400"  },
  apple:        { border: "border-pink-500/50",   bg: "bg-pink-500/10",   text: "text-pink-300",   check: "text-pink-400"   },
  soundcloud:   { border: "border-orange-500/50", bg: "bg-orange-500/10", text: "text-orange-300", check: "text-orange-400" },
  deezer:       { border: "border-purple-500/50", bg: "bg-purple-500/10", text: "text-purple-300", check: "text-purple-400" },
  tidal:        { border: "border-blue-500/50",   bg: "bg-blue-500/10",   text: "text-blue-300",   check: "text-blue-400"   },
  youtube:      { border: "border-red-500/50",    bg: "bg-red-500/10",    text: "text-red-300",    check: "text-red-400"    },
  youtube_music: { border: "border-red-500/50",    bg: "bg-red-500/10",    text: "text-red-300",    check: "text-red-400"    },
};

const SOURCE_LIST = [
  { id: "spotify",      name: "Spotify"       },
  { id: "apple",        name: "Apple Music"   },
  { id: "soundcloud",   name: "SoundCloud"    },
  { id: "deezer",       name: "Deezer"        },
  { id: "tidal",        name: "Tidal"         },
  { id: "youtube",      name: "YouTube"       },
  { id: "youtube_music", name: "YouTube Music" },
];

function getAccessBadgeLabel(requirement: string): string | null {
  switch (requirement.toLowerCase()) {
    case "member":       return null;
    case "voter":        return "Voter";
    case "premium":
    case "patreonuser":
    case "pateronguild":
    case "kofiuser":
    case "kofiguild":
    case "premiumrole":  return "Premium";
    case "admin":
    case "owner":        return "Maintenance";
    case "manager":      return "Maintenance";
    default:             return null;
  }
}

function DefaultSourceSelector({
  settings,
  saving,
  onSelect,
}: {
  settings: GuildSettings;
  saving: string | null;
  onSelect: (source: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentSource = settings.defaultSource ?? "spotify";
  const canChange =
    settings.hasManageGuild === true || settings.isOwner === true || settings.isAdmin === true;
  const isSaving = saving === "defaultSource";

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentEntry = SOURCE_LIST.find((s) => s.id === currentSource) ?? SOURCE_LIST[0];
  const currentAccess = settings.sourceAccess?.[currentSource];
  const currentBadge = getAccessBadgeLabel(currentAccess?.requirement ?? "Member");
  const currentStyle = SOURCE_STYLES[currentSource] ?? SOURCE_STYLES.spotify;

  return (
    <div ref={ref} className="relative w-full max-w-xs pt-1">
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => canChange && !isSaving && setOpen((v) => !v)}
        disabled={!canChange || isSaving}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
          open
            ? "border-white/[0.2] bg-white/[0.08]"
            : canChange
            ? "border-white/[0.1] bg-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.08]"
            : "border-white/[0.06] bg-white/[0.03] opacity-40 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx("text-sm font-bold truncate", "text-white/80")}>
            {currentEntry.name}
          </span>
          {currentBadge && (
            <span className={clsx(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
              currentAccess?.requirement?.toLowerCase() === "voter"
                ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                : "border-white/[0.15] bg-white/[0.06] text-white/40",
            )}>
              {currentBadge}
            </span>
          )}
        </div>
        <FiChevronDown className={clsx(
          "h-4 w-4 shrink-0 transition-transform duration-200 text-white/40",
          open && "rotate-180",
        )} />
      </button>

      {/* Dropdown list */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl overflow-hidden">
          {SOURCE_LIST.map(({ id, name }) => {
            const access = settings.sourceAccess?.[id];
            const hasAccess = access?.hasAccess !== false;
            const requirement = access?.requirement ?? "Member";
            const badgeLabel = getAccessBadgeLabel(requirement);
            const isSelected = currentSource === id;
            const style = SOURCE_STYLES[id] ?? SOURCE_STYLES.spotify;
            const clickable = hasAccess && !isSaving;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (!clickable) return;
                  onSelect(id);
                  setOpen(false);
                }}
                disabled={!clickable}
                title={!hasAccess ? `Requires ${badgeLabel}` : undefined}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors duration-150",
                  isSelected
                    ? "bg-white/[0.08] border-l-2 border-white/40"
                    : "border-l-2 border-transparent",
                  hasAccess
                    ? "hover:bg-white/[0.06] cursor-pointer"
                    : "cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={clsx(
                    "text-xs font-bold truncate",
                    isSelected ? "text-white" : "text-white/80",
                  )}>
                    {name}
                  </span>
                  {badgeLabel && (
                    <span className={clsx(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                      requirement.toLowerCase() === "voter"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                        : "border-white/[0.15] bg-white/[0.06] text-white/40",
                    )}>
                      {badgeLabel}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <FiCheck className="h-3.5 w-3.5 shrink-0 text-white/60" />
                )}
              </button>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

function Web3TipContractSection({ guildId, isOwner }: { guildId: string; isOwner: boolean }) {
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();

  useEffect(() => {
    api.get(`/api/web3/guild/${guildId}/contract`)
      .then(({ data }: { data: { contractAddress: string | null } }) => setContractAddress(data.contractAddress))
      .catch(() => {})
      .finally(() => setTipLoading(false));
  }, [guildId]);

  const handleCreate = async () => {
    if (!isOwner) {
      toast.error("Only the server owner can create a tip contract");
      return;
    }

    if (!hasWallet) {
      toast.error("No embedded wallet available. Please wait for wallet to initialize or refresh the page.");
      return;
    }

    setCreating(true);
    try {
      const { Contract } = await import("ethers");
      const { TIP_FACTORY_ABI, contracts: web3Contracts } = await import("@/lib/web3");

      if (!web3Contracts.tipFactory) {
        toast.error("Tip factory contract not deployed yet");
        setCreating(false);
        return;
      }

      // Get Privy embedded wallet provider
      const { signer, address: ownerAddress } = await getProviderAndSigner();
      const factory = new Contract(web3Contracts.tipFactory, TIP_FACTORY_ABI, signer);

      toast.info("Creating tip contract on Somnia Network...");
      const tx = await factory.createGuildTip(guildId, ownerAddress);
      await tx.wait();

      const newContractAddress = await factory.getGuildContract(guildId);

      await api.post("/api/web3/guild/contract", {
        guildId,
        contractAddress: newContractAddress,
      });

      setContractAddress(newContractAddress);
      toast.success("Tip contract created!");
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Failed to create contract");
      }
    } finally {
      setCreating(false);
    }
  };

  if (tipLoading) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/30">
        <span className="w-0.5 h-4 rounded-full bg-purple-500" />
        Tip Guild Contract
      </h2>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
        {contractAddress ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span className="text-xs font-semibold text-purple-400">Tip Contract Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Contract:</span>
              <a
                href={`https://somnia.blockscout.com/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-purple-400 hover:text-purple-300 underline"
              >
                {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Members can tip this server using USDC on Somnia Network.
            </p>
          </div>
        ) : isOwner ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Create a tip contract to allow members to send USDC tips to this server.
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 disabled:opacity-40 transition-all"
            >
              {creating ? "Creating..." : "Create Tip Contract"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No tip contract for this server. Only the server owner can create one.
          </p>
        )}
      </div>
    </section>
  );
}