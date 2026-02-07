export type JackNetwork = 'mainnet' | 'testnet' | 'local';

export type JackRuntimeTargets = {
  network: JackNetwork;
  protocolVersion: 'v1';
  landingUrl: string;
  dashboardUrl: string;
  docsUrl: string;
  isLocalDocs: boolean;
};

const NETWORK_STORAGE_KEY = 'jack.docs.network';
const NETWORK_CHANGE_EVENT = 'jack:docs-network-change';

const SUPPORTED_NETWORKS: JackNetwork[] = ['mainnet', 'testnet', 'local'];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

type ResolveOptions = {
  network?: JackNetwork;
  hostname?: string;
  search?: string;
  referrer?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normalizeNetwork(value: string | null | undefined): JackNetwork | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'prod' || normalized === 'production' || normalized === 'main') {
    return 'mainnet';
  }
  if (normalized === 'test' || normalized === 'staging') {
    return 'testnet';
  }
  if (SUPPORTED_NETWORKS.includes(normalized as JackNetwork)) {
    return normalized as JackNetwork;
  }
  return null;
}

function getSearchParam(
  search: string,
  keys: string[],
): string | null {
  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  const params = new URLSearchParams(normalizedSearch);
  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      return value;
    }
  }
  return null;
}

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function inferNetwork(hostname: string, referrer: string): JackNetwork {
  const normalizedHost = hostname.toLowerCase();
  if (isLocalHostname(normalizedHost)) {
    return 'local';
  }
  if (normalizedHost.includes('testnet')) {
    return 'testnet';
  }
  if (referrer.toLowerCase().includes('testnet.jack.lukas.money')) {
    return 'testnet';
  }
  return 'mainnet';
}

function sanitizeNetworkForHost(network: JackNetwork, hostname: string): JackNetwork {
  // On localhost, always force 'local' — never let a stale localStorage
  // value (e.g. 'testnet' from a previous visit) override the inferred network.
  if (isLocalHostname(hostname)) {
    return 'local';
  }
  if (network === 'local') {
    return 'mainnet';
  }
  return network;
}

function buildUrls(network: JackNetwork): Pick<JackRuntimeTargets, 'landingUrl' | 'dashboardUrl'> {
  if (network === 'local') {
    return {
      landingUrl: 'http://localhost:3000',
      dashboardUrl: 'http://localhost:3001',
    };
  }

  const base =
    network === 'testnet'
      ? 'https://testnet.jack.lukas.money'
      : 'https://jack.lukas.money';

  return {
    landingUrl: base,
    dashboardUrl: `${base}/dashboard`,
  };
}

function safeReadStorage(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
}

export function setPreferredNetwork(network: JackNetwork): void {
  safeWriteStorage(NETWORK_STORAGE_KEY, network);
  if (!isBrowser()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(NETWORK_CHANGE_EVENT, {
      detail: {network},
    }),
  );
}

export function onPreferredNetworkChange(
  handler: (network: JackNetwork) => void,
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = (event: Event): void => {
    const next = (event as CustomEvent<{network?: JackNetwork}>).detail?.network;
    if (!next) {
      return;
    }
    handler(next);
  };

  window.addEventListener(NETWORK_CHANGE_EVENT, listener as EventListener);
  return () => {
    window.removeEventListener(NETWORK_CHANGE_EVENT, listener as EventListener);
  };
}

export function resolveRuntimeTargets(options: ResolveOptions = {}): JackRuntimeTargets {
  const browser = isBrowser();
  const hostname = (options.hostname ?? (browser ? window.location.hostname : 'docs.jack.lukas.money')).toLowerCase();
  const search = options.search ?? (browser ? window.location.search : '');
  const referrer = options.referrer ?? (browser ? document.referrer : '');

  const queryNetwork = normalizeNetwork(getSearchParam(search, ['network', 'env']));
  const storedNetwork = normalizeNetwork(safeReadStorage(NETWORK_STORAGE_KEY));
  const inferredNetwork = inferNetwork(hostname, referrer);
  const selectedNetwork = sanitizeNetworkForHost(
    options.network ?? queryNetwork ?? storedNetwork ?? inferredNetwork,
    hostname,
  );
  const urls = buildUrls(selectedNetwork);
  const docsUrl = isLocalHostname(hostname)
    ? 'http://localhost:3002'
    : 'https://docs.jack.lukas.money';

  safeWriteStorage(NETWORK_STORAGE_KEY, selectedNetwork);

  return {
    network: selectedNetwork,
    protocolVersion: 'v1',
    landingUrl: urls.landingUrl,
    dashboardUrl: urls.dashboardUrl,
    docsUrl,
    isLocalDocs: isLocalHostname(hostname),
  };
}
