#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const RELEASE_LEVELS = new Set(['major', 'minor', 'patch']);
const releaseLevel = process.argv[2] || 'patch';
const releaseMessage = process.argv[3] || `Release ${releaseLevel}`;

const loadEnvFile = (file) => {
  const envPath = path.join(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded env from ${file}`);
  }
};

const envFiles = process.env.RELEASE_ENV_FILES
  ? process.env.RELEASE_ENV_FILES.split(',').map((file) => file.trim())
  : ['.env', '.env.testnet'];
envFiles.forEach((file) => {
  if (file) {
    loadEnvFile(file);
  }
});

if (!RELEASE_LEVELS.has(releaseLevel)) {
  console.error(`Unsupported release level: ${releaseLevel}. Use major, minor, or patch.`);
  process.exit(1);
}

const run = (command) => {
  console.log(`\u27A4 ${command}`);
  execSync(command, { stdio: 'inherit', env: process.env });
};

try {
  console.log('Starting versioning + release pipeline');
  const versioningCommand = `pnpm exec versioning ${releaseLevel} --packages "apps/dashboard" --message "${releaseMessage}"`;
  run(versioningCommand);

  // Reload package.json to read the bumped version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  console.log(`New version: ${version}`);

  const dashboardUrl = process.env.GCLOUD_DASHBOARD_URL || process.env.VITE_DASHBOARD_URL;
  if (dashboardUrl) {
    process.env.VITE_DASHBOARD_URL = dashboardUrl;
    console.log(`Using dashboard URL for landing build: ${dashboardUrl}`);
  }
  console.log('Building landing and dashboard for release');
  run('pnpm build');
  run('cd apps/dashboard && pnpm build');

  const releaseToken = `releases/v${version}`;
  const transferBucket = ({ bucket, source, target }) => {
    if (!bucket) {
      return;
    }

    run(`gsutil -m rsync -r ${source} gs://${bucket}/${target}`);
  };

  if (process.env.GCLOUD_LANDING_BUCKET) {
    transferBucket({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      source: 'dist',
      target: ''
    });
    transferBucket({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      source: 'dist',
      target: `${releaseToken}/landing`
    });
  }

  if (process.env.GCLOUD_WHITEPAPER_BUCKET) {
    transferBucket({
      bucket: process.env.GCLOUD_WHITEPAPER_BUCKET,
      source: 'apps/landing/public/whitepapper',
      target: 'whitepaper'
    });
    transferBucket({
      bucket: process.env.GCLOUD_WHITEPAPER_BUCKET,
      source: 'apps/landing/public/whitepapper',
      target: `${releaseToken}/whitepaper`
    });
  }

  if (process.env.GCLOUD_RUN_SERVICE && process.env.GCLOUD_RUN_REGION) {
    const project = process.env.GCLOUD_PROJECT ? `--project ${process.env.GCLOUD_PROJECT}` : '';
    const allowUnauth = process.env.GCLOUD_RUN_ALLOW_UNAUTH === 'true' ? '--allow-unauthenticated' : '';
    const region = process.env.GCLOUD_RUN_REGION;
    const defaultImage = process.env.GCLOUD_PROJECT
      ? `${region}-docker.pkg.dev/${process.env.GCLOUD_PROJECT}/cloud-run-source-deploy/${process.env.GCLOUD_RUN_SERVICE}:v${version}`
      : undefined;
    const imageUri = process.env.GCLOUD_RUN_IMAGE || defaultImage;

    if (!imageUri) {
      throw new Error('GCLOUD_RUN_IMAGE or GCLOUD_PROJECT must be set to deploy to Cloud Run');
    }

    run(`gcloud builds submit --region ${region} ${project} --config apps/dashboard/cloudbuild.yaml --substitutions=_IMAGE=${imageUri} .`);
    run(`gcloud run deploy ${process.env.GCLOUD_RUN_SERVICE} --image ${imageUri} --region ${region} ${project} ${allowUnauth}`);
  }

  console.log('Release pipeline completed successfully');
} catch (error) {
  console.error(error);
  process.exit(1);
}
