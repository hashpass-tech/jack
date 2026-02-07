import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {resolveRuntimeTargets} from '@site/src/lib/runtimeTargets';

const FALLBACK_LANDING = 'https://jack.lukas.money';

export default function GoLanding(): ReactNode {
  const [target, setTarget] = useState(FALLBACK_LANDING);

  useEffect(() => {
    const runtime = resolveRuntimeTargets();
    setTarget(runtime.landingUrl);
    window.location.replace(runtime.landingUrl);
  }, []);

  return (
    <Layout title="Redirecting to Landing">
      <main className="container margin-vert--xl">
        <h1>Redirecting to JACK Landing</h1>
        <p>
          If you are not redirected automatically, continue to{' '}
          <Link to={target}>the runtime landing page</Link>.
        </p>
      </main>
    </Layout>
  );
}
