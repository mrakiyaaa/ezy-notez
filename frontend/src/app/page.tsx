import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";
// import LiquidEther from "@/components/LiquidEther";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-main">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* {/* <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        /> */}
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

