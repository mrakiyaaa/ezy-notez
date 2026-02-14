interface FeatureCardProps {
  title: string;
  description: string;
  imagePosition: "left" | "right";
  gradient: string;
}

export default function FeatureCard({
  title,
  description,
  imagePosition,
  gradient,
}: FeatureCardProps) {
  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-12">
      <div
        className={`flex flex-col ${
          imagePosition === "left" ? "md:flex-row" : "md:flex-row-reverse"
        } items-center gap-8 md:gap-12`}
      >
        {/* Image Container */}
        <div className="w-full md:w-1/2">
          <div
            className={`relative backdrop-blur-xl bg-gradient-to-br ${gradient} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3]`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Placeholder for image */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-white/70">{description}</p>
        </div>
      </div>
    </div>
  );
}
