
import fs from "fs";
import path from "path";
import Dashboard from "../components/Dashboard";

export default function Home() {
  // Read changelog at build time (server component)
  let changelog = "";
  try {
    changelog = fs.readFileSync(
      path.join(process.cwd(), "../../CHANGELOG.md"),
      "utf-8",
    );
  } catch {
    // Fallback: empty string if CHANGELOG not found (e.g. Docker build)
    changelog = "";
  }

  return <Dashboard changelog={changelog} />;
}
