import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@naart/database"],
  allowedDevOrigins: ["192.168.29.79"],
};

export default nextConfig;
