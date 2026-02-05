'use client';

import { useState, type FC } from 'react';
import { CreateIntentView } from './CreateIntentView';
import { ExecutionsListView } from './ExecutionsListView';
import { ExecutionDetailView } from './ExecutionDetailView';
import AgentCostDashboard from './AgentCostDashboard';

const Dashboard: FC = () => {
	const [activeTab, setActiveTab] = useState<'create' | 'executions' | 'cost-dashboard'>('create');
	const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
	const dashboardVersion = process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? '0.0.0';
	const handleBack = () => {
		if (typeof window !== 'undefined') {
			window.history.back();
		}
	};

	const renderContent = () => {
		if (selectedExecutionId) {
			return (
				<ExecutionDetailView
					id={selectedExecutionId}
					onBack={() => setSelectedExecutionId(null)}
				/>
			);
		}

		switch (activeTab) {
			case 'create':
				return <CreateIntentView onIntentSubmitted={(id) => {
					setSelectedExecutionId(id);
					setActiveTab('executions');
				}} />;
			case 'executions':
				return <ExecutionsListView onSelectExecution={setSelectedExecutionId} />;
			case 'cost-dashboard':
				return <AgentCostDashboard />;
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col min-h-screen bg-[#0B1020]">
			<header className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-white/5 bg-[#0F1A2E] space-y-3 md:space-y-0">
				<div className="flex items-center justify-between w-full md:w-auto">
					<div className="flex items-center space-x-3 md:space-x-6">
						<button onClick={handleBack} className="text-gray-400 hover:text-white transition-colors">
							<svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
						</button>
						<div className="flex items-center space-x-2">
							<div className="w-8 h-8 bg-[#F2B94B] rounded-full flex items-center justify-center shrink-0">
								<span className="text-[#0B1020] font-bold text-sm">J</span>
							</div>
							<h1 className="font-space font-bold text-lg md:text-xl tracking-tight text-white whitespace-nowrap">
								JACK <span className="hidden sm:inline">DASHBOARD</span>
							</h1>
						</div>
					</div>

					<button className="md:hidden px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs border border-white/10 transition-all font-semibold">
						Connect
					</button>
				</div>

				<div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
					<div className="flex bg-[#0B1020] p-1 rounded-lg border border-white/10 shrink-0">
						<button
							onClick={() => { setActiveTab('create'); setSelectedExecutionId(null); }}
							className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md transition-all whitespace-nowrap ${activeTab === 'create' && !selectedExecutionId ? 'bg-[#F2B94B] text-[#0B1020] font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
						>
							Build Intent
						</button>
						<button
							onClick={() => { setActiveTab('executions'); setSelectedExecutionId(null); }}
							className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md transition-all whitespace-nowrap ${activeTab === 'executions' || selectedExecutionId ? 'bg-[#F2B94B] text-[#0B1020] font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
						>
							Executions
						</button>
						<button
							onClick={() => { setActiveTab('cost-dashboard'); setSelectedExecutionId(null); }}
							className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md transition-all whitespace-nowrap ${activeTab === 'cost-dashboard' ? 'bg-[#F2B94B] text-[#0B1020] font-bold shadow-lg' : 'text-gray-400 hover:text-white'}`}
						>
							Agent & Cost Dashboard
						</button>
					</div>
					<button className="hidden md:block px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-all font-semibold whitespace-nowrap">
						Connect Wallet
					</button>
				</div>
			</header>

			<main className="flex-1 overflow-y-auto p-8 bg-[#0B1020]">
				<div className="max-w-5xl mx-auto">
					{renderContent()}
				</div>
			</main>
			<footer className="border-t border-white/5 bg-[#0F1A2E] px-6 py-3 text-center text-[10px] uppercase tracking-[0.4em] text-gray-500">
				v{dashboardVersion}
			</footer>
		</div>
	);
};

export default Dashboard;
