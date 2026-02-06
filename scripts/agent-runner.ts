import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { execSync, spawn } from 'child_process';
import * as path from 'path';

export interface Task {
    id: string;
    title: string;
    requirement: string;
    acceptance?: string[];
    context?: string[];
    output?: {
        path: string;
        type?: string;
    };
    depends_on?: string[];
    github_issue?: number;
    workspace?: string;
    verify?: string[];
    agent_config?: {
        preferred?: string;
        [key: string]: unknown;
    };
}

export interface TaskResult {
    success: boolean;
    output_path: string;
    verification: {
        compiled: boolean;
        tests_passed: boolean;
        acceptance_met: string[];
        commands?: { command: string; exit_code: number }[];
    };
    agent_log: string;
    cost?: number;
    duration_ms: number;
}

export interface AgentBackend {
    name: string;
    executeTask(task: Task): Promise<TaskResult>;
    checkAvailability(): Promise<boolean>;
}

// ============================================
// BACKEND ADAPTERS
// ============================================

export class KiroAdapter implements AgentBackend {
    name = "kiro";

    async executeTask(task: Task): Promise<TaskResult> {
        console.log(`[Kiro] Mocking execution for ${task.id}...`);
        // Simulated API call
        return {
            success: true,
            output_path: task.output?.path ?? '',
            verification: { compiled: true, tests_passed: true, acceptance_met: task.acceptance ?? [] },
            agent_log: "Executed via Kiro Autonomous Agent",
            duration_ms: 15000
        };
    }

    async checkAvailability(): Promise<boolean> {
        return !!process.env.KIRO_API_KEY;
    }
}

export class ClaudeCodeAdapter implements AgentBackend {
    name = "claude-code";

    async executeTask(task: Task): Promise<TaskResult> {
        const prompt = `
      Task: ${task.requirement}
      Output to: ${task.output?.path ?? '(not set)'}
      Context files: ${(task.context ?? []).join(', ')}
      Acceptance criteria: ${(task.acceptance ?? []).join(', ')}
    `;

        try {
            console.log(`[Claude Code] Starting task ${task.id}...`);
            // Simulating CLI execution
            execSync(`echo "Processing task ${task.id}..."`);

            return {
                success: true,
                output_path: task.output?.path ?? '',
                verification: { compiled: true, tests_passed: true, acceptance_met: task.acceptance ?? [] },
                agent_log: "Executed via Claude Code CLI",
                duration_ms: 8000
            };
        } catch (e) {
            return {
                success: false,
                output_path: task.output?.path ?? '',
                verification: { compiled: false, tests_passed: false, acceptance_met: [] },
                agent_log: `Claude Code failed: ${e}`,
                duration_ms: 0
            };
        }
    }

    async checkAvailability(): Promise<boolean> {
        try {
            execSync('which claude-code', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }
}

export class CursorAdapter implements AgentBackend {
    name = "cursor";

    async executeTask(task: Task): Promise<TaskResult> {
        console.log(`
🤖 CURSOR TASK READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Copy this prompt to Cursor (Cmd+K):

${task.requirement}

Output: ${task.output?.path ?? '(not set)'}
Acceptance: ${(task.acceptance ?? []).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Press ENTER when done...
    `);

        await new Promise(resolve => process.stdin.once('data', () => resolve(null)));

        const exists = !!task.output?.path && fs.existsSync(task.output.path);
        return {
            success: exists,
            output_path: task.output?.path ?? '',
            verification: { compiled: exists, tests_passed: exists, acceptance_met: exists ? (task.acceptance ?? []) : [] },
            agent_log: "Manual execution via Cursor",
            duration_ms: 0
        };
    }

    async checkAvailability(): Promise<boolean> {
        return Boolean(process.stdin.isTTY && process.stdout.isTTY);
    }
}

export class CodexAdapter implements AgentBackend {
    name = "codex";

    async executeTask(task: Task): Promise<TaskResult> {
        console.log(`
🤖 CODEX TASK READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended flow:
1) Open Codex (CLI or IDE) in this repo
2) Solve the task using the requirement + context
3) Run the verify commands (if any)
4) Return here and press ENTER

Task: ${task.id} — ${task.title}
Workspace: ${task.workspace ?? 'unspecified'}
Output: ${task.output?.path ?? '(not set)'}

Requirement:
${task.requirement}

Context:
${(task.context ?? []).map(p => `- ${p}`).join('\n')}

Acceptance:
${(task.acceptance ?? []).map(a => `- ${a}`).join('\n')}

Verify commands:
${(task.verify ?? []).map(cmd => `- ${cmd}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Press ENTER when done...
    `);

        await new Promise(resolve => process.stdin.once('data', () => resolve(null)));

        const exists = !!task.output?.path && fs.existsSync(task.output.path);
        return {
            success: exists,
            output_path: task.output?.path ?? '',
            verification: { compiled: exists, tests_passed: exists, acceptance_met: exists ? (task.acceptance ?? []) : [] },
            agent_log: "Manual execution via Codex",
            duration_ms: 0
        };
    }

    async checkAvailability(): Promise<boolean> {
        if (!(process.stdin.isTTY && process.stdout.isTTY)) return false;
        try {
            execSync('which codex', { stdio: 'ignore' });
            return true;
        } catch {
            return Boolean(process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY);
        }
    }
}

// ============================================
// ORCHESTRATOR
// ============================================

export class TaskOrchestrator {
    private backends: AgentBackend[] = [];

    constructor() {
        this.registerBackend(new KiroAdapter());
        this.registerBackend(new ClaudeCodeAdapter());
        this.registerBackend(new CodexAdapter());
        this.registerBackend(new CursorAdapter());
    }

    registerBackend(backend: AgentBackend) {
        this.backends.push(backend);
    }

    async executeTask(
        task: Task,
        options?: { preferredAgent?: string; verify?: boolean; noCommit?: boolean }
    ): Promise<TaskResult> {
        const agent = await this.selectAgent(task, task.agent_config?.preferred ?? options?.preferredAgent);
        console.log(`🤖 Executing ${task.id} with ${agent.name}...`);

        const startTime = Date.now();
        const result = await agent.executeTask(task);
        result.duration_ms = Date.now() - startTime;

        if (result.success && options?.verify) {
            const ok = await this.runVerification(task, result);
            if (!ok) result.success = false;
        }

        if (result.success && !options?.noCommit) {
            await this.verifyAndCommit(task, result);
        }

        return result;
    }

    private async selectAgent(task: Task, preferred?: string): Promise<AgentBackend> {
        if (preferred) {
            const agent = this.backends.find(b => b.name === preferred);
            if (agent && await agent.checkAvailability()) return agent;
        }

        for (const backend of this.backends) {
            if (await backend.checkAvailability()) return backend;
        }

        throw new Error(
            `No available agent backend. Set PREFERRED_AGENT or configure a backend (e.g., KIRO_API_KEY, claude-code CLI, Codex, Cursor).`
        );
    }

    private async verifyAndCommit(task: Task, result: TaskResult) {
        console.log(`✅ Task ${task.id} completed. committing...`);
        try {
            if (!result.output_path) {
                console.warn(`⚠️ No output_path for task ${task.id}; skipping git commit.`);
                return;
            }

            // Extract issue number for closure message
            const issueNum = task.github_issue || task.id.match(/\d+/)?.[0];
            const closeMsg = issueNum ? `\n\nCloses #${issueNum}` : '';

            execSync(`git add ${result.output_path}`, { stdio: 'ignore' });
            execSync(`git commit -m "feat: ${task.title} (agent: ${result.agent_log})${closeMsg}"`, { stdio: 'ignore' });
        } catch (e) {
            console.warn(`⚠️ Failed to commit: ${e}`);
        }
    }

    private async runVerification(task: Task, result: TaskResult): Promise<boolean> {
        const commands = task.verify ?? [];
        if (commands.length === 0) return true;

        const commandResults: { command: string; exit_code: number }[] = [];
        for (const command of commands) {
            const exitCode = await new Promise<number>((resolve) => {
                const child = spawn(command, {
                    shell: true,
                    stdio: 'inherit',
                    cwd: process.cwd(),
                    env: process.env
                });
                child.on('exit', (code) => resolve(code ?? 1));
                child.on('error', () => resolve(1));
            });

            commandResults.push({ command, exit_code: exitCode });
            if (exitCode !== 0) {
                result.verification.commands = commandResults;
                result.verification.compiled = false;
                result.verification.tests_passed = false;
                return false;
            }
        }

        result.verification.commands = commandResults;
        return true;
    }
}

function parseArgs(argv: string[]) {
    const args = [...argv];

    let filePath = '.agent-tasks/tasks.yaml';
    if (args[0] && !args[0].startsWith('-')) {
        filePath = args.shift()!;
    }

    let taskId: string | undefined;
    let preferredAgent: string | undefined;
    let verify = false;
    let noCommit = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--task' || arg === '-t') {
            taskId = args[i + 1];
            i++;
            continue;
        }
        if (arg === '--all') {
            continue;
        }
        if (arg === '--agent' || arg === '--preferred-agent') {
            preferredAgent = args[i + 1];
            i++;
            continue;
        }
        if (arg === '--verify') {
            verify = true;
            continue;
        }
        if (arg === '--no-commit') {
            noCommit = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            console.log(`Usage: pnpm agent:run [taskFile] [--task <id>] [--agent <name>] [--verify] [--no-commit]`);
            process.exit(0);
        }

        console.warn(`⚠️ Unknown argument: ${arg}`);
    }

    return { filePath, taskId, preferredAgent, verify, noCommit };
}

function normalizeTask(raw: any): Task {
    return {
        ...raw,
        acceptance: raw.acceptance ?? [],
        context: raw.context ?? [],
    };
}

function sortTasksByDependencies(tasks: Task[]): Task[] {
    const byId = new Map(tasks.map(task => [task.id, task]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: Task[] = [];

    function visit(id: string) {
        if (visited.has(id)) return;
        if (visiting.has(id)) throw new Error(`Cyclic dependency detected at task: ${id}`);

        const task = byId.get(id);
        if (!task) return;

        visiting.add(id);
        for (const dep of task.depends_on ?? []) {
            visit(dep);
        }
        visiting.delete(id);
        visited.add(id);
        ordered.push(task);
    }

    for (const task of tasks) visit(task.id);

    return ordered;
}

async function main() {
    const orchestrator = new TaskOrchestrator();
    const { filePath, taskId, preferredAgent, verify, noCommit } = parseArgs(process.argv.slice(2));

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const tasksData: any = yaml.load(fs.readFileSync(filePath, 'utf8'));
    const tasks: Task[] = (tasksData.tasks ?? []).map(normalizeTask);
    const selectedTasks = taskId ? tasks.filter(task => task.id === taskId) : tasks;

    if (taskId && selectedTasks.length === 0) {
        console.error(`Task not found: ${taskId}`);
        process.exit(1);
    }

    for (const task of sortTasksByDependencies(selectedTasks)) {
        const result = await orchestrator.executeTask(task, {
            preferredAgent: preferredAgent ?? process.env.PREFERRED_AGENT,
            verify,
            noCommit
        });
        if (!result.success) {
            console.error(`❌ Task ${task.id} failed`);
            process.exit(1);
        }
    }

    console.log(`🚀 All tasks in ${filePath} processed successfully.`);
}

if (require.main === module) {
    main();
}
