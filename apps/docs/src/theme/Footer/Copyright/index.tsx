import React, {useEffect, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {Props} from '@theme/Footer/Copyright';
import {
  onPreferredNetworkChange,
  resolveRuntimeTargets,
  type JackNetwork,
  type JackRuntimeTargets,
} from '@site/src/lib/runtimeTargets';
import styles from './styles.module.css';

type FooterCustomFields = {
  docsBuildVersion?: string;
  jackProtocolTrack?: string;
};

const networkLabel = (network: JackNetwork): string => {
  if (network === 'testnet') {
    return 'TESTNET';
  }
  if (network === 'local') {
    return 'LOCAL';
  }
  return 'MAINNET';
};

export default function FooterCopyright({copyright}: Props): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const customFields = (siteConfig.customFields ?? {}) as FooterCustomFields;
  const [runtime, setRuntime] = useState<JackRuntimeTargets>(() =>
    resolveRuntimeTargets(),
  );

  useEffect(() => {
    setRuntime(resolveRuntimeTargets());
    const unsubscribe = onPreferredNetworkChange((network) => {
      setRuntime(resolveRuntimeTargets({network}));
    });
    return unsubscribe;
  }, []);

  const environment = networkLabel(runtime.network);
  const protocolTrack = (
    customFields.jackProtocolTrack ?? runtime.protocolVersion ?? 'v1'
  ).toUpperCase();
  const buildVersion = customFields.docsBuildVersion ?? '0.0.0';

  return (
    <div className={styles.shell}>
      <div className={styles.badge} aria-label="Documentation build metadata">
        <span className={styles.dot} />
        <span className={styles.environment}>{environment}</span>
        <span className={styles.protocol}>{protocolTrack}</span>
        <span className={styles.build}>BUILD {buildVersion}</span>
      </div>
      <div
        className="footer__copyright"
        // Developer provided the HTML, so assume it's safe.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{__html: copyright}}
      />
    </div>
  );
}
