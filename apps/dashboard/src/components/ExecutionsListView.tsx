'use client';

import React, { useEffect, useState } from 'react';
import { JACK_SDK, Intent } from '@jack-kernel/sdk';

interface ExecutionsListViewProps {
	onSelectExecution: (id: string) => void;
}

export const ExecutionsListView: React.FC<ExecutionsListViewProps> = ({ onSelectExecution }) => {
	const [executions, setExecutions] = useState<Intent[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchExecutions = async () => {
			try {
				const sdk = new JACK_SDK({ baseUrl: '/api' });
				const list = await sdk.listIntents();
				setExecutions(list);
			} catch (error) {
				console.error('Failed to fetch executions:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchExecutions();
		const interval = setInterval(fetchExecutions, 5000);
		return () => clearInterval(interval);
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'SETTLED': return 'text-green-400 bg-green-400/10 border-green-400/20';
			case 'EXECUTING':
			case 'ROUTING': return 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20 animate-pulse';
			case 'SETTLING':
			case 'QUOTED': return 'text-[#F2B94B] bg-[#F2B94B]/10 border-[#F2B94B]/20';
			case 'ABORTED': return 'text-red-400 bg-red-400/10 border-red-400/20';
			default: return 'text-gray-400 bg-gray-400/10 border-gray-400/10';
		}
	};

	const getTimeAgo = (timestamp: number) => {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		return `${Math.floor(minutes / 60)}h ago`;
	};

	return (
		<div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-6 duration-700">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
				<div className="space-y-1">
					<h2 className="text-2xl md:text-3xl font-space font-black uppercase tracking-tighter" style={{ color: "var(--fg-primary)" }}>Execution Registry</h2>
					<p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--fg-muted)" }}>Real-time Cross-chain orchestration log</p>
				</div>
				<div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border" style={{ color: "var(--fg-muted)", background: "var(--bg-tertiary)", borderColor: "var(--border-secondary)" }}>
					<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
					<span>Syncing with Kernel</span>
				</div>
			</div>

			{/* Mobile card view */}
			<div className="block md:hidden space-y-4">
				{isLoading && executions.length === 0 ? (
					<div className="py-20 text-center font-mono text-sm" style={{ color: "var(--fg-muted)" }}>Initializing Registry Surface...</div>
				) : executions.length === 0 ? (
					<div className="py-20 text-center font-mono text-sm" style={{ color: "var(--fg-muted)" }}>No Active Intents in Kernel Store</div>
				) : executions.map((exec) => (
					<div
						key={exec.id}
						className="border rounded-2xl p-5 space-y-4 active:scale-[0.98] transition-all cursor-pointer"
						style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
						onClick={() => onSelectExecution(exec.id)}
					>
						<div className="flex items-center justify-between">
							<span className="font-mono text-xs font-black tracking-tight" style={{ color: "var(--fg-accent)" }}>{exec.id}</span>
							<span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(exec.status)}`}>
								{exec.status}
							</span>
						</div>
						<div className="flex items-center space-x-3">
							<div className="px-2 py-1 rounded-md text-[9px] font-black border uppercase" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-secondary)", color: "var(--fg-primary)" }}>{exec.params.sourceChain.substring(0, 3)}</div>
							<svg className="w-4 h-4" style={{ color: "var(--fg-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M5 12h14" />
							</svg>
							<div className="px-2 py-1 rounded-md text-[9px] font-black border uppercase" style={{ background: "rgba(242,185,75,0.10)", borderColor: "var(--border-accent)", color: "var(--fg-accent)" }}>{exec.params.destinationChain.substring(0, 3)}</div>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<span className="text-sm font-black" style={{ color: "var(--fg-primary)" }}>{exec.params.amountIn}</span>
								<span className="text-[10px] font-bold uppercase ml-1" style={{ color: "var(--fg-muted)" }}>{exec.params.tokenIn}</span>
							</div>
							<span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>{getTimeAgo(exec.createdAt)}</span>
						</div>
					</div>
				))}
			</div>

			{/* Desktop table view */}
			<div className="hidden md:block border rounded-3xl overflow-hidden shadow-2xl relative" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
				<table className="w-full text-left relative z-10">
					<thead>
						<tr className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ background: "var(--bg-tertiary)", color: "var(--fg-muted)" }}>
							<th className="px-8 py-6">ID</th>
							<th className="px-8 py-6">Route Topology</th>
							<th className="px-8 py-6">Asset Manifest</th>
							<th className="px-8 py-6">Status</th>
							<th className="px-8 py-6">Delta</th>
							<th className="px-8 py-6"></th>
						</tr>
					</thead>
					<tbody className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
						{isLoading && executions.length === 0 ? (
							<tr><td colSpan={6} className="px-8 py-20 text-center font-mono text-sm" style={{ color: "var(--fg-muted)" }}>Initializing Registry Surface...</td></tr>
						) : executions.length === 0 ? (
							<tr><td colSpan={6} className="px-8 py-20 text-center font-mono text-sm" style={{ color: "var(--fg-muted)" }}>No Active Intents in Kernel Store</td></tr>
						) : executions.map((exec) => (
							<tr
								key={exec.id}
								className="hover:opacity-80 transition-all cursor-pointer group"
								onClick={() => onSelectExecution(exec.id)}
							>
								<td className="px-8 py-7">
									<span className="font-mono text-xs font-black tracking-tight" style={{ color: "var(--fg-accent)" }}>{exec.id}</span>
								</td>
								<td className="px-8 py-7">
									<div className="flex items-center space-x-3">
										<div className="px-2 py-1 rounded-md text-[9px] font-black border uppercase" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-secondary)", color: "var(--fg-primary)" }}>{exec.params.sourceChain.substring(0, 3)}</div>
										<svg className="w-4 h-4 transition-colors" style={{ color: "var(--fg-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M5 12h14" />
										</svg>
										<div className="px-2 py-1 rounded-md text-[9px] font-black border uppercase" style={{ background: "rgba(242,185,75,0.10)", borderColor: "var(--border-accent)", color: "var(--fg-accent)" }}>{exec.params.destinationChain.substring(0, 3)}</div>
									</div>
								</td>
								<td className="px-8 py-7">
									<div className="space-y-0.5">
										<p className="text-sm font-black" style={{ color: "var(--fg-primary)" }}>{exec.params.amountIn}</p>
										<p className="text-[10px] font-bold uppercase" style={{ color: "var(--fg-muted)" }}>{exec.params.tokenIn}</p>
									</div>
								</td>
								<td className="px-8 py-7">
									<span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(exec.status)}`}>
										{exec.status}
									</span>
								</td>
								<td className="px-8 py-7 text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>{getTimeAgo(exec.createdAt)}</td>
								<td className="px-8 py-7 text-right">
									<div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg" style={{ background: "var(--bg-tertiary)" }}>
										<svg className="w-5 h-5 transition-colors" style={{ color: "var(--fg-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
