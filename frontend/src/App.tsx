import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { AuthProvider } from "@/hooks/useAuth";
import { wagmiConfig } from "@/lib/web3";
import Index from "./pages/Index";
import Commands from "./pages/Commands";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Premium from "./pages/Premium";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlayerPage from "./pages/PlayerPage";
import Profile from "./pages/Profile";
import GlobalStats from "./pages/GlobalStats";
import InviteCallback from "./pages/InviteCallback";
import Team from "./pages/Team";
import AdminDashboard from "./pages/AdminDashboard";
import SystemStatus from "./pages/SystemStatus";
import Community from "./pages/Community";
import CommunityDetail from "./pages/CommunityDetail";
import BackgroundMusicPlayer from '@/components/BackgroundMusicPlayer'
import SmoothScroll from '@/components/SmoothScroll'
import BackgroundGlow from '@/components/BackgroundGlow'
const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <BackgroundGlow />
            <SmoothScroll>
              <div className="dark">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/commands" element={<Commands />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/termsofservice" element={<TermsOfService />} />
                  <Route path="/refundpolicy" element={<RefundPolicy />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/servers" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/global-stats" element={<GlobalStats />} />
                  <Route path="/player/:guildId" element={<PlayerPage />} />
                  <Route path="/invite-callback" element={<InviteCallback />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/systemstatus" element={<SystemStatus />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/:guild" element={<CommunityDetail />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </SmoothScroll>
            <BackgroundMusicPlayer />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
