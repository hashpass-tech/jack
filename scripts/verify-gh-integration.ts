import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Verifying GitHub Integration...\n');

const checks = [
    {
        name: 'GitHub CLI Installation',
        fn: () => {
            execSync('gh --version', { stdio: 'ignore' });
        },
        error: 'GitHub CLI (gh) is missing. Install via: brew install gh'
    },
    {
        name: 'GitHub CLI Authentication',
        fn: () => {
            execSync('gh auth status', { stdio: 'ignore' });
        },
        error: 'gh is not authenticated. Run: gh auth login'
    },
    {
        name: 'Repository Access',
        fn: () => {
            execSync('gh issue list --repo hashpass-tech/JACK --limit 1', { stdio: 'ignore' });
        },
        error: 'Cannot access hashpass-tech/JACK. Check your repository permissions.'
    },
    {
        name: 'Required Scripts',
        fn: () => {
            const required = ['scripts/agent-runner.ts', 'scripts/sync-github-tasks.ts'];
            required.forEach(s => {
                if (!fs.existsSync(path.join(process.cwd(), s))) {
                    throw new Error(`Missing script: ${s}`);
                }
            });
        },
        error: 'One or more required scripts are missing in the /scripts directory.'
    }
];

let failed = false;
for (const check of checks) {
    try {
        check.fn();
        console.log(`✅ ${check.name}`);
    } catch (e) {
        console.error(`❌ ${check.name}`);
        console.error(`   Reason: ${check.error}`);
        failed = true;
    }
}

if (failed) {
    process.exit(1);
} else {
    console.log('\n✨ GitHub Integration is ready! ✨');
}
