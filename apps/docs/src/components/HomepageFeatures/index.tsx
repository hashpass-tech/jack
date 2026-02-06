import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Intent-first kernel',
    description: (
      <>
        Capture cross-chain intents once, then let the Kernel orchestrate every
        execution step with deterministic state transitions.
      </>
    ),
  },
  {
    title: 'Hooks that enforce policy',
    description: (
      <>
        Policy, routing, and settlement hooks insert guardrails so every
        execution stays within defined risk and compliance boundaries.
      </>
    ),
  },
  {
    title: 'Operator-grade runbooks',
    description: (
      <>
        Release flow, multi-agent orchestration, and GitHub tracking keep the
        protocol reliable long after the demo ends.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCard)}>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
