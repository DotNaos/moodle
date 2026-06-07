import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  distDir: "dist",
  outputFileTracingIncludes: {
    "/api/study-bundles/[...path]": [
      "./study-bundles/**/*",
      "./study-bundles/*/.extracted/**/*",
      "./study-bundles/*/.raw/**/*",
      "./study-bundles/high-performance-computing/.extracted/script/**/*.jpg",
      "./study-bundles/high-performance-computing/.extracted/slides/**/*.jpg",
      "./study-bundles/high-performance-computing/.extracted/tasks/**/*.jpg",
      "./study-bundles/high-performance-computing/.extracted/solutions/**/*.jpg",
      "./apps/web/study-bundles/**/*",
      "./apps/web/study-bundles/*/.extracted/**/*",
      "./apps/web/study-bundles/*/.raw/**/*",
      "./apps/web/study-bundles/high-performance-computing/.extracted/script/**/*.jpg",
      "./apps/web/study-bundles/high-performance-computing/.extracted/slides/**/*.jpg",
      "./apps/web/study-bundles/high-performance-computing/.extracted/tasks/**/*.jpg",
      "./apps/web/study-bundles/high-performance-computing/.extracted/solutions/**/*.jpg",
    ],
  },
  typedRoutes: true,
};

export default nextConfig;
