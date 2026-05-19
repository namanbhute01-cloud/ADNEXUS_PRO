import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vaart/database"],
  allowedDevOrigins: ["192.168.29.82"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "*",
      },
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
};

export default nextConfig;
