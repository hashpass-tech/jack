import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {resolveRuntimeTargets} from '@site/src/lib/runtimeTargets';

const FALLBACK_DASHBOARD = 'https://jack.lukas.money/dashboard';

export default function GoDashboard(): ReactNode {
  const [target, setTarget] = useState(FALLBACK_DASHBOARD);

  useEffect(() => {
    const runtime = resolveRuntimeTargets();
    setTarget(runtime.dashboardUrl);
    window.location.replace(runtime.dashboardUrl);
  }, []);

  return (
    <Layout title="Redirecting to Dashboard">
      <main className="container margin-vert--xl">
        <h1>Redirecting to JACK Dashboard</h1>
        <p>
          If you are not redirected automatically, continue to{' '}
          <Link to={target}>the runtime dashboard</Link>.
        </p>
      </main>
    </Layout>
  );
}
