import React, { useEffect, useMemo, useState } from "react";

type WhitepaperVersion = {
  version: string;
  releaseDate: string;
  pdf: string;
  markdown?: string;
  changelog?: string[];
};

type WhitepaperManifest = {
  latest: string;
  canonicalPdf: string;
  publicPath?: string;
  legacyPublicPath?: string;
  versions: WhitepaperVersion[];
};

const FALLBACK_MANIFEST: WhitepaperManifest = {
  latest: "1.0.2",
  canonicalPdf: "JACK-Whitepaper.pdf",
  publicPath: "/whitepaper",
  legacyPublicPath: "/whitepapper",
  versions: [
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

    load();
    return () => {
      active = false;
    };
  }, []);

  const latestVersion = useMemo(
    () => normalizeVersion(manifest.latest || FALLBACK_MANIFEST.latest),
    [manifest.latest],
  );

  const latestEntry = useMemo(
    () =>
      manifest.versions.find(
        (entry) => normalizeVersion(entry.version) === latestVersion,
      ) || manifest.versions[0],
    [latestVersion, manifest.versions],
  );

  const archive = useMemo(
    () =>
      manifest.versions.filter(
        (entry) => normalizeVersion(entry.version) !== latestVersion,
      ),
    [latestVersion, manifest.versions],
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

      <h2>Latest Release: v{latestVersion}</h2>
      <p>
        Release date: <strong>{latestEntry?.releaseDate || "n/a"}</strong>
      </p>

      <p>
        <a
          href={`${basePath}/${manifest.canonicalPdf}`}
          target="_blank"
          rel="noreferrer"
        >
          Download Latest (Canonical)
        </a>
        {" · "}
        <a
          href={`${basePath}/${latestEntry?.pdf}`}
          target="_blank"
          rel="noreferrer"
        >
          Download Versioned PDF
        </a>
        {" · "}
        <a href="/docs/whitepaper/summary">Read Simplified Markdown</a>
        {" · "}
        <a href="/docs/whitepaper/changelog">View Changelog</a>
      </p>

      <iframe
        title={`JACK Whitepaper v${latestVersion}`}
        src={`${basePath}/${latestEntry?.pdf}`}
        style={{
          width: "100%",
          height: "75vh",
          border: "1px solid var(--ifm-color-emphasis-300)",
          borderRadius: 12,
          background: "white",
        }}
      />

      {latestEntry?.changelog?.length ? (
        <>
          <h3>Highlights in v{latestVersion}</h3>
          <ul>
            {latestEntry.changelog.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h3>Archive Downloads</h3>
      <ul>
        {archive.map((entry) => (
          <li key={entry.version}>
            <a
              href={`${basePath}/${entry.pdf}`}
              target="_blank"
              rel="noreferrer"
            >
              v{normalizeVersion(entry.version)} ({entry.releaseDate})
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default WhitepaperHub;
