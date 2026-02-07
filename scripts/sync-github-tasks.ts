import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GHIssue {
    number: number;
    title: string;
    body: string;
}

interface CliOptions {
    label: string;
    repo: string;
    assign?: string;
    start: boolean;
    taskId?: string;
    preferredAgent?: string;
    verify: boolean;
    noCommit: boolean;
}

function escapeYamlDoubleQuoted(value: string): string {
    // JSON escaping is compatible with YAML double-quoted scalars.
    return JSON.stringify(value).slice(1, -1);
}

function inferWorkspace(outputPath: string) {
    const normalized = outputPath.replace(/^\.?\//, '');
    if (normalized.startsWith('contracts/')) return 'contracts';
    if (normalized.startsWith('packages/')) return 'sdk';
    if (normalized.startsWith('apps/')) return 'ui';
    if (normalized.startsWith('components/')) return 'ui';
    if (normalized.startsWith('docs/')) return 'docs';
    return 'general';
}

function defaultVerifyCommands(workspace: string, outputPath: string): string[] {
    const normalized = outputPath.replace(/^\.?\//, '');

    if (workspace === 'contracts') return ['cd contracts && forge test'];

    if (workspace === 'ui') {
        if (normalized.startsWith('apps/dashboard/')) {
            return ['pnpm --filter dashboard lint', 'pnpm --filter dashboard build'];
        }
        if (normalized.startsWith('apps/landing/')) {
            return ['pnpm build'];
        }

        return ['pnpm lint'];
    }

    if (workspace === 'sdk') return ['pnpm -w exec tsc -p tsconfig.json'];

    return [];
}

// Fetch issues from GitHub using CLI
function fetchIssues(label = 'day-1', repo = 'hashpass-tech/JACK'): GHIssue[] {
    try {
        const output = execFileSync(
            'gh',
            [
                'issue',
                'list',
                '--repo',
                repo,
                '--label',
                label,
                '--json',
                'number,title,body',
                '--state',
                'open',
            ],
            { encoding: 'utf8' }
        );
        return JSON.parse(output);
    } catch (e) {
        console.error('❌ Failed to fetch issues from GitHub. Ensure gh CLI is installed and authenticated.');
        process.exit(1);
    }
}

// Parse issue body for metadata
function parseIssue(issue: GHIssue) {
    const body = issue.body || '';

    // Extract output path
    const outputMatch = body.match(/(?:Output(?:\s+File)?|File|Path):\s*([^\n]+)/i);
    let outputPath = outputMatch ? outputMatch[1].trim() : '';
    // Strip markdown bolding and backticks
    outputPath = outputPath
        .replace(/[\*`]|(\*\*)/g, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^:?\s*/, '')
        .trim();

    // Extract acceptance criteria (lines starting with - [ ])
    const acceptance = body
        .split('\n')
        .filter(line => line.match(/^[-*]\s*\[[ x]\]/))
        .map(line => line.replace(/^[-*]\s*\[[ x]\]\s*/, '').trim());

    // Extract workspace if explicitly provided; otherwise infer from output path.
    const workspaceMatch = body.match(/(?:Workspace|Area|Domain):\s*([^\n]+)/i);
    const workspaceRaw = workspaceMatch ? workspaceMatch[1].replace(/[`*]/g, '').trim().toLowerCase() : '';
    const workspace = workspaceRaw || (outputPath ? inferWorkspace(outputPath) : 'general');

    // Extract context file hints (optional)
    const contextMatch = body.match(
        /(?:\*\*|###|##)?\s*Context:?\*?\*?\s*\n?([\s\S]*?)(?=\n?(?:\*\*|###|##)?\s*(?:Requirement|Acceptance|Criteria|Output|File|Path|Estimate|Workspace|Verify)|$)/i
    );
    const context: string[] = [];
    if (contextMatch && contextMatch[1]) {
        const section = contextMatch[1];
        const bulletPaths = section
            .split('\n')
            .map(line => line.trim())
            .filter(line => /^[-*]\s+/.test(line))
            .map(line => line.replace(/^[-*]\s+/, '').replace(/[`*]/g, '').trim())
            .filter(Boolean);

        context.push(...bulletPaths);
    }

    // Extract requirement
    let requirement = '';
    // Look for text specifically under the "Requirement" section, ignoring bold markers
    const reqMatch = body.match(
        /(?:\*\*|###|##)?\s*Requirement:?\*?\*?\s*\n?([\s\S]*?)(?=\n?(?:\*\*|###|##)?\s*(?:Context|Acceptance|Criteria|Output|File|Path|Estimate|Workspace|Verify)|$)/i
    );

    if (reqMatch && reqMatch[1].trim().length > 10) {
        requirement = reqMatch[1].trim();
    } else {
        // Fallback: take start/middle of body that isn't a known tag
        requirement = body.split(/(?:Context|Acceptance|Criteria|Output|File|Path|Estimate|Workspace|Verify):/i)[0]
            .replace(/\*\*[^*]+\*\*:?/g, '')
            .trim();
    }

    if (!requirement || requirement.length < 5) requirement = issue.title;

    // Extract verify commands if explicitly provided; otherwise set sensible defaults based on workspace/output.
    const verifyMatch = body.match(
        /(?:\*\*|###|##)?\s*Verify(?:\s+Commands?)?:?\*?\*?\s*\n?([\s\S]*?)(?=\n?(?:\*\*|###|##)?\s*(?:Context|Requirement|Acceptance|Criteria|Output|File|Path|Estimate|Workspace)|$)/i
    );

    const verifyCommands: string[] = [];
    if (verifyMatch && verifyMatch[1]) {
        const section = verifyMatch[1].trim();

        const codeBlockRegex = /```(?:bash|sh)?\s*([\s\S]*?)```/gi;
        let match: RegExpExecArray | null;
        while ((match = codeBlockRegex.exec(section)) !== null) {
            const blockLines = match[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'));
            verifyCommands.push(...blockLines);
        }

        const bulletCommands = section
            .split('\n')
            .map(line => line.trim())
            .filter(line => /^[-*]\s+/.test(line) && !/^[-*]\s*\[[ x]\]/.test(line))
            .map(line => line.replace(/^[-*]\s+/, '').replace(/[`*]/g, '').trim())
            .filter(Boolean);

        verifyCommands.push(...bulletCommands);
    }

    const verify =
        verifyCommands.length > 0
            ? Array.from(new Set(verifyCommands))
            : outputPath
              ? defaultVerifyCommands(workspace, outputPath)
              : [];

    const preferredAgentMatch = body.match(/PREFERRED_AGENT\s*=\s*([a-z0-9_-]+)/i);
    const preferredAgent = preferredAgentMatch?.[1]?.toLowerCase();

    return { outputPath, acceptance, requirement, workspace, verify, context, preferredAgent };
}

// Convert to YAML-style string for the agent system
function issuesToYAML(issues: GHIssue[]) {
    let yamlStr = `# Auto-generated from GitHub Issues\n# Generated: ${new Date().toISOString()}\n\nversion: "1.0"\ntasks:\n`;

    for (const issue of issues) {
        const meta = parseIssue(issue);

        yamlStr += `  - id: "GH-${issue.number}"\n`;
        yamlStr += `    github_issue: ${issue.number}\n`;
        yamlStr += `    title: "${escapeYamlDoubleQuoted(issue.title)}"\n`;
        yamlStr += `    requirement: |\n`;
        yamlStr += `      ${meta.requirement.split('\n').join('\n      ')}\n`;

        if (meta.workspace) {
            yamlStr += `    workspace: "${escapeYamlDoubleQuoted(meta.workspace)}"\n`;
        }

        if (meta.outputPath) {
            yamlStr += `    output:\n`;
            yamlStr += `      path: "${escapeYamlDoubleQuoted(meta.outputPath)}"\n`;
            yamlStr += `      type: "${escapeYamlDoubleQuoted(path.extname(meta.outputPath).slice(1) || 'text')}"\n`;
        }

        if (meta.context.length > 0) {
            yamlStr += `    context:\n`;
            meta.context.forEach(p => {
                yamlStr += `      - "${escapeYamlDoubleQuoted(p)}"\n`;
            });
        }

        if (meta.verify.length > 0) {
            yamlStr += `    verify:\n`;
            meta.verify.forEach(cmd => {
                yamlStr += `      - "${escapeYamlDoubleQuoted(cmd)}"\n`;
            });
        }

        if (meta.preferredAgent) {
            yamlStr += `    agent_config:\n`;
            yamlStr += `      preferred: "${escapeYamlDoubleQuoted(meta.preferredAgent)}"\n`;
        }

        if (meta.acceptance.length > 0) {
            yamlStr += `    acceptance:\n`;
            meta.acceptance.forEach(a => {
                yamlStr += `      - "${escapeYamlDoubleQuoted(a)}"\n`;
            });
        }
        yamlStr += `\n`;
    }

    return yamlStr;
}

function parseArgs(argv: string[]): CliOptions {
    const args = [...argv];
    let label = 'day-1';
    if (args[0] && !args[0].startsWith('-')) {
        label = args.shift()!;
    }

    const options: CliOptions = {
        label,
        repo: 'hashpass-tech/JACK',
        start: false,
        verify: false,
        noCommit: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--assign') {
            const value = args[i + 1];
            if (!value) {
                throw new Error('Missing value for --assign');
            }
            options.assign = value;
            i++;
            continue;
        }
        if (arg === '--repo') {
            const value = args[i + 1];
            if (!value) {
                throw new Error('Missing value for --repo');
            }
            options.repo = value;
            i++;
            continue;
        }
        if (arg === '--start') {
            options.start = true;
            continue;
        }
        if (arg === '--task' || arg === '-t') {
            const value = args[i + 1];
            if (!value) {
                throw new Error('Missing value for --task');
            }
            options.taskId = value;
            i++;
            continue;
        }
        if (arg === '--agent' || arg === '--preferred-agent') {
            const value = args[i + 1];
            if (!value) {
                throw new Error('Missing value for --agent');
            }
            options.preferredAgent = value.toLowerCase();
            i++;
            continue;
        }
        if (arg === '--verify') {
            options.verify = true;
            continue;
        }
        if (arg === '--no-commit') {
            options.noCommit = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            console.log(`Usage:
  pnpm agent:sync [label]
  pnpm agent:sync [label] --assign @me
  pnpm agent:sync [label] --assign @me --start --agent codex --verify

Options:
  --assign <login>      Assign synced issues to a GitHub user (supports @me).
  --start               Run agent execution immediately after sync.
  --task <id>           Execute only one task id (for example GH-17).
  --agent <name>        Force preferred agent for this run (codex, kiro, claude-code, cursor).
  --verify              Run task verification commands in agent-runner.
  --no-commit           Do not auto-commit task outputs in agent-runner.
  --repo <owner/name>   Override repository for sync/assign actions.
`);
            process.exit(0);
        }

        console.warn(`⚠️ Unknown argument: ${arg}`);
    }

    return options;
}

function resolveAssignee(value: string): string {
    const normalized = value.trim();
    if (normalized === '@me' || normalized.toLowerCase() === 'me' || normalized.toLowerCase() === 'self') {
        const login = execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' }).trim();
        if (!login) {
            throw new Error('Unable to resolve current GitHub user for --assign @me');
        }
        return login;
    }
    return normalized.replace(/^@/, '');
}

function selectIssuesForTask(issues: GHIssue[], taskId?: string): GHIssue[] {
    if (!taskId) return issues;

    const match = taskId.match(/\d+/);
    if (!match) {
        throw new Error(`Unable to infer issue number from task id: ${taskId}`);
    }

    const issueNumber = Number(match[0]);
    return issues.filter(issue => issue.number === issueNumber);
}

function assignIssues(issues: GHIssue[], repo: string, assignee: string, preferredAgent?: string) {
    for (const issue of issues) {
        const args = ['issue', 'edit', String(issue.number), '--repo', repo, '--add-assignee', assignee];
        if (preferredAgent === 'codex') {
            args.push('--add-label', 'codex');
        }
        execFileSync('gh', args, { stdio: 'inherit' });
    }
}

function startAgentRun(taskFile: string, options: CliOptions) {
    const args = ['--import', 'tsx', 'scripts/agent-runner.ts', taskFile];
    if (options.taskId) {
        args.push('--task', options.taskId);
    }
    if (options.preferredAgent) {
        args.push('--agent', options.preferredAgent);
    }
    if (options.verify) {
        args.push('--verify');
    }
    if (options.noCommit) {
        args.push('--no-commit');
    }

    const env = { ...process.env };
    if (options.preferredAgent === 'codex' && !env.CODEX_AUTO_EXEC) {
        env.CODEX_AUTO_EXEC = '1';
    }

    execFileSync('node', args, { stdio: 'inherit', env });
}

// Main execution
const options = parseArgs(process.argv.slice(2));
console.log(`🔄 Syncing issues from GitHub with label: ${options.label}...`);

const issues = fetchIssues(options.label, options.repo);
console.log(`✅ Found ${issues.length} open issues.`);

if (issues.length === 0) {
    console.log('No tasks to sync.');
    process.exit(0);
}

if (options.assign) {
    const assignee = resolveAssignee(options.assign);
    const targetIssues = selectIssuesForTask(issues, options.taskId);
    console.log(`👤 Assigning ${targetIssues.length} issue(s) to @${assignee}...`);
    assignIssues(targetIssues, options.repo, assignee, options.preferredAgent);
}

const yamlOutput = issuesToYAML(issues);

const taskDir = path.join(process.cwd(), '.agent-tasks');
if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
}

const filePath = path.join(taskDir, `${options.label}.yaml`);
fs.writeFileSync(filePath, yamlOutput);

console.log(`🚀 Generated task file: .agent-tasks/${options.label}.yaml`);

if (options.start) {
    console.log('▶️ Starting agent execution...');
    startAgentRun(filePath, options);
} else {
    console.log(`You can now run: pnpm agent:run .agent-tasks/${options.label}.yaml`);
}
