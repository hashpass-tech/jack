#!/usr/bin/env node
/**
 * JACK Spec CLI - Kiro-style spec and task management
 * 
 * Usage:
 *   npx jack-spec list                    # List all specs
 *   npx jack-spec status <spec>           # Show spec status
 *   npx jack-spec run --task <id>         # Run a specific task
 *   npx jack-spec run --phase <n>         # Run all tasks in phase
 *   npx jack-spec run --all               # Run all pending tasks
 *   npx jack-spec new <name>              # Create new spec
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

const KIRO_DIR = path.join(process.cwd(), '.kiro');
const SPECS_DIR = path.join(KIRO_DIR, 'specs');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
};

const STATUS_ICONS = {
    completed: '✅',
    'in-progress': '🔄',
    pending: '🔵',
    blocked: '🔴',
    skipped: '⏭️',
};

const PRIORITY_COLORS = {
    critical: colors.red,
    high: colors.yellow,
    medium: colors.blue,
    low: colors.dim,
};

/**
 * Parse tasks from markdown file
 */
function parseTasksFromMarkdown(content) {
    const taskRegex = /<!-- @task id="([^"]+)" status="([^"]+)" priority="([^"]+)"(?: depends="([^"]+)")? -->/g;
    const endTaskRegex = /<!-- @endtask -->/g;

    const tasks = [];
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
        const [fullMatch, id, status, priority, depends] = match;
        const startIndex = match.index;

        // Find the content between @task and @endtask
        const remainingContent = content.slice(startIndex);
        const endMatch = remainingContent.match(/<!-- @endtask -->/);
        if (endMatch) {
            const taskContent = remainingContent.slice(0, endMatch.index);

            // Extract title
            const titleMatch = taskContent.match(/### Task [^:]+: (.+)/);
            const title = titleMatch ? titleMatch[1] : id;

            // Extract description
            const descMatch = taskContent.match(/\*\*Description:\*\*\n(.+?)(?=\n\n|\*\*)/s);
            const description = descMatch ? descMatch[1].trim() : '';

            // Extract commands
            const cmdMatch = taskContent.match(/```bash\n([\s\S]+?)```/);
            const commands = cmdMatch ? cmdMatch[1].trim().split('\n') : [];

            // Extract target file
            const targetMatch = taskContent.match(/\*\*Target File:\*\* `([^`]+)`/);
            const targetFile = targetMatch ? targetMatch[1] : null;

            // Extract acceptance criteria
            const criteriaMatch = taskContent.match(/\*\*Acceptance Criteria:\*\*\n([\s\S]+?)(?=\n\n\*\*|\n---|\n<!--)/);
            const criteria = criteriaMatch
                ? criteriaMatch[1].match(/- \[[ x]\] .+/g) || []
                : [];

            // Extract estimate
            const estimateMatch = taskContent.match(/\*\*Estimate:\*\* ([^\n]+)/);
            const estimate = estimateMatch ? estimateMatch[1] : '';

            tasks.push({
                id,
                title,
                status,
                priority,
                depends: depends ? depends.split(',').map(d => d.trim()) : [],
                description,
                commands,
                targetFile,
                criteria,
                estimate,
                raw: taskContent,
            });
        }
    }

    return tasks;
}

/**
 * Get all specs
 */
function getSpecs() {
    if (!fs.existsSync(SPECS_DIR)) {
        return [];
    }

    return fs.readdirSync(SPECS_DIR)
        .filter(name => {
            const specPath = path.join(SPECS_DIR, name);
            return fs.statSync(specPath).isDirectory();
        })
        .map(name => {
            const specPath = path.join(SPECS_DIR, name);
            const tasksPath = path.join(specPath, 'tasks.md');
            const requirementsPath = path.join(specPath, 'requirements.md');
            const designPath = path.join(specPath, 'design.md');

            let tasks = [];
            if (fs.existsSync(tasksPath)) {
                const content = fs.readFileSync(tasksPath, 'utf-8');
                tasks = parseTasksFromMarkdown(content);
            }

            return {
                name,
                path: specPath,
                hasRequirements: fs.existsSync(requirementsPath),
                hasDesign: fs.existsSync(designPath),
                hasTasks: fs.existsSync(tasksPath),
                tasks,
            };
        });
}

/**
 * Update task status in markdown file
 */
function updateTaskStatus(specName, taskId, newStatus) {
    const tasksPath = path.join(SPECS_DIR, specName, 'tasks.md');
    if (!fs.existsSync(tasksPath)) {
        console.error(`${colors.red}Tasks file not found: ${tasksPath}${colors.reset}`);
        return false;
    }

    let content = fs.readFileSync(tasksPath, 'utf-8');

    // Update the @task annotation
    const pattern = new RegExp(
        `(<!-- @task id="${taskId}" status=")([^"]+)(")`,
        'g'
    );
    content = content.replace(pattern, `$1${newStatus}$3`);

    // Update the status line
    const statusPatterns = [
        [/🔵 Pending/, getStatusDisplay(newStatus)],
        [/🔄 In Progress/, getStatusDisplay(newStatus)],
        [/✅ Completed/, getStatusDisplay(newStatus)],
        [/🔴 Blocked/, getStatusDisplay(newStatus)],
    ];

    // Find and replace status for this specific task
    const taskSection = new RegExp(
        `(<!-- @task id="${taskId}"[^>]+-->)([\\s\\S]+?)(<!-- @endtask -->)`,
        'g'
    );

    content = content.replace(taskSection, (match, start, body, end) => {
        let newBody = body;
        statusPatterns.forEach(([pattern, replacement]) => {
            newBody = newBody.replace(pattern, replacement);
        });
        return start + newBody + end;
    });

    fs.writeFileSync(tasksPath, content);
    return true;
}

function getStatusDisplay(status) {
    const icons = {
        completed: '✅ Completed',
        'in-progress': '🔄 In Progress',
        pending: '🔵 Pending',
        blocked: '🔴 Blocked',
    };
    return icons[status] || status;
}

/**
 * Execute a task
 */
async function executeTask(spec, task) {
    console.log(`\n${colors.bgBlue}${colors.bright} EXECUTING TASK ${colors.reset}`);
    console.log(`${colors.cyan}${task.id}${colors.reset}: ${task.title}`);
    console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}\n`);

    // Update status to in-progress
    updateTaskStatus(spec.name, task.id, 'in-progress');

    if (task.commands.length > 0) {
        console.log(`${colors.yellow}Running commands:${colors.reset}`);

        for (const cmd of task.commands) {
            console.log(`\n${colors.dim}$ ${cmd}${colors.reset}\n`);

            try {
                execSync(cmd, {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
            } catch (error) {
                console.error(`${colors.red}Command failed: ${cmd}${colors.reset}`);
                updateTaskStatus(spec.name, task.id, 'blocked');
                return false;
            }
        }
    }

    if (task.targetFile) {
        console.log(`\n${colors.magenta}Target file: ${task.targetFile}${colors.reset}`);
        console.log(`${colors.dim}Opening in editor...${colors.reset}`);

        // Try to open in VS Code
        try {
            execSync(`code "${task.targetFile}"`, { stdio: 'ignore' });
        } catch {
            // Silently fail if VS Code isn't available
        }
    }

    // Show acceptance criteria
    if (task.criteria.length > 0) {
        console.log(`\n${colors.yellow}Acceptance Criteria:${colors.reset}`);
        task.criteria.forEach(c => console.log(`  ${c}`));
    }

    // Ask for confirmation
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`\n${colors.green}Mark task as completed? (y/n): ${colors.reset}`, (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y') {
                updateTaskStatus(spec.name, task.id, 'completed');
                console.log(`${colors.green}✅ Task ${task.id} marked as completed${colors.reset}`);
                resolve(true);
            } else {
                console.log(`${colors.yellow}Task status unchanged${colors.reset}`);
                resolve(false);
            }
        });
    });
}

/**
 * List all specs
 */
function listSpecs() {
    const specs = getSpecs();

    if (specs.length === 0) {
        console.log(`${colors.yellow}No specs found. Create one with: jack-spec new <name>${colors.reset}`);
        return;
    }

    console.log(`\n${colors.bright}${colors.cyan}📋 JACK Specs${colors.reset}\n`);

    specs.forEach(spec => {
        const completed = spec.tasks.filter(t => t.status === 'completed').length;
        const total = spec.tasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        const barLength = 20;
        const filledLength = Math.round((progress / 100) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

        console.log(`${colors.bright}${spec.name}${colors.reset}`);
        console.log(`  ${colors.dim}├─${colors.reset} Requirements: ${spec.hasRequirements ? '✅' : '❌'}`);
        console.log(`  ${colors.dim}├─${colors.reset} Design: ${spec.hasDesign ? '✅' : '❌'}`);
        console.log(`  ${colors.dim}├─${colors.reset} Tasks: ${spec.hasTasks ? '✅' : '❌'} (${completed}/${total})`);
        console.log(`  ${colors.dim}└─${colors.reset} Progress: [${colors.green}${bar}${colors.reset}] ${progress}%\n`);
    });
}

/**
 * Show spec status
 */
function showStatus(specName) {
    const specs = getSpecs();
    const spec = specs.find(s => s.name === specName || s.name.includes(specName));

    if (!spec) {
        console.error(`${colors.red}Spec not found: ${specName}${colors.reset}`);
        console.log(`Available specs: ${specs.map(s => s.name).join(', ')}`);
        return;
    }

    console.log(`\n${colors.bgBlue}${colors.bright} ${spec.name.toUpperCase()} ${colors.reset}\n`);

    // Group tasks by phase
    const phases = {};
    let currentPhase = 'Uncategorized';

    const tasksPath = path.join(SPECS_DIR, spec.name, 'tasks.md');
    if (fs.existsSync(tasksPath)) {
        const content = fs.readFileSync(tasksPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach(line => {
            const phaseMatch = line.match(/^## Phase (\d+): (.+)/);
            if (phaseMatch) {
                currentPhase = `Phase ${phaseMatch[1]}: ${phaseMatch[2]}`;
            }

            spec.tasks.forEach(task => {
                if (line.includes(`id="${task.id}"`)) {
                    if (!phases[currentPhase]) phases[currentPhase] = [];
                    if (!phases[currentPhase].find(t => t.id === task.id)) {
                        phases[currentPhase].push(task);
                    }
                }
            });
        });
    }

    Object.entries(phases).forEach(([phase, tasks]) => {
        console.log(`${colors.bright}${colors.yellow}${phase}${colors.reset}`);

        tasks.forEach(task => {
            const statusIcon = STATUS_ICONS[task.status] || '❓';
            const priorityColor = PRIORITY_COLORS[task.priority] || colors.reset;

            console.log(`  ${statusIcon} ${colors.cyan}${task.id}${colors.reset}: ${task.title}`);
            console.log(`     ${priorityColor}[${task.priority}]${colors.reset} ${colors.dim}${task.estimate}${colors.reset}`);

            if (task.depends.length > 0) {
                console.log(`     ${colors.dim}└─ depends: ${task.depends.join(', ')}${colors.reset}`);
            }
        });
        console.log();
    });

    // Summary
    const completed = spec.tasks.filter(t => t.status === 'completed').length;
    const inProgress = spec.tasks.filter(t => t.status === 'in-progress').length;
    const pending = spec.tasks.filter(t => t.status === 'pending').length;
    const blocked = spec.tasks.filter(t => t.status === 'blocked').length;

    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset} ✅ ${completed} | 🔄 ${inProgress} | 🔵 ${pending} | 🔴 ${blocked}`);
}

/**
 * Create new spec
 */
function createNewSpec(name) {
    const specDir = path.join(SPECS_DIR, name);

    if (fs.existsSync(specDir)) {
        console.error(`${colors.red}Spec already exists: ${name}${colors.reset}`);
        return;
    }

    fs.mkdirSync(specDir, { recursive: true });

    // Create requirements.md template
    fs.writeFileSync(path.join(specDir, 'requirements.md'), `# Requirements: ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Overview
<!-- Brief description of this feature/spec -->

## User Stories

### US-1: [User Story Title]
**As a** [user type]  
**I want to** [action]  
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Requirements

### TR-1: [Technical Requirement]
- Requirement detail 1
- Requirement detail 2

## Dependencies
<!-- List any dependencies -->

## Priority
<!-- High / Medium / Low -->
`);

    // Create design.md template
    fs.writeFileSync(path.join(specDir, 'design.md'), `# Design: ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Architecture Overview

\`\`\`
<!-- Add architecture diagram here -->
\`\`\`

## Component Design

### Component 1
<!-- Component details -->

## Data Flow
<!-- Describe data flow -->

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| | | |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| | | | |
`);

    // Create tasks.md template
    fs.writeFileSync(path.join(specDir, 'tasks.md'), `# Task List / ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Phase 1: Setup

<!-- @task id="${name.toUpperCase().substring(0, 4)}-1" status="pending" priority="high" -->
### Task ${name.toUpperCase().substring(0, 4)}-1: [Task Title]
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 1h

**Description:**
<!-- Task description -->

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Run Task:** \`[▶ Execute Task ${name.toUpperCase().substring(0, 4)}-1]\`
<!-- @endtask -->

---

## Progress Summary

| Phase | Total | Completed | In Progress | Pending |
|-------|-------|-----------|-------------|---------|
| Phase 1 | 1 | 0 | 0 | 1 |
| **Total** | **1** | **0** | **0** | **1** |
`);

    console.log(`${colors.green}✅ Created new spec: ${name}${colors.reset}`);
    console.log(`\n${colors.dim}Files created:${colors.reset}`);
    console.log(`  📄 ${specDir}/requirements.md`);
    console.log(`  📄 ${specDir}/design.md`);
    console.log(`  📄 ${specDir}/tasks.md`);
}

/**
 * Run task(s)
 */
async function runTasks(options) {
    const specs = getSpecs();

    if (options.task) {
        // Find specific task
        for (const spec of specs) {
            const task = spec.tasks.find(t => t.id === options.task);
            if (task) {
                // Check dependencies
                const unmetDeps = task.depends.filter(depId => {
                    const depTask = spec.tasks.find(t => t.id === depId);
                    return depTask && depTask.status !== 'completed';
                });

                if (unmetDeps.length > 0) {
                    console.log(`${colors.yellow}⚠️  Task has unmet dependencies: ${unmetDeps.join(', ')}${colors.reset}`);
                    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                    const proceed = await new Promise(resolve => {
                        rl.question('Continue anyway? (y/n): ', answer => {
                            rl.close();
                            resolve(answer.toLowerCase() === 'y');
                        });
                    });
                    if (!proceed) return;
                }

                await executeTask(spec, task);
                return;
            }
        }
        console.error(`${colors.red}Task not found: ${options.task}${colors.reset}`);
        return;
    }

    if (options.spec) {
        const spec = specs.find(s => s.name === options.spec || s.name.includes(options.spec));
        if (!spec) {
            console.error(`${colors.red}Spec not found: ${options.spec}${colors.reset}`);
            return;
        }

        let tasksToRun = spec.tasks.filter(t => t.status === 'pending');

        if (options.phase !== undefined) {
            // Filter by phase (would need parsing logic)
            console.log(`${colors.yellow}Running Phase ${options.phase} tasks...${colors.reset}`);
        }

        for (const task of tasksToRun) {
            const result = await executeTask(spec, task);
            if (!result) break;
        }
    }
}

/**
 * Main CLI handler
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    console.log(`\n${colors.bright}${colors.magenta}🎯 JACK Spec Manager${colors.reset}`);
    console.log(`${colors.dim}Kiro-style spec management for Antigravity${colors.reset}\n`);

    switch (command) {
        case 'list':
        case 'ls':
            listSpecs();
            break;

        case 'status':
        case 'st':
            showStatus(args[1] || '');
            break;

        case 'run':
            const options = {
                task: args.includes('--task') ? args[args.indexOf('--task') + 1] : null,
                phase: args.includes('--phase') ? parseInt(args[args.indexOf('--phase') + 1]) : undefined,
                spec: args.includes('--spec') ? args[args.indexOf('--spec') + 1] : null,
                all: args.includes('--all'),
            };
            await runTasks(options);
            break;

        case 'new':
        case 'create':
            if (!args[1]) {
                console.error(`${colors.red}Please provide a spec name${colors.reset}`);
                console.log(`Usage: jack-spec new <spec_name>`);
                break;
            }
            createNewSpec(args[1]);
            break;

        default:
            console.log(`${colors.yellow}Usage:${colors.reset}`);
            console.log(`  jack-spec list                     List all specs`);
            console.log(`  jack-spec status <spec>            Show spec status`);
            console.log(`  jack-spec run --task <id>          Run specific task`);
            console.log(`  jack-spec run --spec <name> --all  Run all pending tasks`);
            console.log(`  jack-spec new <name>               Create new spec`);
    }
}

main().catch(console.error);
