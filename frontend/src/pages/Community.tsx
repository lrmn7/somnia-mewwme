import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
import CommunityList from "@/components/CommunityList";
import { Heart } from "lucide-react";

export default function Community() {
  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl text-mewwme sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
              COMMUNITY
              <Heart className="w-10 h-10 text-pink-500" />
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Support your favorite servers with STT tips on Somnia.
            </p>
          </div>
          <CommunityList />
        </div>
      </main>
      <Footer />
    </div>
  );
}
