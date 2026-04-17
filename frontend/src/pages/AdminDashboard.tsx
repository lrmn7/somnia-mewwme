import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ShieldCheck, 
  UserPlus, 
  Server, 
  Trash2, 
  Ban, 
  Settings2, 
  Activity,
  History,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  LifeBuoy,
  Ticket,
  SendHorizonal,
  Hash,
  FolderOpen,
  Users,
  RefreshCw,
  Pencil,
  Blocks
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminContractPanel from "@/components/dashboard/AdminContractPanel";

const MotionDiv = motion.div as any;

export default function AdminDashboard() {
  const { user, status } = useAuth();
  const { toast } = useToast();
  const [targetId, setTargetId] = useState("");
  const [duration, setDuration] = useState("1month");
  const [tier, setTier] = useState("guild_basic");
  const [type, setType] = useState<"user" | "guild">("user");
  const [submitting, setSubmitting] = useState(false);
  const [premiumData, setPremiumData] = useState<{ users: any[]; guilds: any[] }>({ users: [], guilds: [] });
  const [blacklistData, setBlacklistData] = useState<{ users: string[]; guilds: string[] }>({ users: [], guilds: [] });
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [ticketEnabled, setTicketEnabled] = useState(false);
  const [ticketGuildId, setTicketGuildId] = useState("");
  const [ticketGuildSaved, setTicketGuildSaved] = useState(false);
  const [ticketGuildData, setTicketGuildData] = useState<{
    guildName: string;
    guildIcon: string | null;
    textChannels: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    roles: { id: string; name: string; color: string }[];
  } | null>(null);
  const [ticketForm, setTicketForm] = useState({
    channelId: "", openCategory: "", closeCategory: "", roleId: "",
    embedTitle: "", embedDescription: "", embedThumbnail: "", embedImage: "", embedFooter: "",
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketConfig, setTicketConfig] = useState<any>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [loadingGuildData, setLoadingGuildData] = useState(false);
  const [closingTicket, setClosingTicket] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState(false);

  const [helpdeskEnabled, setHelpdeskEnabled] = useState(false);
  const [helpdeskGuildId, setHelpdeskGuildId] = useState("");
  const [helpdeskChannelId, setHelpdeskChannelId] = useState("");
  const [helpdeskSending, setHelpdeskSending] = useState(false);
  const [helpdeskDeploys, setHelpdeskDeploys] = useState<any[]>([]);
  const [helpdeskDeleting, setHelpdeskDeleting] = useState<string | null>(null);

  const [helperEnabled, setHelperEnabled] = useState(false);
  const [helperGuildId, setHelperGuildId] = useState("");
  const [helperChannelId, setHelperChannelId] = useState("");
  const [helperSending, setHelperSending] = useState(false);
  const [helperDeploys, setHelperDeploys] = useState<any[]>([]);
  const [helperDeleting, setHelperDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchData();
      fetchTicketData();
      fetchHelpdeskDeploys();
      fetchHelperDeploys();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingLists(true);
    try {
      const [premium, blacklist, maintenance] = await Promise.all([
        api.get("/api/admin/premium", { params: { userId: user?.id } }),
        api.get("/api/admin/blacklist", { params: { userId: user?.id } }),
        api.get("/api/admin/maintenance", { params: { userId: user?.id } })
      ]);

      if (premium.data.success) setPremiumData(premium.data.data);
      if (blacklist.data.success) setBlacklistData(blacklist.data.data);
      if (maintenance.data.success) setMaintenanceEnabled(maintenance.data.enabled);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchTicketData = async (gId?: string) => {
    setLoadingTicket(true);
    try {
      const configRes = await api.get("/api/admin/ticket/config", {
        params: gId ? { guildId: gId } : {},
      });
      if (configRes.data.success) {
        let cfg = configRes.data.data;
        if (Array.isArray(cfg) && cfg.length > 0) cfg = cfg[0];
        if (cfg && !Array.isArray(cfg)) {
          setTicketEnabled(cfg.enabled ?? false);
          setTicketGuildId(cfg.guildId ?? "");
          if (cfg.channelId && cfg.openCategory && cfg.closeCategory && cfg.roleId) {
            setTicketConfig(cfg);
            if (cfg.guildId) {
              setTicketGuildSaved(true);
              setTicketForm({
                channelId: cfg.channelId ?? "",
                openCategory: cfg.openCategory ?? "",
                closeCategory: cfg.closeCategory ?? "",
                roleId: cfg.roleId ?? "",
                embedTitle: cfg.embed?.title ?? "",
                embedDescription: cfg.embed?.description ?? "",
                embedThumbnail: cfg.embed?.thumbnail ?? "",
                embedImage: cfg.embed?.image ?? "",
                embedFooter: cfg.embed?.footer ?? "",
              });
              await fetchGuildData(cfg.guildId, true);
            }
          } else {
            setTicketConfig(null);
            if (cfg.guildId) {
              setTicketGuildSaved(true);
              await fetchGuildData(cfg.guildId, true);
            }
          }
        }
      }
      const histRes = await api.get("/api/admin/ticket/history", {
        params: gId ? { guildId: gId } : {},
      });
      if (histRes.data.success) setTicketHistory(histRes.data.data ?? []);
    } catch (err) {
      console.error("Failed to fetch ticket data", err);
    } finally {
      setLoadingTicket(false);
    }
  };

  const fetchGuildData = async (gId: string, silent = false) => {
    setLoadingGuildData(true);
    try {
      const { data } = await api.get("/api/admin/ticket/guild-data", {
        params: { guildId: gId },
      });
      if (data.success) {
        setTicketGuildData(data.data);
      }
    } catch (err: any) {
      if (!silent) {
        toast({ title: "Error", description: err.response?.data?.error || "Failed to fetch guild data.", variant: "destructive" });
      }
    } finally {
      setLoadingGuildData(false);
    }
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmAction({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  const handleGrantPremium = async () => {
    if (!targetId.trim()) return;
    setSubmitting(true);
    try {
      const endpoint = type === "user" ? "/api/admin/premium/user" : "/api/admin/premium/guild";
      const { data } = await api.post(endpoint, {
        userId: user!.id,
        targetId: targetId.trim(),
        duration,
        ...(type === "user" ? { tier } : {}),
      });

      if (data && data.success) {
        toast({
          title: "Grant Success",
          description: `Successfully granted Legacy Premium to ${type}.`,
        });
        setTargetId("");
        fetchData();
      } else throw new Error(data?.error || "Unknown Error");
    } catch (err: any) {
      toast({
        title: "Grant Failed",
        description: err.message || "Failed to grant premium.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePremium = async (id: string, type: "user" | "guild") => {
    showConfirm(
      "Revoke Premium Access?",
      `Are you sure you want to remove premium access for this ${type}? This cannot be undone.`,
      async () => {
        try {
          const { data } = await api.delete("/api/admin/premium", {
            data: { userId: user!.id, targetId: id, type }
          });
          if (data.success) {
            toast({ title: "Removed", description: "Premium access revoked successfully." });
            fetchData();
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleToggleMaintenance = async (enable: boolean) => {
    showConfirm(
      enable ? "Enable Maintenance Mode?" : "Disable Maintenance Mode?",
      enable 
        ? "This will disable ALL commands for ALL users until turned off."
        : "Users will be able to use the bot again immediately.",
      async () => {
        try {
          const { data } = await api.post("/api/admin/maintenance", { 
            userId: user!.id, 
            enable 
          });
          if (data.success) {
            setMaintenanceEnabled(enable);
            toast({ 
              title: "Updated", 
              description: `Maintenance mode is now ${enable ? "ON" : "OFF"}.` 
            });
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleToggleBlacklist = async (targetId: string, type: "user" | "guild", action: "add" | "delete") => {
    const isAdding = action === "add";
    showConfirm(
      isAdding ? "Blacklist ID?" : "Remove from Blacklist?",
      isAdding 
        ? `Bot will ignore all requests from this ${type} ID.`
        : `This ${type} will regain access to bot features.`,
      async () => {
        try {
          const { data } = isAdding
            ? await api.post("/api/admin/blacklist", { targetId, type })
            : await api.delete("/api/admin/blacklist", { data: { targetId, type } });
          if (data.success) {
            toast({ 
              title: isAdding ? "Blacklisted" : "Removed", 
              description: `Successfully ${isAdding ? "blacklisted" : "removed from blacklist"} ${type}.` 
            });
            if (isAdding) setTargetId("");
            fetchData();
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleTicketToggle = async (enabled: boolean) => {
    try {
      const { data } = await api.post("/api/admin/ticket/toggle", {
        guildId: ticketGuildId || "global",
        enabled,
      });
      if (data.success) {
        setTicketEnabled(enabled);
        toast({ title: enabled ? "Enabled" : "Disabled", description: `Ticket system ${enabled ? "enabled" : "disabled"}.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleSaveGuildId = async () => {
    if (!ticketGuildId.trim()) return;
    await fetchGuildData(ticketGuildId.trim());
    setTicketGuildSaved(true);
  };

  const handleDeployTicketSetup = async () => {
    const { channelId, openCategory, closeCategory, roleId } = ticketForm;
    if (!ticketGuildId || !channelId || !openCategory || !closeCategory || !roleId) return;
    setTicketSubmitting(true);
    try {
      const { data } = await api.post("/api/admin/ticket/setup", {
        guildId: ticketGuildId, channelId, openCategory, closeCategory, roleId,
        embed: {
          title: ticketForm.embedTitle || undefined,
          description: ticketForm.embedDescription || undefined,
          thumbnail: ticketForm.embedThumbnail || undefined,
          image: ticketForm.embedImage || undefined,
          footer: ticketForm.embedFooter || undefined,
        },
      });
      if (data.success) {
        toast({ title: "Deployed", description: data.message });
        fetchTicketData(ticketGuildId);
      } else throw new Error(data.error || "Unknown error");
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleDeleteTicketSetup = async () => {
    if (!ticketGuildId) return;
    showConfirm(
      "Remove Ticket Setup?",
      `This will delete the ticket system configuration for guild ${ticketGuildId}.`,
      async () => {
        try {
          const { data } = await api.delete("/api/admin/ticket/setup", {
            data: { guildId: ticketGuildId },
          });
          if (data.success) {
            toast({ title: "Removed", description: "Ticket setup deleted." });
            setTicketGuildSaved(false);
            setTicketGuildData(null);
            setTicketConfig(null);
            setTicketForm({ channelId: "", openCategory: "", closeCategory: "", roleId: "", embedTitle: "", embedDescription: "", embedThumbnail: "", embedImage: "", embedFooter: "" });
            fetchTicketData();
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleCloseTicket = async (ticketUserId: string, guildId: string, ticketCount: number) => {
    showConfirm(
      "Close this ticket?",
      "The ticket channel will be moved to the closed category, transcript generated, and user notified.",
      async () => {
        setClosingTicket(ticketUserId);
        try {
          const { data } = await api.post("/api/admin/ticket/close", {
            guildId,
            ticketUserId,
            ticketCount,
          });
          if (data.success) {
            toast({ title: "Closed", description: "Ticket closed successfully." });
            fetchTicketData(ticketGuildId || undefined);
          } else throw new Error(data.error || "Unknown error");
        } catch (err: any) {
          toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
        } finally {
          setClosingTicket(null);
        }
      }
    );
  };

  const handleDeleteTicket = async (ticketUserId: string, guildId: string, ticketCount: number) => {
    showConfirm(
      "Delete this ticket?",
      "This will close the ticket, delete the Discord channel permanently, and remove the history entry. This cannot be undone.",
      async () => {
        setDeletingTicket(ticketUserId);
        try {
          const { data } = await api.post("/api/admin/ticket/delete", {
            guildId,
            ticketUserId,
            ticketCount,
          });
          if (data.success) {
            toast({ title: "Deleted", description: "Ticket deleted successfully." });
            fetchTicketData(ticketGuildId || undefined);
          } else throw new Error(data.error || "Unknown error");
        } catch (err: any) {
          toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
        } finally {
          setDeletingTicket(null);
        }
      }
    );
  };

  const handleEditTicketSetup = async () => {
    const { channelId, openCategory, closeCategory, roleId } = ticketForm;
    if (!ticketGuildId || !channelId || !openCategory || !closeCategory || !roleId) return;
    setTicketSubmitting(true);
    try {
      const { data } = await api.put("/api/admin/ticket/setup", {
        guildId: ticketGuildId, channelId, openCategory, closeCategory, roleId,
        embed: {
          title: ticketForm.embedTitle || undefined,
          description: ticketForm.embedDescription || undefined,
          thumbnail: ticketForm.embedThumbnail || undefined,
          image: ticketForm.embedImage || undefined,
          footer: ticketForm.embedFooter || undefined,
        },
      });
      if (data.success) {
        toast({ title: "Updated", description: "Ticket setup updated successfully." });
        setEditingTicket(false);
        fetchTicketData(ticketGuildId);
      } else throw new Error(data.error || "Unknown error");
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleDeleteAllTicketData = async () => {
    if (!ticketGuildId) return;
    showConfirm(
      "Delete ALL Ticket Data?",
      `This will permanently delete the ticket setup, ALL ticket history, and ALL ticket data for guild ${ticketGuildId}. This action cannot be undone.`,
      async () => {
        try {
          const { data } = await api.delete("/api/admin/ticket/all", {
            data: { guildId: ticketGuildId },
          });
          if (data.success) {
            toast({ title: "Deleted", description: "All ticket data has been removed." });
            setTicketGuildSaved(false);
            setTicketGuildData(null);
            setTicketConfig(null);
            setTicketEnabled(false);
            setTicketHistory([]);
            setEditingTicket(false);
            setTicketForm({ channelId: "", openCategory: "", closeCategory: "", roleId: "", embedTitle: "", embedDescription: "", embedThumbnail: "", embedImage: "", embedFooter: "" });
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
        }
      }
    );
  };

  const fetchHelpdeskDeploys = async () => {
    try {
      const { data } = await api.get("/api/admin/helpdesk/config");
      if (data.success) setHelpdeskDeploys(data.data ?? []);
    } catch (_) {}
  };

  const fetchHelperDeploys = async () => {
    try {
      const { data } = await api.get("/api/admin/helper/config");
      if (data.success) setHelperDeploys(data.data ?? []);
    } catch (_) {}
  };

  const handleHelpdeskSend = async () => {
    if (!helpdeskGuildId || !helpdeskChannelId) return;
    setHelpdeskSending(true);
    try {
      const { data } = await api.post("/api/admin/helpdesk/send", {
        guildId: helpdeskGuildId, channelId: helpdeskChannelId,
      });
      if (data.success) {
        toast({ title: "Deployed", description: data.message });
        setHelpdeskGuildId(""); setHelpdeskChannelId("");
        setHelpdeskEnabled(false);
        fetchHelpdeskDeploys();
      } else throw new Error(data.error || "Unknown error");
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setHelpdeskSending(false);
    }
  };

  const handleDeleteHelpdeskDeploy = async (deployId: string) => {
    setHelpdeskDeleting(deployId);
    try {
      const { data } = await api.delete("/api/admin/helpdesk/deploy", { data: { deployId } });
      if (data.success) {
        toast({ title: "Deleted", description: data.message });
        fetchHelpdeskDeploys();
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setHelpdeskDeleting(null);
    }
  };

  const handleHelperSend = async () => {
    if (!helperGuildId || !helperChannelId) return;
    setHelperSending(true);
    try {
      const { data } = await api.post("/api/admin/helper/send", {
        guildId: helperGuildId, channelId: helperChannelId,
      });
      if (data.success) {
        toast({ title: "Deployed", description: data.message });
        setHelperGuildId(""); setHelperChannelId("");
        setHelperEnabled(false);
        fetchHelperDeploys();
      } else throw new Error(data.error || "Unknown error");
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setHelperSending(false);
    }
  };

  const handleDeleteHelperDeploy = async (deployId: string) => {
    setHelperDeleting(deployId);
    try {
      const { data } = await api.delete("/api/admin/helper/deploy", { data: { deployId } });
      if (data.success) {
        toast({ title: "Deleted", description: data.message });
        fetchHelperDeploys();
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setHelperDeleting(null);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-black/95 flex justify-center items-center text-white">Loading...</div>;
  }

  if (!user || user.isAdmin !== true) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-28 pb-16 sm:pb-20 max-w-6xl overflow-x-hidden">
        {/* Header Section */}
        <MotionDiv 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative"
        >
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-xl shadow-indigo-500/5">
            </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white">
                  Admin Panel 🛡️
                </span>
              </h1>
            <p className="text-zinc-400 max-w-lg text-lg">
              Authorized access only. Manage premium status, blacklist, and system maintenance.
            </p>
          </div>
        </MotionDiv>

        <Tabs defaultValue="premium" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl h-auto flex flex-wrap justify-center gap-1">
              <TabsTrigger value="premium" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all duration-300">
                <ShieldCheck className="w-4 h-4 mr-1 sm:mr-2" /> Premium
              </TabsTrigger>
              <TabsTrigger value="blacklist" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all duration-300">
                <Ban className="w-4 h-4 mr-1 sm:mr-2" /> Blacklist
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-amber-600 data-[state=active]:text-white transition-all duration-300">
                <Settings2 className="w-4 h-4 mr-1 sm:mr-2" /> System
              </TabsTrigger>
              <TabsTrigger value="ticket" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all duration-300">
                <Ticket className="w-4 h-4 mr-1 sm:mr-2" /> Ticket
              </TabsTrigger>
              <TabsTrigger value="helpdesk" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all duration-300">
                <LifeBuoy className="w-4 h-4 mr-1 sm:mr-2" /> Helpdesk
              </TabsTrigger>
              <TabsTrigger value="contracts" className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-pink-600 data-[state=active]:text-white transition-all duration-300">
                <Blocks className="w-4 h-4 mr-1 sm:mr-2" /> Contracts
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            {/* PREMIUM TAB */}
            <TabsContent value="premium">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
                {/* Grant Form */}
                <Card className="lg:col-span-5 bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                  <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                      <UserPlus className="text-indigo-400" /> Grant Premium
                    </CardTitle>
                    <CardDescription className="text-zinc-400">Assign Legacy Premium to standard users or full servers.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-8 space-y-6">
                    <div className="flex gap-4 p-1.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/50">
                      <Button
                        type="button"
                        variant={type === "user" ? "default" : "ghost"}
                        className={`flex-1 rounded-xl transition-all duration-300 ${type === "user" ? "bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white" : "text-zinc-400"}`}
                        onClick={() => setType("user")}
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> User
                      </Button>
                      <Button
                        type="button"
                        variant={type === "guild" ? "default" : "ghost"}
                        className={`flex-1 rounded-xl transition-all duration-300 ${type === "guild" ? "bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white" : "text-zinc-400"}`}
                        onClick={() => setType("guild")}
                      >
                        <Server className="w-4 h-4 mr-2" /> Guild
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-zinc-300 ml-1">Discord {type === "user" ? "User ID" : "Guild ID"}</Label>
                      <Input
                        placeholder={`Enter 18-19 digit ${type} ID`}
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="bg-zinc-950/80 border-zinc-800 h-12 px-4 rounded-xl focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-zinc-300 ml-1">Plan Duration</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="bg-zinc-950/80 border-zinc-800 h-12 rounded-xl text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="1month">1 Month</SelectItem>
                          <SelectItem value="3months">3 Months</SelectItem>
                          <SelectItem value="1year">1 Year</SelectItem>
                          <SelectItem value="lifetime">Lifetime Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {type === "user" && (
                      <div className="space-y-3">
                        <Label className="text-zinc-300 ml-1">Premium Tier</Label>
                        <Select value={tier} onValueChange={setTier}>
                          <SelectTrigger className="bg-zinc-950/80 border-zinc-800 h-12 rounded-xl text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="guild_basic">Guild Basic (1 server)</SelectItem>
                            <SelectItem value="guild_plus">Guild Plus (3 servers)</SelectItem>
                            <SelectItem value="guild_pro">Guild Pro (5 servers)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button 
                      onClick={() => showConfirm("Grant Premium?", `Confirm granting ${duration} premium to ${type} ${targetId}.`, handleGrantPremium)} 
                      disabled={submitting || !targetId.trim()} 
                      className="w-full h-14 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 font-bold text-lg rounded-2xl shadow-xl shadow-indigo-600/10 transition-all active:scale-[0.98] text-white"
                    >
                      {submitting ? "Processing..." : `Assign ${type === "user" ? "User" : "Guild"} Premium`}
                    </Button>
                  </CardContent>
                </Card>

                {/* Premium List */}
                <Card className="lg:col-span-7 bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden flex flex-col">
                  <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                        <History className="text-amber-400" /> Active Grants
                      </CardTitle>
                      <CardDescription className="text-zinc-400">Recently granted premium entities.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
                      {premiumData.users.length + premiumData.guilds.length} Total
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent overflow-x-auto">
                    {loadingLists ? (
                      <div className="p-20 text-center text-zinc-500 animate-pulse">Loading list...</div>
                    ) : (
                      <div className="space-y-8 p-6">
                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 ml-2 flex items-center gap-2">
                            <UserPlus className="w-3 h-3 text-indigo-500" /> User Grants
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-500 text-xs py-3">Target</TableHead>
                                <TableHead className="text-zinc-500 text-xs py-3">Plan</TableHead>
                                <TableHead className="text-zinc-500 text-xs py-3 text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {premiumData.users.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-12 text-zinc-600 italic">No user grants found.</TableCell>
                                </TableRow>
                              ) : premiumData.users.map((u) => (
                                <TableRow key={u.id} className="border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg overflow-hidden">
                                        {u.redeemedBy?.avatarURL ? (
                                          <img src={u.redeemedBy.avatarURL} alt="" className="w-full h-full object-cover" />
                                        ) : "👤"}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-zinc-200">{u.redeemedBy?.displayName || u.redeemedBy?.username || u.id}</span>
                                        <span className="text-[10px] text-zinc-600 font-mono tracking-tighter">{u.id}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="secondary" className="bg-zinc-900/50 text-zinc-400 border-zinc-800">{u.plan}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePremium(u.id, "user")} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </section>

                        <section>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 ml-2 flex items-center gap-2">
                            <Server className="w-3 h-3 text-indigo-500" /> Guild Grants
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-500 text-xs py-3">Target</TableHead>
                                <TableHead className="text-zinc-500 text-xs py-3">Plan</TableHead>
                                <TableHead className="text-zinc-500 text-xs py-3 text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {premiumData.guilds.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-12 text-zinc-600 italic">No guild grants found.</TableCell>
                                </TableRow>
                              ) : premiumData.guilds.map((g) => (
                                <TableRow key={g.id} className="border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg overflow-hidden">
                                        {g.redeemedBy?.GuildiconURL ? (
                                          <img src={g.redeemedBy.GuildiconURL} alt="" className="w-full h-full object-cover" />
                                        ) : "🏢"}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-zinc-200">{g.redeemedBy?.name || g.id}</span>
                                        <span className="text-[10px] text-zinc-600 font-mono tracking-tighter">{g.id}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="secondary" className="bg-zinc-900/50 text-zinc-400 border-zinc-800">{g.plan}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePremium(g.id, "guild")} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </section>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* BLACKLIST TAB */}
            <TabsContent value="blacklist">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
                <Card className="lg:col-span-4 bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden self-start">
                  <CardHeader className="bg-rose-950/20 border-b border-rose-500/10 p-4 sm:p-8">
                    <CardTitle className="text-2xl font-black flex items-center gap-2 text-rose-400 uppercase tracking-tighter">
                      <Ban className="w-6 h-6" /> Blacklist
                    </CardTitle>
                    <CardDescription className="text-rose-400/60">Block malicious IDs from system access.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-8 space-y-6">
                    <div className="flex gap-4 p-1.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/50">
                      <Button
                        type="button"
                        variant={type === "user" ? "default" : "ghost"}
                        className={`flex-1 rounded-xl transition-all duration-300 ${type === "user" ? "bg-rose-600 shadow-lg shadow-rose-600/20 text-white" : "text-zinc-400"}`}
                        onClick={() => setType("user")}
                      >
                        User
                      </Button>
                      <Button
                        type="button"
                        variant={type === "guild" ? "default" : "ghost"}
                        className={`flex-1 rounded-xl transition-all duration-300 ${type === "guild" ? "bg-rose-600 shadow-lg shadow-rose-600/20 text-white" : "text-zinc-400"}`}
                        onClick={() => setType("guild")}
                      >
                        Guild
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-zinc-300 ml-1">Entity ID</Label>
                      <Input
                        placeholder="ID to block permanently..."
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="bg-zinc-950/80 border-zinc-800 h-12 rounded-xl text-white"
                      />
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={() => handleToggleBlacklist(targetId, type, "add")}
                      disabled={!targetId.trim()}
                      className="w-full h-14 font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-rose-600/10 text-white"
                    >
                      EXECUTE BLACKLIST
                    </Button>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-8 bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                  <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">Banned Registry</CardTitle>
                      <CardDescription className="text-zinc-400">Entities currently blocked from the service.</CardDescription>
                    </div>
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-3 py-1">
                      {blacklistData.users.length + blacklistData.guilds.length} Blocked
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                       <section>
                         <h4 className="text-[10px] font-black uppercase text-rose-500 mb-6 tracking-[0.2em] flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Banned Users
                         </h4>
                         <div className="space-y-2.5">
                           {blacklistData.users.map(id => (
                             <div key={id} className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-zinc-900/40 rounded-xl border border-white/[0.03] group hover:border-rose-500/30 transition-all duration-300">
                               <span className="font-mono text-xs sm:text-sm text-zinc-400 tracking-tight truncate min-w-0">{id}</span>
                               <Button variant="ghost" size="icon" onClick={() => handleToggleBlacklist(id, "user", "delete")} className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 h-8 w-8 text-zinc-500 hover:text-white transition-all bg-zinc-800/50 hover:bg-rose-500/20">
                                 <XCircle className="w-4 h-4" />
                               </Button>
                             </div>
                           ))}
                           {blacklistData.users.length === 0 && (
                             <div className="text-center py-10 border-2 border-dashed border-zinc-800/40 rounded-2xl text-zinc-600 text-sm italic">Clean registry.</div>
                           )}
                         </div>
                       </section>
                       <section>
                         <h4 className="text-[10px] font-black uppercase text-rose-500 mb-6 tracking-[0.2em] flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Banned Guilds
                         </h4>
                         <div className="space-y-2.5">
                           {blacklistData.guilds.map(id => (
                             <div key={id} className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-zinc-900/40 rounded-xl border border-white/[0.03] group hover:border-rose-500/30 transition-all duration-300">
                               <span className="font-mono text-xs sm:text-sm text-zinc-400 tracking-tight truncate min-w-0">{id}</span>
                               <Button variant="ghost" size="icon" onClick={() => handleToggleBlacklist(id, "guild", "delete")} className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 h-8 w-8 text-zinc-500 hover:text-white transition-all bg-zinc-800/50 hover:bg-rose-500/20">
                                 <XCircle className="w-4 h-4" />
                               </Button>
                             </div>
                           ))}
                           {blacklistData.guilds.length === 0 && (
                             <div className="text-center py-10 border-2 border-dashed border-zinc-800/40 rounded-2xl text-zinc-600 text-sm italic">Clean registry.</div>
                           )}
                         </div>
                       </section>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="max-w-xl mx-auto">
                <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-[2.5rem] overflow-hidden">
                   <div className={`h-3 transition-colors duration-1000 ${maintenanceEnabled ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"}`} />
                   <CardHeader className="p-10 pb-6">
                     <CardTitle className="text-4xl font-black flex items-center justify-between text-white">
                       <span className="tracking-tighter">Maintenance Mode</span>
                       <Activity className={`w-8 h-8 ${maintenanceEnabled ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
                     </CardTitle>
                     <CardDescription className="text-lg pt-4 leading-relaxed text-zinc-400">
                       Toggle global command access. Admins bypass this setting automatically.
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="p-10 space-y-8">
                     <div className="flex items-center justify-between p-4 sm:p-8 rounded-3xl border border-zinc-800/50 bg-black/40 shadow-inner">
                       <div className="space-y-1.5">
                         <p className="font-black text-2xl text-white tracking-tight">System Status</p>
                         <p className={`flex items-center gap-2 text-sm ${maintenanceEnabled ? "text-amber-500" : "text-emerald-400"}`}>
                           {maintenanceEnabled ? (
                             <><AlertTriangle className="w-4 h-4" /> BOT DISABLED (MAINTENANCE)</>
                           ) : (
                             <><CheckCircle2 className="w-4 h-4" /> OPERATIONAL (LIVE)</>
                           )}
                         </p>
                       </div>
                       <Switch 
                         checked={maintenanceEnabled} 
                         onCheckedChange={handleToggleMaintenance} 
                         disabled={loadingLists}
                         className="scale-[2] data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-emerald-600 shadow-xl"
                        />
                     </div>
                     
                     <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex gap-5 items-start">
                        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Protocol Warning</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Activating maintenance mode will immediately terminate command processing across all distributed clusters. This should only be used for emergency fixes or scheduled structural updates.
                          </p>
                        </div>
                     </div>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ticket">
              <div className="space-y-8">

                <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-fuchsia-600/5 pointer-events-none" />
                  <CardHeader className="relative bg-gradient-to-r from-violet-950/40 to-fuchsia-950/20 border-b border-violet-500/10 p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl shadow-lg shadow-violet-500/5">
                          <Ticket className="w-7 h-7 text-violet-400" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black tracking-tight text-white">Ticket System</CardTitle>
                          <CardDescription className="text-violet-300/50 mt-0.5">Configure and manage the support ticket system.</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-black/30 rounded-2xl border border-zinc-800/50">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${ticketEnabled ? "text-emerald-400" : "text-zinc-600"}`}>
                          {ticketEnabled ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <Switch
                          checked={ticketEnabled}
                          onCheckedChange={handleTicketToggle}
                          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700 scale-110"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative p-4 sm:p-8 space-y-8">

                    <div className="space-y-3">
                      <Label className="text-zinc-300 ml-1 flex items-center gap-2 text-sm font-semibold">
                        <Server className="w-4 h-4 text-violet-400" /> Guild ID
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          placeholder="Enter Discord guild/server ID"
                          value={ticketGuildId}
                          onChange={(e) => {
                            setTicketGuildId(e.target.value);
                            if (ticketGuildSaved) { setTicketGuildSaved(false); setTicketGuildData(null); }
                          }}
                          className="bg-black/40 border-zinc-800 h-12 px-5 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white flex-1 text-base"
                        />
                        <Button
                          onClick={handleSaveGuildId}
                          disabled={!ticketGuildId.trim() || loadingGuildData}
                          className="h-12 px-8 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold text-white shadow-lg shadow-violet-600/10 transition-all active:scale-95"
                        >
                          {loadingGuildData ? "Loading..." : ticketGuildSaved ? "Reload" : "Fetch Guild"}
                        </Button>
                      </div>
                    </div>

                    {ticketGuildData && ticketGuildSaved && (
                      <>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 to-fuchsia-950/20 border border-violet-500/15">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                            {ticketGuildData.guildIcon ? <img src={ticketGuildData.guildIcon} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🏰</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-lg truncate">{ticketGuildData.guildName}</p>
                            <p className="text-xs text-zinc-500 font-mono">{ticketGuildId}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-xs px-3 py-1">
                              <Hash className="w-3 h-3 mr-1" /> {ticketGuildData.textChannels.length} Channels
                            </Badge>
                            <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20 text-xs px-3 py-1">
                              <FolderOpen className="w-3 h-3 mr-1" /> {ticketGuildData.categories.length} Categories
                            </Badge>
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs px-3 py-1">
                              <Users className="w-3 h-3 mr-1" /> {ticketGuildData.roles.length} Roles
                            </Badge>
                          </div>
                        </div>

                        {ticketConfig && !editingTicket && (
                          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-sm text-emerald-300 font-bold">Ticket system is configured</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Click Edit to modify settings, or use the danger zone to remove.</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => setEditingTicket(true)}
                              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold shadow-lg shadow-emerald-500/5 transition-all active:scale-95"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit Setup
                            </Button>
                          </div>
                        )}

                        {(!ticketConfig || editingTicket) && (
                          <>
                            {editingTicket && (
                              <div className="flex items-center gap-2 px-1">
                                <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Editing Configuration</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-violet-500/30 to-transparent" />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="space-y-2.5">
                                <Label className="text-zinc-300 ml-1 flex items-center gap-2 text-sm font-semibold">
                                  <Hash className="w-4 h-4 text-violet-400" /> Ticket Channel
                                </Label>
                                <Select value={ticketForm.channelId} onValueChange={(v) => setTicketForm(prev => ({ ...prev, channelId: v }))}>
                                  <SelectTrigger className="bg-black/40 border-zinc-800 h-12 rounded-xl text-white text-base">
                                    <SelectValue placeholder="Select channel..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                                    {ticketGuildData.textChannels.map(ch => (
                                      <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <Label className="text-zinc-300 ml-1 flex items-center gap-2 text-sm font-semibold">
                                  <Users className="w-4 h-4 text-violet-400" /> Support Role
                                </Label>
                                <Select value={ticketForm.roleId} onValueChange={(v) => setTicketForm(prev => ({ ...prev, roleId: v }))}>
                                  <SelectTrigger className="bg-black/40 border-zinc-800 h-12 rounded-xl text-white text-base">
                                    <SelectValue placeholder="Select role..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                                    {ticketGuildData.roles.map(r => (
                                      <SelectItem key={r.id} value={r.id}>
                                        <span className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                                          {r.name}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <Label className="text-zinc-300 ml-1 flex items-center gap-2 text-sm font-semibold">
                                  <FolderOpen className="w-4 h-4 text-emerald-400" /> Open Ticket Category
                                </Label>
                                <Select value={ticketForm.openCategory} onValueChange={(v) => setTicketForm(prev => ({ ...prev, openCategory: v }))}>
                                  <SelectTrigger className="bg-black/40 border-zinc-800 h-12 rounded-xl text-white text-base">
                                    <SelectValue placeholder="Select category..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                                    {ticketGuildData.categories.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <Label className="text-zinc-300 ml-1 flex items-center gap-2 text-sm font-semibold">
                                  <FolderOpen className="w-4 h-4 text-rose-400" /> Close Ticket Category
                                </Label>
                                <Select value={ticketForm.closeCategory} onValueChange={(v) => setTicketForm(prev => ({ ...prev, closeCategory: v }))}>
                                  <SelectTrigger className="bg-black/40 border-zinc-800 h-12 rounded-xl text-white text-base">
                                    <SelectValue placeholder="Select category..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                                    {ticketGuildData.categories.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-5 p-6 rounded-2xl bg-black/20 border border-zinc-800/50">
                              <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/50 to-transparent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Embed Configuration</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-zinc-700/50 to-transparent" />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2.5">
                                  <Label className="text-zinc-400 ml-1 text-xs font-semibold">Title</Label>
                                  <Input
                                    placeholder="Embed title"
                                    value={ticketForm.embedTitle}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, embedTitle: e.target.value }))}
                                    className="bg-black/40 border-zinc-800 h-11 px-4 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white"
                                  />
                                </div>
                                <div className="space-y-2.5">
                                  <Label className="text-zinc-400 ml-1 text-xs font-semibold">Footer</Label>
                                  <Input
                                    placeholder="Footer text"
                                    value={ticketForm.embedFooter}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, embedFooter: e.target.value }))}
                                    className="bg-black/40 border-zinc-800 h-11 px-4 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <Label className="text-zinc-400 ml-1 text-xs font-semibold">Description</Label>
                                <Textarea
                                  placeholder="Embed description (supports markdown)"
                                  value={ticketForm.embedDescription}
                                  onChange={(e) => setTicketForm(prev => ({ ...prev, embedDescription: e.target.value }))}
                                  className="bg-black/40 border-zinc-800 px-4 py-3 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white min-h-[100px] resize-y"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2.5">
                                  <Label className="text-zinc-400 ml-1 text-xs font-semibold">Thumbnail URL</Label>
                                  <Input
                                    placeholder="https://..."
                                    value={ticketForm.embedThumbnail}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, embedThumbnail: e.target.value }))}
                                    className="bg-black/40 border-zinc-800 h-11 px-4 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white"
                                  />
                                </div>
                                <div className="space-y-2.5">
                                  <Label className="text-zinc-400 ml-1 text-xs font-semibold">Image URL</Label>
                                  <Input
                                    placeholder="https://..."
                                    value={ticketForm.embedImage}
                                    onChange={(e) => setTicketForm(prev => ({ ...prev, embedImage: e.target.value }))}
                                    className="bg-black/40 border-zinc-800 h-11 px-4 rounded-xl focus:ring-violet-500/50 focus:border-violet-500 text-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                              {editingTicket ? (
                                <>
                                  <Button
                                    onClick={handleEditTicketSetup}
                                    disabled={ticketSubmitting || !ticketForm.channelId || !ticketForm.openCategory || !ticketForm.closeCategory || !ticketForm.roleId}
                                    className="flex-1 h-14 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 font-bold text-lg rounded-2xl shadow-xl shadow-violet-600/10 transition-all active:scale-[0.98] text-white"
                                  >
                                    {ticketSubmitting ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingTicket(false)}
                                    className="h-14 px-8 rounded-2xl font-bold border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  onClick={() => showConfirm(
                                    "Deploy Ticket Setup?",
                                    `This will save the ticket config for guild ${ticketGuildId} and post the embed.`,
                                    handleDeployTicketSetup
                                  )}
                                  disabled={ticketSubmitting || !ticketForm.channelId || !ticketForm.openCategory || !ticketForm.closeCategory || !ticketForm.roleId}
                                  className="flex-1 h-14 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 font-bold text-lg rounded-2xl shadow-xl shadow-violet-600/10 transition-all active:scale-[0.98] text-white"
                                >
                                  {ticketSubmitting ? "Deploying..." : "Save & Deploy"}
                                </Button>
                              )}
                            </div>
                          </>
                        )}

                        {ticketConfig && !editingTicket && (
                          <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-500/10 space-y-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-500" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Danger Zone</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <Button
                                variant="destructive"
                                onClick={handleDeleteTicketSetup}
                                className="h-11 px-6 rounded-xl font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 shadow-none"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Remove Setup
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteAllTicketData}
                                className="h-11 px-6 rounded-xl font-bold bg-rose-700 hover:bg-rose-800 text-white"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete All Data
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {!ticketGuildSaved && !ticketConfig && (
                      <div className="p-12 text-center border-2 border-dashed border-zinc-800/30 rounded-2xl">
                        <Server className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-600 text-sm">Enter a Guild ID and click "Fetch Guild" to configure the ticket system.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                  <CardHeader className="bg-zinc-900/30 border-b border-zinc-800 p-4 sm:p-8 flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <History className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight text-white">Ticket History</CardTitle>
                        <CardDescription className="text-zinc-500 mt-0.5">All tickets across guilds — open and closed.</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1.5 text-xs font-bold">
                        {ticketHistory.filter(t => t.status === "open").length} Open
                      </Badge>
                      <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 px-3 py-1.5 text-xs font-bold">
                        {ticketHistory.filter(t => t.status === "closed").length} Closed
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => fetchTicketData(ticketGuildId || undefined)} disabled={loadingTicket} className="text-zinc-400 hover:text-white rounded-lg h-9 w-9">
                        <RefreshCw className={`w-4 h-4 ${loadingTicket ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingTicket ? (
                      <div className="p-16 text-center text-zinc-500 animate-pulse">Loading tickets...</div>
                    ) : ticketHistory.length === 0 ? (
                      <div className="p-16 text-center">
                        <Ticket className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                        <p className="text-zinc-600 italic text-sm">No tickets found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-500 text-xs py-4 pl-4 sm:pl-8 font-bold">#</TableHead>
                              <TableHead className="text-zinc-500 text-xs py-4 font-bold">User</TableHead>
                              <TableHead className="text-zinc-500 text-xs py-4 font-bold">Status</TableHead>
                              <TableHead className="text-zinc-500 text-xs py-4 font-bold">Opened</TableHead>
                              <TableHead className="text-zinc-500 text-xs py-4 text-right pr-4 sm:pr-8 font-bold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ticketHistory.map((t, i) => (
                              <TableRow key={t.key || i} className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                <TableCell className="pl-4 sm:pl-8 py-4">
                                  <Badge variant="outline" className={`font-mono text-xs ${t.status === "open" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                                    #{t.ticketCount}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-zinc-200 text-sm font-medium">{t.Username}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{t.userId}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <Badge className={`text-[10px] uppercase font-black tracking-wider ${t.status === "open" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-zinc-600/15 text-zinc-400 border-zinc-600/25"}`}>
                                    {t.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="text-xs text-zinc-500">{t.openedAt ? new Date(t.openedAt).toLocaleString() : "—"}</span>
                                </TableCell>
                                <TableCell className="text-right pr-4 sm:pr-8 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    {t.status === "open" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCloseTicket(t.userId, t.guildId, t.ticketCount)}
                                        disabled={closingTicket === t.userId || deletingTicket === t.userId}
                                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg text-xs font-bold h-8 px-3"
                                      >
                                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                        {closingTicket === t.userId ? "Closing..." : "Close"}
                                      </Button>
                                    )}
                                    {t.status === "closed" && t.transcriptUrl && (
                                      <a href={t.transcriptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-violet-400 hover:text-violet-300 text-xs font-bold h-8 px-3 rounded-lg hover:bg-violet-500/10 transition-colors">
                                        Transcript
                                      </a>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTicket(t.userId, t.guildId, t.ticketCount)}
                                      disabled={closingTicket === t.userId || deletingTicket === t.userId}
                                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-bold h-8 px-3"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      {deletingTicket === t.userId ? "Deleting..." : "Delete"}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="helpdesk">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <LifeBuoy className="text-teal-400" /> Deploy Helpdesk
                          </CardTitle>
                          <CardDescription className="text-zinc-400 mt-1">Post the helpdesk info embed (with 10 buttons) to a guild channel.</CardDescription>
                        </div>
                        <Switch checked={helpdeskEnabled} onCheckedChange={setHelpdeskEnabled} />
                      </div>
                    </CardHeader>
                    {helpdeskEnabled && (
                      <CardContent className="p-4 sm:p-8 space-y-5">
                        <div className="space-y-3">
                          <Label className="text-zinc-300 ml-1 flex items-center gap-2"><Hash className="w-3 h-3 text-teal-400" /> Guild ID</Label>
                          <Input
                            placeholder="Discord guild ID"
                            value={helpdeskGuildId}
                            onChange={(e) => setHelpdeskGuildId(e.target.value)}
                            className="bg-zinc-950/80 border-zinc-800 h-11 px-4 rounded-xl focus:ring-teal-500/50 focus:border-teal-500 text-white"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-zinc-300 ml-1 flex items-center gap-2"><Hash className="w-3 h-3 text-teal-400" /> Channel ID</Label>
                          <Input
                            placeholder="Target channel ID"
                            value={helpdeskChannelId}
                            onChange={(e) => setHelpdeskChannelId(e.target.value)}
                            className="bg-zinc-950/80 border-zinc-800 h-11 px-4 rounded-xl focus:ring-teal-500/50 focus:border-teal-500 text-white"
                          />
                        </div>
                        <Button
                          onClick={() => showConfirm("Deploy Helpdesk?", `Post the helpdesk embed to channel ${helpdeskChannelId} in guild ${helpdeskGuildId}.`, handleHelpdeskSend)}
                          disabled={helpdeskSending || !helpdeskGuildId || !helpdeskChannelId}
                          className="w-full h-12 bg-teal-600 hover:bg-teal-700 font-bold rounded-2xl shadow-lg shadow-teal-600/10 transition-all active:scale-95 text-white flex items-center gap-2 justify-center"
                        >
                          <SendHorizonal className="w-4 h-4" />
                          {helpdeskSending ? "Sending..." : "Send Helpdesk Embed"}
                        </Button>
                      </CardContent>
                    )}
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Users className="text-teal-400" /> Deploy Helper
                          </CardTitle>
                          <CardDescription className="text-zinc-400 mt-1">Post the helper message (rules / role / support buttons) to a guild channel.</CardDescription>
                        </div>
                        <Switch checked={helperEnabled} onCheckedChange={setHelperEnabled} />
                      </div>
                    </CardHeader>
                    {helperEnabled && (
                      <CardContent className="p-4 sm:p-8 space-y-5">
                        <div className="space-y-3">
                          <Label className="text-zinc-300 ml-1 flex items-center gap-2"><Hash className="w-3 h-3 text-teal-400" /> Guild ID</Label>
                          <Input
                            placeholder="Discord guild ID"
                            value={helperGuildId}
                            onChange={(e) => setHelperGuildId(e.target.value)}
                            className="bg-zinc-950/80 border-zinc-800 h-11 px-4 rounded-xl focus:ring-teal-500/50 focus:border-teal-500 text-white"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-zinc-300 ml-1 flex items-center gap-2"><Hash className="w-3 h-3 text-teal-400" /> Channel ID</Label>
                          <Input
                            placeholder="Target channel ID"
                            value={helperChannelId}
                            onChange={(e) => setHelperChannelId(e.target.value)}
                            className="bg-zinc-950/80 border-zinc-800 h-11 px-4 rounded-xl focus:ring-teal-500/50 focus:border-teal-500 text-white"
                          />
                        </div>
                        <Button
                          onClick={() => showConfirm("Deploy Helper?", `Post the helper message to channel ${helperChannelId} in guild ${helperGuildId}.`, handleHelperSend)}
                          disabled={helperSending || !helperGuildId || !helperChannelId}
                          className="w-full h-12 bg-teal-600 hover:bg-teal-700 font-bold rounded-2xl shadow-lg shadow-teal-600/10 transition-all active:scale-95 text-white flex items-center gap-2 justify-center"
                        >
                          <SendHorizonal className="w-4 h-4" />
                          {helperSending ? "Sending..." : "Send Helper Message"}
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                </div>

                {(helpdeskDeploys.length > 0 || helperDeploys.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                    <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                      <CardHeader className="bg-teal-950/20 border-b border-teal-500/10 p-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-teal-400">
                          <LifeBuoy className="w-5 h-5" /> Helpdesk Deploys
                        </CardTitle>
                        <CardDescription className="text-zinc-400">{helpdeskDeploys.length} active deployment(s)</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 space-y-3">
                        {helpdeskDeploys.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-zinc-800/40 rounded-2xl text-zinc-600 text-sm italic">No helpdesk deployed yet.</div>
                        ) : (
                          helpdeskDeploys.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-zinc-900/40 rounded-xl border border-white/[0.03] group hover:border-teal-500/30 transition-all duration-300">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-zinc-300 font-mono truncate">Guild: <span className="text-teal-400">{d.guildId}</span></p>
                                <p className="text-xs sm:text-sm text-zinc-300 font-mono truncate">Channel: <span className="text-teal-400">{d.channelId}</span></p>
                                <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-1 truncate">Message: {d.messageId}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={helpdeskDeleting === d.id}
                                onClick={() => showConfirm("Delete Helpdesk Deploy?", "This will delete the bot's message from Discord and remove this deploy record.", () => handleDeleteHelpdeskDeploy(d.id))}
                                className="shrink-0 h-9 w-9 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-rose-500/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                      <CardHeader className="bg-teal-950/20 border-b border-teal-500/10 p-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-teal-400">
                          <Users className="w-5 h-5" /> Helper Deploys
                        </CardTitle>
                        <CardDescription className="text-zinc-400">{helperDeploys.length} active deployment(s)</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 space-y-3">
                        {helperDeploys.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-zinc-800/40 rounded-2xl text-zinc-600 text-sm italic">No helper deployed yet.</div>
                        ) : (
                          helperDeploys.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-zinc-900/40 rounded-xl border border-white/[0.03] group hover:border-teal-500/30 transition-all duration-300">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-zinc-300 font-mono truncate">Guild: <span className="text-teal-400">{d.guildId}</span></p>
                                <p className="text-xs sm:text-sm text-zinc-300 font-mono truncate">Channel: <span className="text-teal-400">{d.channelId}</span></p>
                                <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-1 truncate">Message: {d.messageId}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={helperDeleting === d.id}
                                onClick={() => showConfirm("Delete Helper Deploy?", "This will delete the bot's message from Discord and remove this deploy record.", () => handleDeleteHelperDeploy(d.id))}
                                className="shrink-0 h-9 w-9 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-rose-500/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

              </div>
            </TabsContent>

            {/* CONTRACTS TAB */}
            <TabsContent value="contracts">
              <Card className="bg-zinc-950/50 border-zinc-800 border-2 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:p-8">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                    <Blocks className="text-pink-400" /> Smart Contract Management
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Manage deployed contracts on Somnia Testnet — update prices, withdraw treasury, change admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <AdminContractPanel />
                </CardContent>
              </Card>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>

      <Footer />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 rounded-[2rem] shadow-2xl p-0 overflow-hidden border-2 max-w-md">
          <div className="h-1.5 bg-indigo-600" />
          <div className="p-4 sm:p-8 space-y-6">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-2xl font-black text-white tracking-tighter uppercase">{confirmAction?.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 text-base leading-relaxed">
                {confirmAction?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3">
              <AlertDialogCancel className="w-full sm:w-auto flex-1 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white h-12 text-zinc-400 transition-all duration-300">
                Cancel Request
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  confirmAction?.onConfirm();
                  setConfirmOpen(false);
                }}
                className="w-full sm:w-auto flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-bold text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-300"
              >
                PROCEED
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
