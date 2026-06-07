import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  distDir: "dist",
  typedRoutes: true,
};

export default nextConfig;
