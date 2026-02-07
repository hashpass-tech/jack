import React, {useEffect, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {Props} from '@theme/Footer/Copyright';
import {
  onPreferredNetworkChange,
  resolveRuntimeTargets,
  type JackNetwork,
  type JackRuntimeTargets,
} from '@site/src/lib/runtimeTargets';
import {ChangelogDrawer} from '@shared/drawer-changelog';
import styles from './styles.module.css';

type FooterCustomFields = {
  docsBuildVersion?: string;
  jackProtocolTrack?: string;
  changelogRaw?: string;
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
  const changelogText = customFields.changelogRaw ?? '';

  return (
    <div className={styles.shell}>
      <ChangelogDrawer
        changelogText={changelogText}
        theme="docs"
        version={buildVersion}
        renderTrigger={({onClick, version}) => (
          <button
            type="button"
            onClick={onClick}
            className={styles.badge}
            aria-label="View changelog"
          >
            <span className={styles.dot} />
            <span className={styles.environment}>{environment}</span>
            <span className={styles.protocol}>{protocolTrack}</span>
            <span className={styles.build}>v{version}</span>
            <span className={styles.separator}>·</span>
            <span className={styles.changelogLabel}>Changelog</span>
          </button>
        )}
      />
      <div
        className="footer__copyright"
        // Developer provided the HTML, so assume it's safe.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{__html: copyright}}
      />
    </div>
  );
}
