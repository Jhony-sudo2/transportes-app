import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  output: "standalone",
  reactStrictMode: true,
  // Keep production builds from replacing the running development server assets.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : ".next-build",
});

export default nextConfig;
