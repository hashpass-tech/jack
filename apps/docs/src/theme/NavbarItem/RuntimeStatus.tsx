import {useEffect, useState, type ChangeEvent, type ReactNode} from 'react';
import clsx from 'clsx';
import {
  resolveRuntimeTargets,
  setPreferredNetwork,
  type JackNetwork,
  type JackRuntimeTargets,
} from '@site/src/lib/runtimeTargets';
import styles from './RuntimeStatus.module.css';

type Props = {
  className?: string;
  mobile?: boolean;
};

const LOCAL_OPTIONS: JackNetwork[] = ['local', 'testnet', 'mainnet'];
const REMOTE_OPTIONS: JackNetwork[] = ['testnet', 'mainnet'];

function networkLabel(network: JackNetwork): string {
  if (network === 'mainnet') {
    return 'Mainnet';
  }
  if (network === 'testnet') {
    return 'Testnet';
  }
  return 'Local';
}

export default function RuntimeStatusNavbarItem({
  className,
  mobile = false,
}: Props): ReactNode {
  const [runtime, setRuntime] = useState<JackRuntimeTargets>(() =>
    resolveRuntimeTargets(),
  );

  useEffect(() => {
    setRuntime(resolveRuntimeTargets());
  }, []);

  const networkOptions = runtime.isLocalDocs ? LOCAL_OPTIONS : REMOTE_OPTIONS;

  const handleNetworkChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const network = event.target.value as JackNetwork;
    setPreferredNetwork(network);
    setRuntime(resolveRuntimeTargets({network}));
  };

  const shell = (
    <div
      className={clsx(styles.runtimeShell, {
        [styles.runtimeShellMobile]: mobile,
      })}>
      <span className={styles.versionPill}>V1</span>
      <span className={styles.environmentText}>
        Docs {networkLabel(runtime.network)}
      </span>
      <select
        aria-label="Docs network environment"
        className={styles.networkSelect}
        value={runtime.network}
        onClick={(event) => event.stopPropagation()}
        onChange={handleNetworkChange}>
        {networkOptions.map((network) => (
          <option key={network} value={network}>
            {networkLabel(network)}
          </option>
        ))}
      </select>
    </div>
  );

  if (mobile) {
    return (
      <li className={clsx('menu__list-item', styles.mobileItem, className)}>
        {shell}
      </li>
    );
  }

  return <div className={clsx('navbar__item', styles.desktopItem, className)}>{shell}</div>;
}
