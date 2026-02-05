'use client';

import { useEffect, useState, type FC } from 'react';

interface IssueCost {
	issueId: string;
	totalCost: number;
	budget: number;
	overBudget: boolean;
}

const fetchIssueCosts = async () => {
	const response = await fetch('/api/costs');
	if (!response.ok) {
		throw new Error('Failed to load costs');
	}
	const data = await response.json();
	return data.issueCosts as IssueCost[];
};

const AgentCostDashboard: FC = () => {
	const [issueCosts, setIssueCosts] = useState<IssueCost[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchIssueCosts()
			.then(setIssueCosts)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
			<div>
				<h2 className="text-2xl font-space font-bold">JACKKERNEL Agent & Cost Dashboard</h2>
				<p className="text-sm text-gray-400">Tracking per-issue spending and policy adherence.</p>
			</div>
			<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-6">
				{loading && <p>Loading cost data…</p>}
				{error && <p className="text-sm text-red-400">{error}</p>}
				{!loading && !error && (
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="text-xs uppercase tracking-widest text-gray-400">
									<th className="px-4 py-3">Issue</th>
									<th className="px-4 py-3">Total Cost ($)</th>
									<th className="px-4 py-3">Budget ($)</th>
									<th className="px-4 py-3">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{issueCosts.map((ic) => (
									<tr key={ic.issueId} className={ic.overBudget ? 'bg-[#3d0303]/20' : undefined}>
										<td className="px-4 py-3 font-mono text-sm text-[#F2B94B]">{ic.issueId}</td>
										<td className="px-4 py-3 font-semibold">{ic.totalCost.toFixed(2)}</td>
										<td className="px-4 py-3 text-gray-300">{ic.budget.toFixed(2)}</td>
										<td className="px-4 py-3 text-sm font-bold text-amber-300">
											{ic.overBudget ? 'OVER BUDGET' : 'OK'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default AgentCostDashboard;
