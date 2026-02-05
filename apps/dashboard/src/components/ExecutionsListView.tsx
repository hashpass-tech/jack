'use client';

import React from 'react';

interface ExecutionsListViewProps {
	onSelectExecution: (id: string) => void;
}

export const ExecutionsListView: React.FC<ExecutionsListViewProps> = ({ onSelectExecution }) => {
	const executions = [
		{ id: 'JK-9281', status: 'Settled', from: 'ARB', to: 'BASE', asset: 'USDC', amount: '25,000', time: '2m ago' },
		{ id: 'JK-9280', status: 'Routing', from: 'ETH', to: 'OPT', asset: 'WETH', amount: '4.2', time: '5m ago' },
		{ id: 'JK-9279', status: 'Policy Check', from: 'BASE', to: 'ETH', asset: 'DEGEN', amount: '1,000,000', time: '12m ago' },
		{ id: 'JK-9278', status: 'Settled', from: 'ARB', to: 'POL', asset: 'USDC', amount: '500', time: '1h ago' }
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Settled': return 'text-green-400 bg-green-400/10';
			case 'Routing': return 'text-[#38BDF8] bg-[#38BDF8]/10 animate-pulse';
			case 'Policy Check': return 'text-[#F2B94B] bg-[#F2B94B]/10';
			default: return 'text-gray-400 bg-gray-400/10';
		}
	};

	return (
		<div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-2xl font-space font-bold">Execution History</h2>
				<div className="text-sm text-gray-500">Showing last 24 hours</div>
			</div>

			<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl overflow-hidden">
				<table className="w-full text-left">
					<thead>
						<tr className="bg-white/5 text-xs uppercase tracking-widest text-gray-400">
							<th className="px-6 py-4 font-semibold">Intent ID</th>
							<th className="px-6 py-4 font-semibold">Route</th>
							<th className="px-6 py-4 font-semibold">Asset & Volume</th>
							<th className="px-6 py-4 font-semibold">Status</th>
							<th className="px-6 py-4 font-semibold">Time</th>
							<th className="px-6 py-4 font-semibold"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{executions.map((exec) => (
							<tr
								key={exec.id}
								className="hover:bg-white/5 transition-colors cursor-pointer group"
								onClick={() => onSelectExecution(exec.id)}
							>
								<td className="px-6 py-5">
									<span className="font-mono text-xs font-bold text-[#F2B94B]">{exec.id}</span>
								</td>
								<td className="px-6 py-5">
									<div className="flex items-center space-x-2 text-sm font-semibold">
										<span>{exec.from}</span>
										<svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path d="M13 7l5 5m0 0l-5 5m5-5H6" />
										</svg>
										<span>{exec.to}</span>
									</div>
								</td>
								<td className="px-6 py-5">
									<div className="text-sm font-bold">{exec.amount} {exec.asset}</div>
								</td>
								<td className="px-6 py-5">
									<span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(exec.status)}`}>
										{exec.status}
									</span>
								</td>
								<td className="px-6 py-5 text-sm text-gray-500">{exec.time}</td>
								<td className="px-6 py-5 text-right">
									<svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
									</svg>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
