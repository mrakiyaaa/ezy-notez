import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-[128px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        
        <main>
          <HeroSection />

          {/* Features Section */}
          <section className="py-20">
            <FeatureCard
              title="Interactive Study Rooms"
              description="Connect with your friends and complete quizes"
              imagePosition="left"
              gradient="from-blue-500/10 via-cyan-500/10 to-blue-500/10"
            />

            <FeatureCard
              title="Summarize your materials"
              description="Create a Ezy Notez Workspace to Manage your Material"
              imagePosition="right"
              gradient="from-purple-500/10 via-pink-500/10 to-purple-500/10"
            />

            <FeatureCard
              title="Interactive Study Rooms"
              description="Create a Ezy Notez Workspace to Manage your Material"
              imagePosition="left"
              gradient="from-indigo-500/10 via-blue-500/10 to-indigo-500/10"
            />
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}

