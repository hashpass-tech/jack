import blessed from 'blessed';

class AgentDashboard {
    private screen: blessed.Widgets.Screen;
    private taskList: blessed.Widgets.ListElement;
    private agentStatus: blessed.Widgets.BoxElement;
    private logs: blessed.Widgets.Log;

    constructor() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'JACK Agent Orchestrator Dashboard'
        });

        this.taskList = blessed.list({
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            label: ' Tasks ',
            border: { type: 'line' },
            style: {
                selected: { bg: 'blue', fg: 'white' },
                border: { fg: '#F2B94B' }
            }
        });

        this.agentStatus = blessed.box({
            top: 0,
            left: '50%',
            width: '50%',
            height: '40%',
            label: ' Agent Backends Status ',
            border: { type: 'line' },
            style: {
                border: { fg: '#38BDF8' }
            }
        });

        this.logs = blessed.log({
            top: '40%',
            left: '50%',
            width: '50%',
            height: '60%',
            label: ' System Logs ',
            border: { type: 'line' },
            style: {
                border: { fg: 'white' }
            }
        });

        this.screen.append(this.taskList);
        this.screen.append(this.agentStatus);
        this.screen.append(this.logs);

        this.screen.key(['q', 'C-c', 'escape'], () => process.exit(0));

        this.updateAgentStatus();
        this.log('Dashboard initialized. Waiting for tasks...');
        this.screen.render();
    }

    updateTask(taskId: string, status: 'pending' | 'running' | 'done' | 'failed') {
        const icon = {
            pending: '⏳',
            running: '🔄',
            done: '✅',
            failed: '❌'
        }[status];

        this.taskList.addItem(`${icon} ${taskId}`);
        this.screen.render();
    }

    updateAgentStatus(activeAgents: { name: string; task: string }[] = []) {
        let content = '\n  🤖 Active Agent Nodes:\n\n';

        const agents = ['kiro', 'claude-code', 'codex', 'cursor', 'openclaw'];
        agents.forEach(a => {
            const active = activeAgents.find(aa => aa.name === a);
            const status = active ? `[ BUSY ] -> ${active.task}` : '[ IDLE ]';
            content += `  ${a.padEnd(12)} : ${status}\n`;
        });

        this.agentStatus.setContent(content);
        this.screen.render();
    }

    log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.log(`[${timestamp}] ${message}`);
        this.screen.render();
    }
}

async function main() {
    const dashboard = new AgentDashboard();

    // Simulated updates for demonstration if run directly
    if (require.main === module) {
        dashboard.updateTask('D1-CRIT-1', 'running');
        dashboard.updateAgentStatus([{ name: 'claude-code', task: 'D1-CRIT-1' }]);
        dashboard.log('Claude Code started generating JACKPolicyHook.sol');

        setTimeout(() => {
            dashboard.updateTask('D1-CRIT-1', 'done');
            dashboard.updateAgentStatus();
            dashboard.log('D1-CRIT-1 completed successfully');
            dashboard.updateTask('D1-CRIT-2', 'pending');
        }, 3000);
    }
}

if (require.main === module) {
    main();
}
