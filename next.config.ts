import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  output: "standalone",
  reactStrictMode: true,
  distDir:
    process.env.VERCEL === "1" ||
    phase === PHASE_DEVELOPMENT_SERVER
      ? ".next"
      : ".next-build",
});

export default nextConfig;
  