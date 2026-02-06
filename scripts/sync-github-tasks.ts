import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GHIssue {
    number: number;
    title: string;
    body: string;
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
function fetchIssues(label = 'day-1'): GHIssue[] {
    try {
        const cmd = `gh issue list --repo hashpass-tech/JACK --label "${label}" --json number,title,body --state open`;
        const output = execSync(cmd, { encoding: 'utf8' });
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

    return { outputPath, acceptance, requirement, workspace, verify, context };
}

// Convert to YAML-style string for the agent system
function issuesToYAML(issues: GHIssue[]) {
    let yamlStr = `# Auto-generated from GitHub Issues\n# Generated: ${new Date().toISOString()}\n\nversion: "1.0"\ntasks:\n`;

    for (const issue of issues) {
        const meta = parseIssue(issue);

        yamlStr += `  - id: "GH-${issue.number}"\n`;
        yamlStr += `    github_issue: ${issue.number}\n`;
        yamlStr += `    title: "${issue.title.replace(/"/g, '\\"')}"\n`;
        yamlStr += `    requirement: |\n`;
        yamlStr += `      ${meta.requirement.split('\n').join('\n      ')}\n`;

        if (meta.workspace) {
            yamlStr += `    workspace: "${meta.workspace}"\n`;
        }

        if (meta.outputPath) {
            yamlStr += `    output:\n`;
            yamlStr += `      path: "${meta.outputPath}"\n`;
            yamlStr += `      type: "${path.extname(meta.outputPath).slice(1) || 'text'}"\n`;
        }

        if (meta.context.length > 0) {
            yamlStr += `    context:\n`;
            meta.context.forEach(p => {
                yamlStr += `      - "${p.replace(/"/g, '\\"')}"\n`;
            });
        }

        if (meta.verify.length > 0) {
            yamlStr += `    verify:\n`;
            meta.verify.forEach(cmd => {
                yamlStr += `      - "${cmd.replace(/"/g, '\\"')}"\n`;
            });
        }

        if (meta.acceptance.length > 0) {
            yamlStr += `    acceptance:\n`;
            meta.acceptance.forEach(a => {
                yamlStr += `      - "${a.replace(/"/g, '\\"')}"\n`;
            });
        }
        yamlStr += `\n`;
    }

    return yamlStr;
}

// Main execution
const label = process.argv[2] || 'day-1';
console.log(`🔄 Syncing issues from GitHub with label: ${label}...`);

const issues = fetchIssues(label);
console.log(`✅ Found ${issues.length} open issues.`);

if (issues.length === 0) {
    console.log('No tasks to sync.');
    process.exit(0);
}

const yamlOutput = issuesToYAML(issues);

const taskDir = path.join(process.cwd(), '.agent-tasks');
if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
}

const filePath = path.join(taskDir, `${label}.yaml`);
fs.writeFileSync(filePath, yamlOutput);

console.log(`🚀 Generated task file: .agent-tasks/${label}.yaml`);
console.log(`You can now run: pnpm agent:run .agent-tasks/${label}.yaml`);
