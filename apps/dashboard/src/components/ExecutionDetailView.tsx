'use client';

import React from 'react';

interface ExecutionDetailViewProps {
	id: string;
	onBack: () => void;
}

export const ExecutionDetailView: React.FC<ExecutionDetailViewProps> = ({ id, onBack }) => {
	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<button onClick={onBack} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<div>
						<h2 className="text-2xl font-space font-bold flex items-center space-x-3">
							<span>Execution Detail</span>
							<span className="text-[#F2B94B] font-mono">{id}</span>
						</h2>
					</div>
				</div>
				<div className="flex space-x-3">
					<button className="px-4 py-2 bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 rounded-lg text-sm font-bold">
						View on Explorer
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div className="md:col-span-2 space-y-8">
					<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-8">
						<h3 className="text-sm font-space font-bold uppercase tracking-widest text-gray-400 mb-6">Trace Log</h3>
						<div className="space-y-6 relative">
							<div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
							<div className="flex items-start space-x-4 relative z-10">
								<div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
									<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<div>
									<p className="text-sm font-bold">Intent Signed & Broadcast</p>
									<p className="text-xs text-gray-500">0x82...1a92 | 14:20:01 UTC</p>
								</div>
							</div>

							<div className="flex items-start space-x-4 relative z-10">
								<div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
									<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<div>
									<p className="text-sm font-bold">Solver Matching (Yellow Fusion+)</p>
									<p className="text-xs text-gray-500">Agent Lukas-04 matched optimal route.</p>
									<p className="text-xs text-gray-500">14:20:12 UTC</p>
								</div>
							</div>

							<div className="flex items-start space-x-4 relative z-10">
								<div className="w-6 h-6 bg-[#38BDF8] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_#38BDF8]">
									 <div className="w-2 h-2 bg-white rounded-full" />
								</div>
								<div>
									<p className="text-sm font-bold text-[#38BDF8]">Final Settlement (Uniswap v4 Hook)</p>
									<p className="text-xs text-gray-300">Enforcing Policy constraints on Arbitrum.</p>
									<p className="text-xs text-gray-500">Processing...</p>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-8">
						<h3 className="text-sm font-space font-bold uppercase tracking-widest text-gray-400 mb-4">Intent JSON</h3>
						<pre className="text-[11px] font-mono text-gray-400 bg-black/40 p-4 rounded-xl overflow-x-auto">
{`{
	"id": "${id}",
	"version": "1.0.0",
	"owner": "0x5678...abcd",
	"inputs": {
		"chain": "Ethereum",
		"token": "USDC",
		"amount": "25000000000"
	},
	"constraints": {
		"minOut": "0.45",
		"fhenix_encrypted": true,
		"deadline": 1728392011,
		"policy_hook": "0xJACK_POLICY_HOOK_V1"
	}
}`}
						</pre>
					</div>
				</div>

				<div className="space-y-8">
					<div className="bg-gradient-to-b from-[#F2B94B]/10 to-transparent border border-[#F2B94B]/20 rounded-2xl p-6">
						<h3 className="text-xs font-space font-bold uppercase tracking-widest text-[#F2B94B] mb-4">Privacy Metrics</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between text-xs">
								<span className="text-gray-400">Layer</span>
								<span className="text-white font-bold">Fhenix FHE</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-gray-400">Encrypted Fields</span>
								<span className="text-white font-bold">MinOut, Deadline</span>
							</div>
							<div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-4">
								<div className="w-3/4 h-full bg-[#F2B94B]" />
							</div>
							<p className="text-[10px] text-gray-500 italic text-center">Constraints hidden from public mempool</p>
						</div>
					</div>

					<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-6">
						 <h3 className="text-xs font-space font-bold uppercase tracking-widest text-gray-400 mb-4">Settlement Statistics</h3>
						 <div className="space-y-4">
								<div className="text-center py-4">
									<p className="text-3xl font-space font-bold text-[#38BDF8]">0.02%</p>
									<p className="text-[10px] uppercase tracking-widest text-gray-500">Realized Slippage</p>
								</div>
								<div className="text-center py-4 border-t border-white/5">
									<p className="text-2xl font-space font-bold text-white">$14.50</p>
									<p className="text-[10px] uppercase tracking-widest text-gray-500">Saved via JIT</p>
								</div>
						 </div>
					</div>
				</div>
			</div>
		</div>
	);
};
