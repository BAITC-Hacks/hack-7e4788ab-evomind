import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@evomind/contracts"],
};

export default nextConfig;
