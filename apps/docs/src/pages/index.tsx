import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function HomepageHeader() {
  return (
    <header className={clsx(styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroShell}>
          <div>
            <p className={styles.eyebrow}>JACK Whitepaper v1.0.2</p>
            <Heading as="h1" className={styles.heroTitle}>
              Intent-first execution with policy-enforced settlement
            </Heading>
            <p className={styles.heroSubtitle}>
              JACK turns high-level intents into verifiable execution plans:
              solver competition off-chain, routing via infrastructure like
              LI.FI, and settlement-time guardrails through programmable Uniswap
              v4 hooks.
            </p>
            <div className={styles.heroButtons}>
              <Link
                className="button button--primary button--lg"
                to="/docs/overview"
              >
                Get Started
              </Link>
              <Link
                className="button button--outline button--lg"
                to="/docs/architecture"
              >
                View architecture
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/sdk"
              >
                SDK Docs
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/whitepaper"
              >
                Whitepaper
              </Link>
            </div>
            <div
              className={styles.stateMachine}
              aria-label="Execution lifecycle states"
            >
              <span>CREATED</span>
              <span>QUOTED</span>
              <span>EXECUTING</span>
              <span>SETTLED</span>
              <span>ABORTED</span>
              <span>EXPIRED</span>
            </div>
          </div>

          <aside className={styles.heroPanel}>
            <p className={styles.heroCardTitle}>v1 Scope</p>
            <ul>
              <li>Concrete intent format with public + private constraints.</li>
              <li>Solver competition with minimal bonded execution model.</li>
              <li>
                Best-effort routing with explicit failure states and reason
                codes.
              </li>
              <li>Single-chain settlement via Uniswap v4 policy hooks.</li>
              <li>CCM interface for privacy-aware constraint handling.</li>
            </ul>
            <p className={styles.nonGoalTitle}>Explicit non-goals</p>
            <ul>
              <li>No atomic cross-chain settlement guarantees in v1.</li>
              <li>No trustless bridge guarantees (uses allowlists/caps).</li>
              <li>No production-grade FHE+ZK proof system in v1.</li>
            </ul>
          </aside>
        </div>

        <section className={styles.setupBand}>
          <div className={styles.setupBandHeader}>
            <Heading as="h2">Actual Setup Flow</Heading>
            <p>
              Use the same dev topology as the MVP demo: landing, dashboard, and
              docs running together.
            </p>
          </div>
          <ol className={styles.setupList}>
            <li>
              <strong>Install dependencies:</strong> <code>pnpm install</code>
            </li>
            <li>
              <strong>Start all apps:</strong> <code>pnpm dev:all</code> (
              <code>3000/3001/3002</code>)
            </li>
            <li>
              <strong>Run contract checks:</strong>{" "}
              <code>pnpm contracts:test</code> before demo recording
            </li>
          </ol>
        </section>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} | Docs`}
      description="Production-ready documentation for the JACK cross-chain execution kernel."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
