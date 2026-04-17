import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustedBy from "@/components/TrustedBy";
import Features from "@/components/Features";
import MusicSources from "@/components/MusicSources";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

import CommunityShowcase from "@/components/CommunityShowcase";
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <div className="h-20 lg:h-24" />
      <main className="flex-1">
        <Hero />
        <TrustedBy />
        <Features />
        <MusicSources />
        <FAQ />
        <CommunityShowcase />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
