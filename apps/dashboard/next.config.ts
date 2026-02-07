import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

const readVersion = (filePath: string): string => {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
};

const appVersion = readVersion(path.resolve(__dirname, "../../package.json"));

const dashboardBasePath =
  process.env.DASHBOARD_BASE_PATH ||
  (process.env.NODE_ENV === "production" ? "/dashboard" : "");

const nextConfig: NextConfig = {
  basePath: dashboardBasePath || undefined,
  assetPrefix: dashboardBasePath || undefined,
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_LANDING_VERSION: appVersion,
    NEXT_PUBLIC_DASHBOARD_VERSION: appVersion,
    NEXT_PUBLIC_IS_TESTNET: process.env.NEXT_PUBLIC_IS_TESTNET || "false",
  },
};

export default nextConfig;
