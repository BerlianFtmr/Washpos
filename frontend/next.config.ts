import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Output standalone build for minimal Docker image (Fase 2 frontend image)
  output: "standalone",
};

export default nextConfig;
