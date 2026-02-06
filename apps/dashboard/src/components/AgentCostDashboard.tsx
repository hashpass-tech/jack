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
				<h2 className="text-2xl font-space font-bold" style={{ color: "var(--fg-primary)" }}>JACK Kernel Agent & Cost Dashboard</h2>
				<p className="text-sm" style={{ color: "var(--fg-muted)" }}>Tracking per-issue spending and policy adherence.</p>
			</div>
			<div className="border rounded-2xl p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
				{loading && <p style={{ color: "var(--fg-muted)" }}>Loading cost data…</p>}
				{error && <p className="text-sm text-red-400">{error}</p>}
				{!loading && !error && (
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="text-xs uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
									<th className="px-4 py-3">Issue</th>
									<th className="px-4 py-3">Total Cost ($)</th>
									<th className="px-4 py-3">Budget ($)</th>
									<th className="px-4 py-3">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
								{issueCosts.map((ic) => (
									<tr key={ic.issueId} className={ic.overBudget ? 'bg-red-900/10' : undefined}>
										<td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--fg-accent)" }}>{ic.issueId}</td>
										<td className="px-4 py-3 font-semibold" style={{ color: "var(--fg-primary)" }}>{ic.totalCost.toFixed(2)}</td>
										<td className="px-4 py-3" style={{ color: "var(--fg-secondary)" }}>{ic.budget.toFixed(2)}</td>
										<td className="px-4 py-3 text-sm font-bold" style={{ color: ic.overBudget ? "#f87171" : "var(--fg-accent)" }}>
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
