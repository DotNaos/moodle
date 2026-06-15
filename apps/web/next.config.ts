import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  distDir: "dist",
  typedRoutes: true,
  // Dev runs behind portless at <branch>.moodle.localhost (or moodle.localhost
  // in the main worktree). Allow those hosts so HMR and dev assets aren't
  // blocked as cross-origin.
  allowedDevOrigins: ["moodle.localhost", "*.moodle.localhost"],
};

export default nextConfig;
