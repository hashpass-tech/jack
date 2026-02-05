import * as blessed from "blessed";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

interface GHIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: { name: string; color: string }[];
  assignees: { login: string }[];
  updatedAt: string;
}

interface AgentTask {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  agent?: string;
}

class ProjectTracker {
  private screen: blessed.Widgets.Screen;
  private issueList: blessed.Widgets.ListElement;
  private issueDetails: blessed.Widgets.BoxElement;
  private agentStatus: blessed.Widgets.BoxElement;
  private statusBar: blessed.Widgets.BoxElement;
  private debugLog: blessed.Widgets.Log;

  private issues: GHIssue[] = [];
  private currentIssueIndex: number = 0;
  private lastRefresh: Date = new Date();
  private isLoading: boolean = false;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "JACK GitHub Project Tracker",
      fullUnicode: true,
      dockBorders: true,
    });

    this.createWidgets();
    this.setupEvents();
    this.refreshData();

    setInterval(() => this.refreshData(), 30000);

    this.screen.render();
  }

  private createWidgets() {
    this.issueList = blessed.list({
      top: 0,
      left: 0,
      width: "40%",
      height: "100%-1",
      label: " {bold}GitHub Issues{/bold} ",
      tags: true,
      border: { type: "line" },
      style: {
        selected: { bg: "blue", fg: "white", bold: true },
        border: { fg: "#38BDF8" },
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: " ",
        track: { bg: "grey" },
        style: { bg: "cyan" },
      },
    });

    this.issueDetails = blessed.box({
      top: 0,
      left: "40%",
      width: "60%",
      height: "50%",
      label: " {bold}Issue Details{/bold} ",
      tags: true,
      border: { type: "line" },
      padding: 1,
      style: {
        border: { fg: "#F2B94B" },
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: " ",
        track: { bg: "grey" },
        style: { bg: "yellow" },
      },
      mouse: true,
    });

    this.agentStatus = blessed.box({
      top: "50%",
      left: "40%",
      width: "60%",
      height: "50%-1",
      label: " {bold}Agent Orchestration{/bold} ",
      tags: true,
      border: { type: "line" },
      padding: 1,
      style: {
        border: { fg: "#A855F7" },
      },
    });

    this.statusBar = blessed.box({
      top: "100%-1",
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
      style: {
        bg: "#1F2937",
        fg: "white",
      },
    });

    this.screen.append(this.issueList);
    this.screen.append(this.issueDetails);
    this.screen.append(this.agentStatus);
    this.screen.append(this.statusBar);
  }

  private setupEvents() {
    this.screen.key(["q", "C-c", "escape"], () => {
      return process.exit(0);
    });

    this.screen.key(["r"], () => {
      this.refreshData();
    });

    this.issueList.on("select", (item, index) => {
      this.currentIssueIndex = index;
      this.updateDetailsPanel();
    });

    this.issueList.focus();

    this.issueList.on("select item", (item, index) => {
      this.currentIssueIndex = index;
      this.updateDetailsPanel();
      this.screen.render();
    });
  }

  private async refreshData() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.updateStatusBar("🔄 Refreshing data...");

    try {
      const cmd = `gh issue list --repo hashpass-tech/JACK --limit 50 --json number,title,body,state,labels,assignees,updatedAt`;
      const { stdout } = await execAsync(cmd);
      this.issues = JSON.parse(stdout);

      this.updateIssueList();
      this.updateAgentStatus();

      this.lastRefresh = new Date();
      this.updateStatusBar("✅ Ready");
    } catch (error) {
      this.updateStatusBar("❌ Error fetching data");
      this.issueDetails.setContent(
        `{red-fg}Error fetching issues:{/red-fg}\n${error}`,
      );
    } finally {
      this.isLoading = false;
      this.screen.render();
    }
  }

  private updateIssueList() {
    const items = this.issues.map((issue) => {
      const statusIcon =
        issue.state === "open"
          ? "{green-fg}⏳{/green-fg}"
          : "{red-fg}✅{/red-fg}";
      const labelIcons = issue.labels
        .map((l) => {
          let color = "white";
          if (l.name.includes("bug")) color = "red";
          if (l.name.includes("feature")) color = "green";
          if (l.name.includes("agent")) color = "magenta";
          return `{${color}-fg}●{/${color}-fg}`;
        })
        .join("");

      return `${statusIcon} #${issue.number} ${issue.title} ${labelIcons}`;
    });

    this.issueList.setItems(items);

    if (this.currentIssueIndex < items.length) {
      this.issueList.select(this.currentIssueIndex);
    }

    this.updateDetailsPanel();
  }

  private updateDetailsPanel() {
    const issue = this.issues[this.currentIssueIndex];
    if (!issue) {
      this.issueDetails.setContent("{grey-fg}No issue selected{/grey-fg}");
      return;
    }

    const labels = issue.labels.map((l) => `[${l.name}]`).join(" ");
    const assignees =
      issue.assignees.map((a) => `@${a.login}`).join(", ") || "Unassigned";
    const updated = new Date(issue.updatedAt).toLocaleString();

    const content = `
{bold}${issue.title}{/bold} #{${issue.number}}
{yellow-fg}Status:{/yellow-fg} ${issue.state.toUpperCase()}
{cyan-fg}Labels:{/cyan-fg} ${labels}
{magenta-fg}Assignees:{/magenta-fg} ${assignees}
{grey-fg}Updated:{/grey-fg} ${updated}

{bold}Description:{/bold}
${issue.body}
        `.trim();

    this.issueDetails.setContent(content);
  }

  private updateAgentStatus() {
    const taskDir = path.join(process.cwd(), ".agent-tasks");
    let content = "{bold}Agent System Status{/bold}\n\n";

    if (fs.existsSync(taskDir)) {
      const files = fs.readdirSync(taskDir).filter((f) => f.endsWith(".yaml"));
      content += `Found ${files.length} task definition files.\n\n`;

      files.forEach((file) => {
        content += `📄 {cyan-fg}${file}{/cyan-fg}\n`;
      });
    } else {
      content +=
        "{grey-fg}No active agent tasks found (.agent-tasks directory missing){/grey-fg}";
    }

    content += "\n\n{bold}Available Agents:{/bold}\n";
    content += "🤖 {green-fg}Kiro{/green-fg} (Autonomous)\n";
    content += "🤖 {blue-fg}Claude Code{/blue-fg} (CLI)\n";
    content += "🤖 {yellow-fg}Cursor{/yellow-fg} (Manual)\n";

    this.agentStatus.setContent(content);
  }

  private updateStatusBar(status: string) {
    const time = new Date().toLocaleTimeString();
    const shortcuts = " [↑/↓] Nav  [Enter] Details  [r] Refresh  [q] Quit";
    this.statusBar.setContent(
      ` ${status} | Last update: ${time} | ${shortcuts}`,
    );
    this.screen.render();
  }
}

if (require.main === module) {
  try {
    new ProjectTracker();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
