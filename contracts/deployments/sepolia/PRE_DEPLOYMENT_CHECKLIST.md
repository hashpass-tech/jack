# Pre-Deployment Checklist for Sepolia

Before running the deployment script, ensure the following requirements are met:

## 1. Configure RPC URL

Edit `contracts/.env.sepolia` and replace `YOUR_INFURA_KEY` with a valid Sepolia RPC URL:

**Option A: Infura**
```bash
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
```
Get an API key from: https://infura.io/

**Option B: Alchemy**
```bash
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
```
Get an API key from: https://www.alchemy.com/

**Option C: Public RPC (not recommended for production)**
```bash
RPC_URL=https://rpc.sepolia.org
```

## 2. Ensure Sepolia ETH Balance

The deployer address is: `0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD`

You need approximately **0.1-0.2 ETH** on Sepolia for deployment.

**Get Sepolia ETH from faucets:**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

**Check your balance:**
```bash
cast balance 0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD --rpc-url YOUR_RPC_URL
```

## 3. Configure Etherscan API Key (Optional but Recommended)

For automatic contract verification, add your Etherscan API key to `contracts/.env.sepolia`:

```bash
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

Get an API key from: https://etherscan.io/myapikey

## 4. Verify Configuration

Run the following commands to verify your setup:

```bash
# Check deployer address
cast wallet address 0xREDACTED_KEY_ROTATE_IMMEDIATELY

# Check Sepolia ETH balance
cast balance 0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD --rpc-url YOUR_RPC_URL

# Verify PoolManager address exists on Sepolia
cast code 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543 --rpc-url YOUR_RPC_URL
```

## 5. Run Deployment

Once all requirements are met, run:

```bash
./scripts/contracts/deploy-sepolia.sh
```

The script will:
1. Load environment variables
2. Validate configuration
3. Check Sepolia ETH balance
4. Deploy JACKPolicyHook
5. Deploy JACKSettlementAdapter
6. Save deployment artifacts
7. Display Etherscan links

## 6. Post-Deployment

After successful deployment:
- Verify contracts on Etherscan (automatic or manual)
- Save deployment artifacts from `contracts/deployments/sepolia/`
- Update SDK configuration with deployed contract addresses
- Run integration tests against deployed contracts

## Troubleshooting

**Error: Insufficient funds**
- Get more Sepolia ETH from faucets listed above

**Error: RPC connection failed**
- Verify your RPC URL is correct
- Check your API key is valid
- Try a different RPC provider

**Error: Contract verification failed**
- Run `./scripts/contracts/verify-sepolia.sh` manually
- Check your Etherscan API key is valid
- Verification can take a few minutes - check Etherscan directly

**Error: PoolManager not found**
- Verify you're connecting to Sepolia (Chain ID: 11155111)
- The PoolManager address should be: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
