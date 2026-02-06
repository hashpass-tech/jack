import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx(styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroGrid}>
          <div>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.heroButtons}>
              <Link className="button button--primary button--lg" to="/docs/overview">
                Start with the mission
              </Link>
              <Link className="button button--outline button--lg" to="/docs/demo-script">
                Demo narrative
              </Link>
            </div>
            <div className={styles.heroMeta}>
              <div>
                <span>Kernel-led execution</span>
                <small>Deterministic state machine</small>
              </div>
              <div>
                <span>Hook-driven policy</span>
                <small>Risk + routing controls</small>
              </div>
              <div>
                <span>Operator ready</span>
                <small>Runbooks + release flow</small>
              </div>
            </div>
          </div>
          <div className={styles.heroCard}>
            <p className={styles.heroCardTitle}>Demo Readiness</p>
            <ul>
              <li>Intent → Settlement walkthrough</li>
              <li>Architecture diagrams with Mermaid</li>
              <li>Three-step setup guide</li>
            </ul>
            <Link className="button button--secondary button--sm" to="/docs/architecture">
              Explore the architecture
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} | Docs`}
      description="Production-ready documentation for the JACK cross-chain execution kernel.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
