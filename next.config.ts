import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/account", permanent: true },
      { source: "/dashboard/:path*", destination: "/account", permanent: true },
    ];
  },
};

export default nextConfig;
