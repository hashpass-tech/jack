'use client';

import React, { useEffect, useState } from 'react';
import { JACK_SDK, ExecutionStatus, Intent } from '../../../../packages/sdk';

interface ExecutionDetailViewProps {
	id: string;
	onBack: () => void;
}

export const ExecutionDetailView: React.FC<ExecutionDetailViewProps> = ({ id, onBack }) => {
	const [intent, setIntent] = useState<Intent | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const sdk = new JACK_SDK();
				const data = await sdk.getExecutionStatus(id);
				setIntent(data);
			} catch (error) {
				console.error('Failed to fetch execution status:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 2000);
		return () => clearInterval(interval);
	}, [id]);

	const getStepIcon = (stepStatus: string) => {
		if (stepStatus === 'COMPLETED') {
			return (
				<div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
					<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
					</svg>
				</div>
			);
		}
		return (
			<div className="w-6 h-6 bg-[#38BDF8] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_#38BDF8]">
				<div className="w-2 h-2 bg-white rounded-full" />
			</div>
		);
	};

	if (isLoading && !intent) {
		return <div className="p-20 text-center font-mono animate-pulse" style={{ color: "var(--fg-muted)" }}>Accessing Kernel Memory for {id}...</div>;
	}

	return (
		<div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="flex items-center space-x-4 md:space-x-6">
					<button onClick={onBack} className="p-3 rounded-xl transition-all border group" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-secondary)" }}>
						<svg className="w-5 h-5" style={{ color: "var(--fg-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<div>
						<h2 className="text-xl md:text-3xl font-space font-black flex flex-col sm:flex-row sm:items-center sm:space-x-4 uppercase tracking-tighter" style={{ color: "var(--fg-primary)" }}>
							<span>Execution</span>
							<span className="font-mono select-all text-base md:text-3xl" style={{ color: "var(--fg-accent)" }}>{id}</span>
						</h2>
					</div>
				</div>
				<div className="flex flex-wrap gap-3">
					{intent?.settlementTx && (
						<a
							href={`https://sepolia.basescan.org/tx/${intent.settlementTx}`}
							target="_blank"
							rel="noreferrer"
							className="px-4 md:px-6 py-2.5 md:py-3 bg-[#38BDF8] text-[#0B1020] rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:scale-105 transition-all flex items-center space-x-2"
						>
							<span>View On Explorer</span>
						</a>
					)}
					<button className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border" style={{ background: "var(--bg-tertiary)", color: "var(--fg-primary)", borderColor: "var(--border-secondary)" }}>
						JSON Manifest
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
				<div className="md:col-span-2 space-y-6 md:space-y-8">
					<div className="border rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
						<h3 className="text-xs font-space font-black uppercase tracking-[0.4em] mb-8 md:mb-10" style={{ color: "var(--fg-muted)" }}>Kernel Execution Trace</h3>

						<div className="space-y-8 md:space-y-12 relative">
							<div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-green-500 via-[#38BDF8] to-transparent" />

							{intent?.executionSteps.map((step, index) => (
								<div key={index} className="flex items-start space-x-4 md:space-x-6 relative z-10 animate-in slide-in-from-left-4 duration-500">
									{getStepIcon(step.status)}
									<div>
										<p className="text-sm font-black uppercase tracking-tight" style={{ color: "var(--fg-primary)" }}>{step.step}</p>
										<p className="text-[10px] font-mono mt-1 uppercase" style={{ color: "var(--fg-muted)" }}>{step.details || 'Processing...'}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="border rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
						<div className="flex items-center justify-between mb-6 md:mb-8">
							<h3 className="text-xs font-space font-black uppercase tracking-[0.4em]" style={{ color: "var(--fg-muted)" }}>Intent Manifest (v1)</h3>
							<div className="text-[10px] font-bold uppercase animate-pulse" style={{ color: "var(--fg-info)" }}>Live Link: Connected</div>
						</div>
						<pre className="text-[11px] md:text-[12px] font-mono p-4 md:p-6 rounded-2xl border overflow-x-auto shadow-inner leading-relaxed" style={{ color: "var(--fg-secondary)", background: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
							{JSON.stringify(intent, null, 2)}
						</pre>
					</div>
				</div>

				<div className="space-y-6 md:space-y-10">
					<div className="bg-gradient-to-b from-[#F2B94B]/20 to-transparent border border-[#F2B94B]/30 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
						<div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#F2B94B]/20 rounded-full blur-2xl" />
						<h3 className="text-[10px] font-space font-black uppercase tracking-[0.4em] mb-6" style={{ color: "var(--fg-accent)" }}>Confidentiality Metrics</h3>
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>Provider</span>
								<span className="text-xs font-black uppercase" style={{ color: "var(--fg-primary)" }}>Fhenix Shield</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>Obfuscation</span>
								<span className="text-xs font-black uppercase" style={{ color: "var(--fg-primary)" }}>Full (CCM)</span>
							</div>
							<div className="space-y-2">
								<div className="flex justify-between text-[10px] font-bold uppercase">
									<span style={{ color: "var(--fg-muted)" }}>Entropy Level</span>
									<span style={{ color: "var(--fg-accent)" }}>Optimal</span>
								</div>
								<div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
									<div className="w-4/5 h-full bg-[#F2B94B] shadow-[0_0_10px_#F2B94B]" />
								</div>
							</div>
							<p className="text-[10px] font-bold uppercase italic text-center leading-loose" style={{ color: "var(--fg-muted)" }}>Policy constraints are evaluating in ciphertext to prevent MEV leakage</p>
						</div>
					</div>

					<div className="border rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl relative" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
						<h3 className="text-[10px] font-space font-black uppercase tracking-[0.4em] mb-6 md:mb-8" style={{ color: "var(--fg-muted)" }}>Performance Telemetry</h3>
						<div className="space-y-6 md:space-y-8">
							<div className="text-center">
								<p className="text-3xl md:text-4xl font-space font-black tracking-tighter" style={{ color: "var(--fg-info)" }}>0.02%</p>
								<p className="text-[10px] font-black uppercase tracking-widest mt-2" style={{ color: "var(--fg-muted)" }}>Realized Slippage</p>
							</div>
							<div className="text-center pt-6 md:pt-8 border-t" style={{ borderColor: "var(--border-primary)" }}>
								<p className="text-2xl md:text-3xl font-space font-black tracking-tighter" style={{ color: "var(--fg-primary)" }}>${intent?.params?.amountIn}</p>
								<p className="text-[10px] font-black uppercase tracking-widest mt-2" style={{ color: "var(--fg-muted)" }}>Yield Optimized</p>
							</div>
							<div className="px-4 py-3 bg-[#38BDF8]/10 rounded-xl border border-[#38BDF8]/20 flex items-center justify-center space-x-2">
								<div className="w-2 h-2 bg-[#38BDF8] rounded-full animate-ping" />
								<span className="text-[10px] font-black text-[#38BDF8] uppercase tracking-widest">Live Syncing</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
