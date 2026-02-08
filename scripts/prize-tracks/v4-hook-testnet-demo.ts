/**
 * Uniswap v4 Hook Testnet Demo — Real Sepolia Proof
 * Usage: PRIVATE_KEY=0x... node --import tsx scripts/prize-tracks/v4-hook-testnet-demo.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  parseAbi,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import "dotenv/config";
import * as fs from "fs";

const SEPOLIA_RPC = process.env.ALCHEMY_RPC_URL || "https://1rpc.io/sepolia";
const deployment = JSON.parse(
  fs.readFileSync("contracts/deployments/sepolia/latest.json", "utf-8"),
);
const POLICY_HOOK = deployment.contracts.policyHook.address as Hex;
const SETTLEMENT_ADAPTER = deployment.contracts.settlementAdapter
  .address as Hex;
const POOL_MANAGER = deployment.poolManager as Hex;

const policyHookAbi = parseAbi([
  "function checkPolicy(bytes32 intentId, uint256 quotedAmountOut) external view returns (bool allowed, bytes32 reason)",
  "function owner() external view returns (address)",
  "function policies(bytes32 intentId) external view returns (uint256, uint256, uint256, uint16, address, bool)",
  "function REASON_OK() external view returns (bytes32)",
  "function REASON_POLICY_MISSING() external view returns (bytes32)",
  "function REASON_POLICY_EXPIRED() external view returns (bytes32)",
  "function REASON_SLIPPAGE_EXCEEDED() external view returns (bytes32)",
]);

const adapterAbi = parseAbi([
  "function setAuthorizedSolver(address solver, bool authorized) external",
  "function authorizedSolvers(address solver) external view returns (bool)",
  "function owner() external view returns (address)",
  "function policyHook() external view returns (address)",
  "function poolManager() external view returns (address)",
  "function hashIntent((bytes32 id, address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline, bytes signature) intent) external view returns (bytes32)",
]);

interface Proof {
  step: string;
  type: string;
  txHash?: string;
  etherscanUrl?: string;
  data?: any;
  ts: number;
}
const proofs: Proof[] = [];
function addProof(step: string, type: string, txHash?: string, data?: any) {
  proofs.push({
    step,
    type,
    txHash,
    etherscanUrl: txHash
      ? `https://sepolia.etherscan.io/tx/${txHash}`
      : undefined,
    data,
    ts: Date.now(),
  });
}
function log(m: string) {
  console.log(`[${new Date().toISOString()}] ${m}`);
}

async function main() {
  const t0 = Date.now();
  console.log("\n" + "=".repeat(64));
  console.log("  JACK x Uniswap v4 Hook — Sepolia Testnet Demo");
  console.log("=".repeat(64) + "\n");

  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  if (!pk) {
    console.error("Set PRIVATE_KEY");
    process.exit(1);
  }
  const account = privateKeyToAccount(pk);
  log(`Wallet: ${account.address}`);
  log(`PolicyHook: ${POLICY_HOOK}`);
  log(`SettlementAdapter: ${SETTLEMENT_ADAPTER}`);
  log(`PoolManager: ${POOL_MANAGER}\n`);

  const pub = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
  });
  const wal = createWalletClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
    account,
  });
  const bal = await pub.getBalance({ address: account.address });
  log(`ETH Balance: ${(Number(bal) / 1e18).toFixed(6)} ETH\n`);

  // Step 1: Verify contracts
  log("Step 1: Verifying contract deployment...");
  const hookOwner = await pub.readContract({
    address: POLICY_HOOK,
    abi: policyHookAbi,
    functionName: "owner",
  });
  const adpOwner = await pub.readContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "owner",
  });
  const lnkHook = await pub.readContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "policyHook",
  });
  const lnkPM = await pub.readContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "poolManager",
  });
  log(`  PolicyHook owner: ${hookOwner} (CREATE2 deployer)`);
  log(
    `  Adapter owner: ${adpOwner} (us: ${adpOwner.toLowerCase() === account.address.toLowerCase()})`,
  );
  log(
    `  Adapter->Hook: ${lnkHook} (match: ${lnkHook.toLowerCase() === POLICY_HOOK.toLowerCase()})`,
  );
  log(`  Adapter->PM: ${lnkPM}`);
  const rOk = await pub.readContract({
    address: POLICY_HOOK,
    abi: policyHookAbi,
    functionName: "REASON_OK",
  });
  const rMiss = await pub.readContract({
    address: POLICY_HOOK,
    abi: policyHookAbi,
    functionName: "REASON_POLICY_MISSING",
  });
  log(`  REASON_OK: ${rOk}`);
  log(`  REASON_POLICY_MISSING: ${rMiss}`);
  addProof("Contract verification", "read-only", undefined, {
    hookOwner,
    adpOwner,
    lnkHook,
    lnkPM,
  });
  console.log("");

  // Step 2: Policy checks
  log("Step 2: Policy checks (read-only)...");
  for (const label of [
    "jack-swap-eth-usdc",
    "jack-swap-wbtc-eth",
    "jack-cross-chain",
    "jack-agentic",
  ]) {
    const id = keccak256(toHex(label)) as Hex;
    const [a, r] = await pub.readContract({
      address: POLICY_HOOK,
      abi: policyHookAbi,
      functionName: "checkPolicy",
      args: [id, 1000000000000000000n],
    });
    log(`  ${label}: allowed=${a}, policyMissing=${r === rMiss}`);
  }
  addProof("Policy checks", "read-only", undefined, { count: 4 });
  console.log("");

  // Step 3: Authorize solver
  log("Step 3: Authorizing solver...");
  const s1 = privateKeyToAccount(generatePrivateKey()).address;
  log(`  Solver: ${s1}`);
  const tx1 = await wal.writeContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "setAuthorizedSolver",
    args: [s1, true],
  });
  log(`  tx: ${tx1}`);
  const r1 = await pub.waitForTransactionReceipt({ hash: tx1 });
  log(`  Confirmed block ${r1.blockNumber}, gas ${r1.gasUsed}`);
  const v1 = await pub.readContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "authorizedSolvers",
    args: [s1],
  });
  log(`  Verified: ${v1}`);
  addProof("Solver authorization", "on-chain", tx1, {
    solver: s1,
    block: r1.blockNumber.toString(),
  });
  console.log("");

  // Step 4: De-authorize
  log("Step 4: De-authorizing solver...");
  const tx2 = await wal.writeContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "setAuthorizedSolver",
    args: [s1, false],
  });
  log(`  tx: ${tx2}`);
  const r2 = await pub.waitForTransactionReceipt({ hash: tx2 });
  log(`  Confirmed block ${r2.blockNumber}`);
  addProof("Solver de-authorization", "on-chain", tx2, {
    solver: s1,
    block: r2.blockNumber.toString(),
  });
  console.log("");

  // Step 5: Self-authorize as solver
  log("Step 5: Self-authorizing as solver...");
  const tx3 = await wal.writeContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "setAuthorizedSolver",
    args: [account.address, true],
  });
  log(`  tx: ${tx3}`);
  const r3 = await pub.waitForTransactionReceipt({ hash: tx3 });
  log(`  Confirmed block ${r3.blockNumber}`);
  addProof("Self-authorization", "on-chain", tx3, {
    solver: account.address,
    block: r3.blockNumber.toString(),
  });
  console.log("");

  // Step 6: Second solver
  log("Step 6: Authorizing second solver...");
  const s2 = privateKeyToAccount(generatePrivateKey()).address;
  const tx4 = await wal.writeContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "setAuthorizedSolver",
    args: [s2, true],
  });
  log(`  Solver2 ${s2}: tx ${tx4}`);
  const r4 = await pub.waitForTransactionReceipt({ hash: tx4 });
  log(`  Confirmed block ${r4.blockNumber}`);
  addProof("Second solver auth", "on-chain", tx4, {
    solver: s2,
    block: r4.blockNumber.toString(),
  });
  console.log("");

  // Step 7: Intent hash
  log("Step 7: Computing EIP-712 intent hash...");
  const intent = {
    id: keccak256(toHex("jack-demo-intent-hash")) as Hex,
    user: account.address,
    tokenIn: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Hex,
    tokenOut: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Hex,
    amountIn: 1000000000000000000n,
    minAmountOut: 2000000000n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    signature: "0x" as Hex,
  };
  const hash = await pub.readContract({
    address: SETTLEMENT_ADAPTER,
    abi: adapterAbi,
    functionName: "hashIntent",
    args: [intent],
  });
  log(`  Intent: ${intent.id}`);
  log(`  EIP-712 hash: ${hash}`);
  log(`  WETH->USDC, 1 WETH for min 2000 USDC`);
  addProof("EIP-712 intent hash", "read-only", undefined, {
    intentId: intent.id,
    hash,
  });
  console.log("");

  // Summary
  const dur = Date.now() - t0;
  console.log("=".repeat(64));
  console.log("  PROOF SUMMARY — Uniswap v4 Hook Prize Track");
  console.log("=".repeat(64) + "\n");
  const onChain = proofs.filter((p) => p.type === "on-chain");
  const reads = proofs.filter((p) => p.type === "read-only");
  console.log(`  On-chain transactions (${onChain.length}):`);
  for (const p of onChain) {
    console.log(`    ${p.step}\n      ${p.etherscanUrl}`);
  }
  console.log(`\n  Read-only verifications (${reads.length}):`);
  for (const p of reads) {
    console.log(`    ${p.step}`);
  }
  console.log(
    `\n  Contracts:\n    PolicyHook:        ${POLICY_HOOK}\n    SettlementAdapter: ${SETTLEMENT_ADAPTER}\n    PoolManager:       ${POOL_MANAGER}`,
  );
  console.log(`  Duration: ${dur}ms\n  Network:  Sepolia (${sepolia.id})\n`);
  console.log("=".repeat(64));

  fs.writeFileSync(
    "scripts/prize-tracks/v4-hook-testnet-proof.json",
    JSON.stringify(
      {
        demo: "uniswap-v4-hook-testnet",
        network: "sepolia",
        chainId: sepolia.id,
        wallet: account.address,
        contracts: {
          policyHook: POLICY_HOOK,
          settlementAdapter: SETTLEMENT_ADAPTER,
          poolManager: POOL_MANAGER,
        },
        proofs,
        durationMs: dur,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  log("Proof written to scripts/prize-tracks/v4-hook-testnet-proof.json");
  process.exit(0);
}

main().catch((e) => {
  console.error("Demo failed:", e);
  process.exit(1);
});
