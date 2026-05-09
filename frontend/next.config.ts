import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/diagram", destination: "/diagram.html" },
    ];
  },
};

export default nextConfig;
