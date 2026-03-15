import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PrivyWalletProvider } from "@/components/PrivyWalletProvider";
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
import Community from "./pages/Community";
import CommunityDetail from "./pages/CommunityDetail";
import Admin from "./pages/Admin";
import BackgroundMusicPlayer from '@/components/BackgroundMusicPlayer'
import SmoothScroll from '@/components/SmoothScroll'
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrivyWalletProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
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
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/:guildId" element={<CommunityDetail />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </SmoothScroll>
            <BackgroundMusicPlayer />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </PrivyWalletProvider>
  </QueryClientProvider>
);

export default App;
