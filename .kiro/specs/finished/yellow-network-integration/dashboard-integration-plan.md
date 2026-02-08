# Yellow Network Dashboard Integration Plan

## Overview
This document outlines the integration plan for seamlessly incorporating Yellow Network functionality into the JACK dashboard UI. The goal is to provide users with a unified experience that supports both LI.FI and Yellow Network as execution providers.

## Current State Analysis

### ✅ Completed
- Yellow Network SDK fully implemented and exported
- Dashboard utility (`yellow.ts`) provides singleton YellowProvider management
- Intents API route handles ERC-7824 notifications and updates channel state
- Comprehensive event mapping for Yellow Network events

### ❌ Missing
- UI for provider selection (LI.FI vs Yellow)
- Yellow-specific data visualization (channels, allocations, proofs)
- Yellow Network quote integration in quote API
- Channel management UI (create/resize/close)
- Wallet connection integration with YellowProvider initialization

## Integration Strategy

### Phase 1: Provider Selection & Initialization

**1.1 Add Provider Selection to CreateIntentView**
- Add radio buttons or toggle to select between "LI.FI" and "Yellow Network"
- Show provider-specific information (LI.FI: bridge aggregation, Yellow: state channels)
- Default to LI.FI for backward compatibility

**1.2 Initialize YellowProvider on Wallet Connection**
- Hook into wagmi's `useAccount` to detect wallet connection
- Call `initYellowProvider()` with config from environment variables
- Call `yellowProvider.connect()` to establish WebSocket and authenticate
- Show connection status in UI (connecting, connected, error)

**1.3 Environment Configuration**
Add Yellow Network configuration to `.env`:
```
NEXT_PUBLIC_YELLOW_CLEARNODE_URL=wss://clearnet-sandbox.yellow.com/ws
NEXT_PUBLIC_YELLOW_CUSTODY_ADDRESS=0x...
NEXT_PUBLIC_YELLOW_ADJUDICATOR_ADDRESS=0x...
NEXT_PUBLIC_YELLOW_CHAIN_ID=1
NEXT_PUBLIC_YELLOW_RPC_URL=https://...
```

### Phase 2: Quote Integration

**2.1 Extend Quote API to Support Yellow**
- Add `provider` query parameter to `/api/quote` route
- When `provider=yellow`, call `yellowProvider.executeIntent()` to get quote
- Return normalized quote format compatible with existing UI
- Fall back to LI.FI if Yellow is unavailable

**2.2 Update CreateIntentView Quote Display**
- Show Yellow-specific quote data (solver ID, channel ID, estimated time)
- Display channel balance requirements
- Show estimated gas savings vs LI.FI

### Phase 3: Execution Flow Integration

**3.1 Update Intent Submission**
- When Yellow is selected, use `yellowProvider.executeIntent()` instead of SDK submit
- Handle Yellow-specific errors (insufficient channel balance, no solver quotes)
- Create or resize channel automatically if needed

**3.2 Enhance ExecutionDetailView**
- Add "Provider" badge showing LI.FI or Yellow Network
- For Yellow executions, show:
  - Channel ID with link to explorer
  - Current channel status (ACTIVE, DISPUTE, FINAL)
  - State version and state intent
  - Allocations table (destination, token, amount)
  - Settlement proof details (if available)
  - Challenge period and expiration (if in dispute)

**3.3 Update ExecutionsListView**
- Add provider column/badge to execution list
- Filter by provider (All, LI.FI, Yellow)
- Show channel status icon for Yellow executions

### Phase 4: Channel Management UI

**4.1 Add Channel Management Tab**
- New tab in Dashboard: "Channels"
- List all open channels with:
  - Channel ID
  - Status (ACTIVE, DISPUTE, FINAL)
  - Token and chain
  - Total allocation
  - State version
  - Created/updated timestamps

**4.2 Channel Actions**
- "Create Channel" button with token/chain selection
- "Resize Channel" action with amount input
- "Close Channel" action with withdraw option
- "View Details" to see full channel state

**4.3 Channel Detail View**
- Full channel state display
- Allocations table
- State history (versions, intents, timestamps)
- On-chain verification link
- Challenge status (if in dispute)

### Phase 5: Error Handling & Fallback

**5.1 Yellow-Specific Error Messages**
- Map Yellow reason codes to user-friendly messages:
  - `YELLOW_UNAVAILABLE`: "Yellow Network is temporarily unavailable. Try LI.FI instead."
  - `YELLOW_AUTH_FAILED`: "Authentication failed. Please reconnect your wallet."
  - `YELLOW_TX_FAILED`: "On-chain transaction failed. Check your wallet and try again."
  - `YELLOW_TIMEOUT`: "Request timed out. Yellow Network may be experiencing high load."
  - `NO_SOLVER_QUOTES`: "No solvers available for this route. Try LI.FI instead."
  - `INSUFFICIENT_CHANNEL_BALANCE`: "Insufficient channel balance. Resize your channel or use LI.FI."
  - `YELLOW_CHANNEL_DISPUTE`: "Channel is in dispute. Wait for resolution before proceeding."

**5.2 Automatic Fallback**
- If Yellow fails during intent creation, offer to retry with LI.FI
- Show fallback reason in UI
- Track fallback metrics for monitoring

### Phase 6: Visual Enhancements

**6.1 Provider Branding**
- Yellow Network color scheme (distinct from LI.FI blue)
- Provider logos in execution cards
- Visual indicators for state channel operations

**6.2 Real-time Updates**
- WebSocket connection status indicator
- Live channel balance updates
- Real-time execution step updates for Yellow

**6.3 Educational Content**
- Tooltips explaining state channels
- "Why Yellow?" information panel
- Gas savings calculator

## Implementation Priority

### High Priority (MVP)
1. Provider selection in CreateIntentView
2. YellowProvider initialization on wallet connect
3. Yellow quote integration in quote API
4. Basic Yellow execution flow
5. Yellow-specific error handling

### Medium Priority
1. Enhanced ExecutionDetailView with Yellow data
2. Channel management tab
3. Provider filtering in ExecutionsListView
4. Automatic fallback UI

### Low Priority (Nice to Have)
1. Channel detail view with full history
2. Gas savings calculator
3. Educational tooltips
4. Advanced channel analytics

## Testing Strategy

### Unit Tests
- YellowProvider initialization with various configs
- Quote normalization from Yellow to UI format
- Error mapping and fallback logic

### Integration Tests
- Full intent flow with Yellow provider
- Channel creation/resize/close operations
- Fallback from Yellow to LI.FI

### E2E Tests
- User selects Yellow, creates intent, views execution
- User manages channels (create, resize, close)
- Error scenarios trigger appropriate UI feedback

## Rollout Plan

### Stage 1: Internal Testing
- Deploy to testnet with Yellow integration
- Test with internal wallets
- Verify all flows work end-to-end

### Stage 2: Beta Release
- Enable Yellow for select users
- Collect feedback on UX
- Monitor error rates and fallback frequency

### Stage 3: General Availability
- Enable Yellow for all users
- Default to LI.FI, Yellow as opt-in
- Monitor adoption and performance

## Success Metrics

- **Adoption**: % of intents using Yellow vs LI.FI
- **Success Rate**: % of Yellow intents that settle successfully
- **Fallback Rate**: % of Yellow attempts that fall back to LI.FI
- **Gas Savings**: Average gas cost reduction vs LI.FI
- **User Satisfaction**: Feedback on Yellow UX

## Open Questions

1. Should Yellow be the default provider or opt-in?
2. How do we handle channel liquidity management?
3. Should we auto-create channels or require manual creation?
4. What's the UX for channel disputes?
5. How do we educate users about state channels?

## Next Steps

1. Review this plan with the team
2. Prioritize features for MVP
3. Create detailed implementation tasks
4. Assign ownership and timelines
5. Begin implementation with Phase 1
