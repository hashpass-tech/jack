import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GHIssue {
    number: number;
    title: string;
    body: string;
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
    const outputMatch = body.match(/(?:Output|File):\s*([^\n]+)/i);
    let outputPath = outputMatch ? outputMatch[1].trim() : '';
    // Strip markdown bolding and backticks
    outputPath = outputPath.replace(/[\*`]|(\*\*)/g, '').replace(/^:?\s*/, '').trim();

    // Extract acceptance criteria (lines starting with - [ ])
    const acceptance = body
        .split('\n')
        .filter(line => line.match(/^[-*]\s*\[[ x]\]/))
        .map(line => line.replace(/^[-*]\s*\[[ x]\]\s*/, '').trim());

    // Extract requirement
    let requirement = '';
    // Look for text specifically under the "Requirement" section, ignoring bold markers
    const reqMatch = body.match(/(?:\*\*|###)?\s*Requirement:?\*?\*?\s*\n?([\s\S]*?)(?=\n?(?:\*\*|###)?\s*(?:Acceptance|Criteria|Output|File|Estimate)|$)/i);

    if (reqMatch && reqMatch[1].trim().length > 10) {
        requirement = reqMatch[1].trim();
    } else {
        // Fallback: take start/middle of body that isn't a known tag
        requirement = body.split(/(?:Acceptance|Criteria|Output|File|Estimate):/i)[0]
            .replace(/\*\*[^*]+\*\*:?/g, '')
            .trim();
    }

    if (!requirement || requirement.length < 5) requirement = issue.title;

    return { outputPath, acceptance, requirement };
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

        if (meta.outputPath) {
            yamlStr += `    output:\n`;
            yamlStr += `      path: "${meta.outputPath}"\n`;
            yamlStr += `      type: "${path.extname(meta.outputPath).slice(1) || 'text'}"\n`;
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
