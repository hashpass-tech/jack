import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    "overview",
    "setup",
    "architecture",
    "demo-script",
    {
      type: "category",
      label: "Whitepaper",
      link: { type: "doc", id: "whitepaper/index" },
      items: ["whitepaper/changelog", "whitepaper/summary"],
    },
    {
      type: "category",
      label: "Runbooks & Operations",
      link: { type: "doc", id: "operations/index" },
      items: [
        {
          type: "category",
          label: "Agent Orchestration",
          link: { type: "doc", id: "operations/agent-orchestration/index" },
          items: [
            "operations/agent-orchestration/agent-interface",
            "operations/agent-orchestration/github-integration",
            "operations/agent-orchestration/github-tracker",
          ],
        },
        "operations/spec-system",
        "operations/spec-quickstart",
        "operations/multi-agent-config",
        "operations/release-flow",
        "operations/docs-pages-deployment",
        "operations/documentation-governance",
        "operations/documentation-changelog",
        "operations/contracts-deployment",
        "operations/mvp-critical-roadmap",
      ],
    },
  ],
};

export default sidebars;
