'use client';

import { useState, type FormEvent, type FC } from 'react';
import { JACK_SDK } from '../../../../packages/sdk';

interface CreateIntentViewProps {
	onIntentSubmitted: (id: string) => void;
}

export const CreateIntentView: FC<CreateIntentViewProps> = ({ onIntentSubmitted }) => {
	const [form, setForm] = useState({
		sourceChain: 'Arbitrum',
		destChain: 'Base',
		tokenIn: 'USDC',
		tokenOut: 'WETH',
		amountIn: '1000',
		minOut: '0.45',
		privacy: false
	});

	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);

		const sdk = new JACK_SDK();
		const intent = sdk.createIntent({
			sourceChain: form.sourceChain,
			destinationChain: form.destChain,
			tokenIn: form.tokenIn,
			tokenOut: form.tokenOut,
			amountIn: form.amountIn,
			constraints: {
				minAmountOut: form.minOut,
				privacy: form.privacy,
				deadline: Math.floor(Date.now() / 1000) + 3600
			}
		});

		const executionId = await sdk.submitIntent(intent);

		setTimeout(() => {
			setLoading(false);
			onIntentSubmitted(executionId);
		}, 1500);
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
			<div className="lg:col-span-2 space-y-6">
				<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-8 shadow-2xl">
					<h2 className="text-2xl font-space font-bold mb-6 text-[#F2B94B]">Submit Cross-Chain Intent</h2>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Source Chain</label>
								<select
									value={form.sourceChain}
									onChange={e => setForm({ ...form, sourceChain: e.target.value })}
									className="w-full bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] transition-colors text-sm"
								>
									<option>Ethereum</option>
									<option>Arbitrum</option>
									<option>Optimism</option>
									<option>Base</option>
								</select>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Destination Chain</label>
								<select
									value={form.destChain}
									onChange={e => setForm({ ...form, destChain: e.target.value })}
									className="w-full bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] transition-colors text-sm"
								>
									<option>Ethereum</option>
									<option>Base</option>
									<option>Polygon</option>
									<option>Arbitrum</option>
								</select>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Input Asset</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={form.amountIn}
										onChange={e => setForm({ ...form, amountIn: e.target.value })}
										placeholder="0.00"
										className="w-2/3 bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] text-sm"
									/>
									<select className="w-1/3 bg-[#0B1020] border border-white/10 rounded-xl px-2 md:px-4 py-3 outline-none text-sm">
										<option>USDC</option>
										<option>ETH</option>
										<option>LINK</option>
									</select>
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Minimum Out (Constraint)</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={form.minOut}
										onChange={e => setForm({ ...form, minOut: e.target.value })}
										placeholder="0.00"
										className="w-2/3 bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] text-sm"
									/>
									<select className="w-1/3 bg-[#0B1020] border border-white/10 rounded-xl px-2 md:px-4 py-3 outline-none text-sm">
										<option>WETH</option>
										<option>WBTC</option>
										<option>USDC</option>
									</select>
								</div>
							</div>
						</div>

						<div className="p-4 bg-[#0B1020] rounded-xl border border-white/5 flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<div className="w-10 h-10 bg-[#38BDF8]/10 rounded-lg flex items-center justify-center">
									<svg className="w-5 h-5 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
								</div>
								<div>
									<p className="text-sm font-semibold">Enable Fhenix Privacy</p>
									<p className="text-xs text-gray-500">Encrypt constraints for agent-only visibility.</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setForm({ ...form, privacy: !form.privacy })}
								className={`w-12 h-6 rounded-full transition-colors relative ${form.privacy ? 'bg-[#F2B94B]' : 'bg-gray-700'}`}
							>
								<div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.privacy ? 'left-7' : 'left-1'}`} />
							</button>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-4 bg-[#F2B94B] text-[#0B1020] font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
						>
							{loading ? (
								<span>Broadcasting to Kernel...</span>
							) : (
								<>
									<span>Broadside Intent</span>
									<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
								</>
							)}
						</button>
					</form>
				</div>
			</div>

			<div className="space-y-6">
				<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-6">
					<h3 className="text-sm font-space font-bold uppercase tracking-widest text-gray-400 mb-4">Route Preview</h3>
					<div className="space-y-4">
						<div className="flex items-center space-x-3 text-sm">
							<div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px]">1</div>
							<p>Solver selection (Yellow Fusion+)</p>
						</div>
						<div className="flex items-center space-x-3 text-sm">
							<div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px]">2</div>
							<p>Cross-chain Hop (LI.FI Stargate)</p>
						</div>
						<div className="flex items-center space-x-3 text-sm">
							<div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px]">3</div>
							<p>Settlement (Uniswap v4 Hook)</p>
						</div>
						<div className="mt-4 pt-4 border-t border-white/5">
							<div className="flex justify-between text-sm">
								<span className="text-gray-500">Estimated Gas</span>
								<span className="text-[#38BDF8]">$12.40</span>
							</div>
							<div className="flex justify-between text-sm mt-2">
								<span className="text-gray-500">Settlement Delay</span>
								<span className="text-[#38BDF8]">~45s</span>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-[#F2B94B]/20 to-transparent border border-[#F2B94B]/20 rounded-2xl p-6">
					<p className="text-xs font-bold text-[#F2B94B] uppercase tracking-tighter mb-2">Alpha Notice</p>
					<p className="text-xs text-gray-300 leading-relaxed">
						JACK uses JIT Autonomous Agents. Execution is final once committed by the settlement hook. Ensure your constraints are precise.
					</p>
				</div>
			</div>
		</div>
	);
};
