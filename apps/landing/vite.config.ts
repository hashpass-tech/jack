import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const landingVersion = readVersion(
    path.resolve(__dirname, "../../package.json"),
  );
  const dashboardVersion = readVersion(
    path.resolve(__dirname, "../dashboard/package.json"),
  );
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      strictPort: true,
    },
    plugins: [react()],
    define: {
      "process.env.VITE_DASHBOARD_URL": JSON.stringify(env.VITE_DASHBOARD_URL),
      "import.meta.env.VITE_LANDING_VERSION": JSON.stringify(landingVersion),
      "import.meta.env.VITE_DASHBOARD_VERSION":
        JSON.stringify(dashboardVersion),
      "import.meta.env.VITE_IS_TESTNET": JSON.stringify(
        env.IS_TESTNET || "false",
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../../"),
      },
    },
    root: path.resolve(__dirname),
  };
});
