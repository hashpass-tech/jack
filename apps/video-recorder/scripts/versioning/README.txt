Versioning system for JACK video scripts and dashboard snapshots.

Commands:
  node scripts/versioning/check-dashboard.mjs --url=http://localhost:3001
    - Captures dashboard HTML, hashes it, compares to latest version.
    - Prompts to create a new version if a change is detected.

  node scripts/versioning/create-version.mjs --version v1.0.1 --script scripts/versions/v1.0.0/script.txt
    - Creates a new version folder from a script file and copies audio (optional).

Outputs:
  scripts/versions/vX.Y.Z/
    - script.txt
    - meta.json
    - dashboard.html (optional)
    - audio/ (optional copy from public/audio)
    - renders/ (optional; for exported videos)

Notes:
  - Update latest.json to point to the active version.
  - Use semantic versioning (v1.0.0, v1.1.0, v1.0.1).
