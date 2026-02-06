#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const RELEASE_LEVELS = new Set(['major', 'minor', 'patch']);
const usage = () => {
  console.log([
    'Usage: node scripts/release.js [major|minor|patch] [message] [options]',
    '',
    'Options:',
    '  --message "<text>"      Explicit release commit message.',
    '  --with-docs             Run docs release build as part of this release.',
    '  --with-docs-deploy      Run docs build and trigger GitHub Pages workflow.',
    '  -h, --help              Show this help output.'
  ].join('\n'));
};

const parseReleaseArgs = (args) => {
  const parsed = {
    releaseLevel: 'patch',
    releaseMessage: '',
    withDocs: false,
    withDocsDeploy: false,
    help: false
  };

  let index = 0;
  if (args[index] && RELEASE_LEVELS.has(args[index])) {
    parsed.releaseLevel = args[index];
    index += 1;
  }

  const messageParts = [];
  while (index < args.length) {
    const arg = args[index];

    if (arg === '--message') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('--message requires a value');
      }
      parsed.releaseMessage = value;
      index += 2;
      continue;
    }

    if (arg === '--with-docs') {
      parsed.withDocs = true;
      index += 1;
      continue;
    }

    if (arg === '--with-docs-deploy') {
      parsed.withDocs = true;
      parsed.withDocsDeploy = true;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    messageParts.push(arg);
    index += 1;
  }

  if (!parsed.releaseMessage) {
    parsed.releaseMessage = messageParts.length
      ? messageParts.join(' ')
      : `Release ${parsed.releaseLevel}`;
  }

  return parsed;
};

let cli;
try {
  cli = parseReleaseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message || error);
  usage();
  process.exit(1);
}
const {
  releaseLevel,
  releaseMessage,
  withDocs,
  withDocsDeploy,
  help
} = cli;

if (help) {
  usage();
  process.exit(0);
}

const loadEnvFile = (file) => {
  const envPath = path.join(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded env from ${file}`);
  }
};

const getBranchNameForEnv = () => {
  if (process.env.GIT_BRANCH) {
    return process.env.GIT_BRANCH;
  }
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
};

const branchForEnv = getBranchNameForEnv();
const defaultEnvFiles = branchForEnv === 'main' || branchForEnv === 'master'
  ? ['.env.production']
  : ['.env.testnet'];

const envFiles = process.env.RELEASE_ENV_FILES
  ? process.env.RELEASE_ENV_FILES.split(',').map((file) => file.trim())
  : defaultEnvFiles;

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

const runWithOutput = (command) => {
  return execSync(command, { stdio: 'pipe', env: process.env }).toString().trim();
};

const tryFetchBranches = () => {
  try {
    execSync('git fetch origin main develop --tags', { stdio: 'ignore' });
  } catch {
    // ignore fetch errors (offline or no remote)
  }
};

const branchExists = (branch) => {
  try {
    execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const isAncestor = (ancestor, descendant) => {
  try {
    execSync(`git merge-base --is-ancestor ${ancestor} ${descendant}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const getBranchName = () => {
  if (process.env.GIT_BRANCH) {
    return process.env.GIT_BRANCH;
  }
  try {
    return runWithOutput('git rev-parse --abbrev-ref HEAD');
  } catch {
    return '';
  }
};

const getPrimaryBranch = () => {
  if (branchExists('main')) {
    return 'main';
  }
  if (branchExists('master')) {
    return 'master';
  }
  return '';
};

const tagExists = (tagName) => {
  try {
    execSync(`git rev-parse -q --verify refs/tags/${tagName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const createReleaseTag = (version) => {
  const branch = getBranchName();
  if (!branch) {
    console.log('Skipping tag creation (branch not detected)');
    return;
  }

  if (branch === 'develop') {
    const tagPrefix = `v${version}-testnet`;
    let next = 1;
    try {
      const tagsRaw = runWithOutput(`git tag -l "${tagPrefix}.*"`);
      const tags = tagsRaw ? tagsRaw.split('\n') : [];
      const numbers = tags
        .map((tag) => Number(tag.replace(`${tagPrefix}.`, '')))
        .filter((value) => Number.isFinite(value));
      if (numbers.length) {
        next = Math.max(...numbers) + 1;
      }
    } catch {
      // ignore
    }

    const tagName = `${tagPrefix}.${next}`;
    if (tagExists(tagName)) {
      console.log(`Tag already exists: ${tagName}`);
      return;
    }
    run(`git tag -a ${tagName} -m "Release ${tagName}"`);
    run(`git push origin ${tagName}`);
    console.log(`Created testnet tag ${tagName}`);
    return;
  }

  if (branch === 'main' || branch === 'master') {
    const tagName = `v${version}`;
    if (tagExists(tagName)) {
      console.log(`Tag already exists: ${tagName}`);
      return;
    }
    run(`git tag -a ${tagName} -m "Release ${tagName}"`);
    run(`git push origin ${tagName}`);
    console.log(`Created production tag ${tagName}`);
    return;
  }

  console.log(`Skipping tag creation for branch ${branch}`);
};

const enforceTestnetNotBehind = () => {
  tryFetchBranches();
  const primary = getPrimaryBranch();
  const branch = getBranchName();

  if (!primary || !branch) {
    return;
  }

  if (branch === 'develop') {
    if (!isAncestor(primary, branch)) {
      throw new Error(`develop is behind ${primary}. Merge ${primary} into develop before running a testnet release.`);
    }
  }
};

const syncDevelopToPrimary = () => {
  const primary = getPrimaryBranch();
  if (!primary || !branchExists('develop')) {
    return;
  }

  if (isAncestor(primary, 'develop')) {
    return;
  }

  if (!isAncestor('develop', primary)) {
    throw new Error(`develop has diverged from ${primary}. Merge ${primary} into develop manually to keep testnet in sync.`);
  }

  const currentBranch = getBranchName();
  run('git checkout develop');
  run(`git merge --ff-only ${primary}`);
  run('git push origin develop');
  if (currentBranch && currentBranch !== 'develop') {
    run(`git checkout ${currentBranch}`);
  }
};

const runDocsRelease = ({ triggerDeploy }) => {
  const currentBranch = getBranchName();
  const command = ['node scripts/release-docs.js'];

  if (triggerDeploy) {
    command.push('--trigger-deploy');
    if (currentBranch) {
      command.push('--ref');
      command.push(currentBranch);
    }
  }

  run(command.join(' '));
};

try {
  enforceTestnetNotBehind();
  console.log('Starting versioning + release pipeline');
  const versioningCommand = `pnpm exec versioning ${releaseLevel} --message "${releaseMessage}"`;
  run(versioningCommand);

  // Reload package.json to read the bumped version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  console.log(`New version: ${version}`);

  createReleaseTag(version);

  const dashboardUrl = process.env.GCLOUD_DASHBOARD_URL || process.env.VITE_DASHBOARD_URL;
  if (dashboardUrl) {
    process.env.VITE_DASHBOARD_URL = dashboardUrl;
    console.log(`Using dashboard URL for landing build: ${dashboardUrl}`);
  }
  console.log('Building landing and dashboard for release');
  run('pnpm build');
  run('cd apps/dashboard && pnpm build');

  if (withDocs) {
    const currentBranch = getBranchName();
    const autoDeployDocs = currentBranch === 'main' || currentBranch === 'master';
    const triggerDocsDeploy = withDocsDeploy || process.env.RELEASE_WITH_DOCS_DEPLOY === 'true' || autoDeployDocs;
    console.log(`Running docs release step (${triggerDocsDeploy ? 'build + deploy trigger' : 'build only'})`);
    runDocsRelease({ triggerDeploy: triggerDocsDeploy });
  }

  const releaseToken = `releases/v${version}`;
  const transferBucket = ({ bucket, source, target }) => {
    if (!bucket) {
      return;
    }

    run(`gsutil -m rsync -r -d ${source} gs://${bucket}/${target}`);
  };

  const setNoCache = ({ bucket, target }) => {
    if (!bucket) {
      return;
    }
    run(`gsutil setmeta -h "Cache-Control:no-cache, max-age=0" gs://${bucket}/${target}`);
  };

  if (process.env.GCLOUD_LANDING_BUCKET) {
    transferBucket({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      source: 'apps/landing/dist',
      target: ''
    });
    transferBucket({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      source: 'apps/landing/dist',
      target: `${releaseToken}/landing`
    });
    setNoCache({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      target: 'index.html'
    });
    setNoCache({
      bucket: process.env.GCLOUD_LANDING_BUCKET,
      target: `${releaseToken}/landing/index.html`
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

    const isTestnetBuild = getBranchName() === 'develop' ? 'true' : 'false';

    run(`gcloud builds submit --region ${region} ${project} --config apps/dashboard/cloudbuild.yaml --substitutions=_IMAGE=${imageUri},_NEXT_PUBLIC_IS_TESTNET=${isTestnetBuild} .`);
    run(`gcloud run deploy ${process.env.GCLOUD_RUN_SERVICE} --image ${imageUri} --region ${region} ${project} ${allowUnauth}`);
  }

  const currentBranch = getBranchName();
  if (currentBranch === 'main' || currentBranch === 'master') {
    syncDevelopToPrimary();
  }

  console.log('Release pipeline completed successfully');
} catch (error) {
  console.error(error);
  process.exit(1);
}
