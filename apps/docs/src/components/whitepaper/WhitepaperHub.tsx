import React, { useEffect, useMemo, useState } from "react";

type WhitepaperVersion = {
  version: string;
  releaseDate: string;
  pdf: string;
  markdown?: string;
  changelog?: string[];
  sourcePdf?: string;
};

type WhitepaperManifest = {
  latest: string;
  featured?: string;
  canonicalPdf: string;
  publicPath?: string;
  legacyPublicPath?: string;
  versions: WhitepaperVersion[];
};

const FALLBACK_MANIFEST: WhitepaperManifest = {
  latest: "1.0.2",
  featured: "1.0.0",
  canonicalPdf: "JACK-Whitepaper.pdf",
  publicPath: "/whitepaper",
  legacyPublicPath: "/whitepapper",
  versions: [
    {
      version: "1.0.0",
      releaseDate: "2026-02-07",
      pdf: "JACK-Whitepaper-v1.0.0.pdf",
      changelog: [
        "Foundational whitepaper edition, optimized as the primary onboarding read.",
      ],
    },
    {
      version: "1.0.2",
      releaseDate: "2026-02-07",
      pdf: "JACK-Whitepaper-v1.0.2.pdf",
      changelog: [
        "Deterministic /api/quote mode contract with explicit fallback semantics.",
        "LI.FI quote/route/status integration behavior and failure model.",
        "Yellow provider notification/auth/persistence integration details.",
      ],
    },
    {
      version: "1.0.1",
      releaseDate: "2026-02-06",
      pdf: "JACK-Whitepaper-v1.0.1.pdf",
    },
  ],
};

const normalizeVersion = (value: string): string =>
  value.replace(/^v/i, "").trim();

const compareSemverDesc = (left: string, right: string): number => {
  const a = left.split(".").map((part) => Number(part));
  const b = right.split(".").map((part) => Number(part));
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) {
    const l = a[index] ?? 0;
    const r = b[index] ?? 0;
    if (l !== r) {
      return r - l;
    }
  }
  return 0;
};

const WhitepaperHub: React.FC = () => {
  const [manifest, setManifest] =
    useState<WhitepaperManifest>(FALLBACK_MANIFEST);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const primary = await fetch("/whitepaper/manifest.json");
        if (!primary.ok) {
          const legacy = await fetch("/whitepapper/manifest.json");
          if (!legacy.ok) {
            throw new Error("Unable to load whitepaper manifest.");
          }
          const legacyManifest = (await legacy.json()) as WhitepaperManifest;
          if (active) {
            setManifest(legacyManifest);
            setLoadError("");
          }
          return;
        }
        const nextManifest = (await primary.json()) as WhitepaperManifest;
        if (active) {
          setManifest(nextManifest);
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Manifest unavailable",
          );
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const latestVersion = useMemo(
    () => normalizeVersion(manifest.latest || FALLBACK_MANIFEST.latest),
    [manifest.latest],
  );
  const featuredVersion = useMemo(
    () => normalizeVersion(manifest.featured || latestVersion),
    [manifest.featured, latestVersion],
  );

  const sortedVersions = useMemo(
    () =>
      [...manifest.versions].sort((left, right) =>
        compareSemverDesc(
          normalizeVersion(left.version),
          normalizeVersion(right.version),
        ),
      ),
    [manifest.versions],
  );

  const featuredEntry = useMemo(
    () =>
      manifest.versions.find(
        (entry) => normalizeVersion(entry.version) === featuredVersion,
      ) || sortedVersions[0],
    [featuredVersion, manifest.versions, sortedVersions],
  );

  const latestEntry = useMemo(
    () =>
      manifest.versions.find(
        (entry) => normalizeVersion(entry.version) === latestVersion,
      ) || sortedVersions[0],
    [latestVersion, manifest.versions, sortedVersions],
  );

  const versionLibrary = useMemo(
    () =>
      sortedVersions.map((entry) => {
        const version = normalizeVersion(entry.version);
        return {
          ...entry,
          version,
          isFeatured: version === featuredVersion,
          isLatest: version === latestVersion,
        };
      }),
    [featuredVersion, latestVersion, sortedVersions],
  );

  const basePath = manifest.publicPath || "/whitepaper";

  return (
    <section>
      <p>
        Canonical source of truth: <code>whitepaper/manifest.json</code>
      </p>
      {loadError ? (
        <p>
          <strong>Manifest load warning:</strong> {loadError}. Showing fallback
          metadata.
        </p>
      ) : null}

      <h2>Start Here: Foundational Whitepaper (v{featuredVersion})</h2>
      <p>
        This is the recommended first read for onboarding and product
        orientation before jumping to deeper technical revisions.
      </p>
      <p>
        <a
          href={`${basePath}/${featuredEntry?.pdf}`}
          target="_blank"
          rel="noreferrer"
        >
          Download Foundational PDF
        </a>
        {" · "}
        <a
          href={`${basePath}/${manifest.canonicalPdf}`}
          target="_blank"
          rel="noreferrer"
        >
          Download Main Canonical Link
        </a>
      </p>

      <h2>Latest Technical Whitepaper (v{latestVersion})</h2>
      <p>
        Use this version for the newest architecture, integration updates, and
        technical process details.
      </p>
      <p>
        <a
          href={`${basePath}/${latestEntry?.pdf}`}
          target="_blank"
          rel="noreferrer"
        >
          Download Latest Technical PDF
        </a>
        {" · "}
        <a href={`/docs/whitepaper/whitepaper-v${latestVersion}`}>
          Read Latest Technical Markdown
        </a>
        {" · "}
        <a href="/docs/whitepaper/changelog">View Changelog</a>
      </p>

      <iframe
        title={`JACK Whitepaper Foundational v${featuredVersion}`}
        src={`${basePath}/${featuredEntry?.pdf}`}
        style={{
          width: "100%",
          height: "75vh",
          border: "1px solid var(--ifm-color-emphasis-300)",
          borderRadius: 12,
          background: "white",
        }}
      />

      <h3>Version Library</h3>
      <ul>
        {versionLibrary.map((entry) => (
          <li key={entry.version}>
            <a
              href={`${basePath}/${entry.pdf}`}
              target="_blank"
              rel="noreferrer"
            >
              v{entry.version} ({entry.releaseDate})
            </a>
            {entry.isFeatured ? " · Foundational / Start Here" : ""}
            {entry.isLatest ? " · Latest Technical" : ""}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default WhitepaperHub;
