import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  scope: string;
  title: string;
  href: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    scope: 'Kernel Layer',
    title: 'Deterministic execution lifecycle',
    href: '/docs/overview',
    description: (
      <>
        Run intents through explicit states with fail-closed outcomes:
        <strong> CREATED → QUOTED → EXECUTING → SETTLED/ABORTED/EXPIRED</strong>.
      </>
    ),
  },
  {
    scope: 'Routing Layer',
    title: 'Best-effort routing with controls',
    href: '/docs/architecture',
    description: (
      <>
        v1 uses external routing infrastructure (for example LI.FI) behind
        allowlists, value caps, and explicit failure handling.
      </>
    ),
  },
  {
    scope: 'Settlement Layer',
    title: 'Policy enforcement at settlement time',
    href: '/docs/architecture',
    description: (
      <>
        Uniswap v4 hooks act as policy agents to enforce slippage bounds,
        min-out guarantees, and access control directly on-chain.
      </>
    ),
  },
  {
    scope: 'Operations Layer',
    title: 'Demo-ready operator workflows',
    href: '/docs/operations',
    description: (
      <>
        Use runbooks for deployment, smoke checks, release flow, and multi-agent
        execution so demos stay predictable under pressure.
      </>
    ),
  },
];

function Feature({scope, title, href, description}: FeatureItem) {
  return (
    <article className={styles.featureCard}>
      <p className={styles.scope}>{scope}</p>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
      <Link className={styles.cardLink} to={href}>
        Read more
      </Link>
    </article>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.headingRow}>
          <Heading as="h2">Architecture at a glance</Heading>
          <p>
            The docs map directly to the v1 whitepaper scope: intent format,
            solver coordination, routing controls, and policy-enforced settlement.
          </p>
        </div>
        <div className={styles.grid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
