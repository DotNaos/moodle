import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  distDir: "dist",
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/courses",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
