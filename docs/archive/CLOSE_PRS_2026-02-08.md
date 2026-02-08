# Close Pull Requests - SDK v1.2.1

All changes from these PRs have been integrated into SDK v1.2.1 (commit 546b4ff, tag sdk-v1.2.1).

## Instructions

Go to each PR on GitHub and close it with the corresponding comment below:

---

## PR #26: Harden intents pipeline typing and LI.FI response handling

**Close with this comment:**

```
✅ Integrated in SDK v1.2.1

This PR's changes were integrated as part of the LI.FI integration spec (task 0). The type hardening for the dashboard intents API route is now part of the v1.2.1 release.

**Included in**: commit 546b4ff, tag sdk-v1.2.1
**Release Notes**: See SDK_RELEASE_v1.2.1.md
```

---

## PR #28: Add production-ready JACKSettlementAdapter

**Close with this comment:**

```
✅ Settlement adapter contracts integrated in SDK v1.2.1

The production-ready JACKSettlementAdapter contract and test suite from this PR have been integrated into v1.2.1. However, we preserved the Yellow Network integration from v1.1.0, as both integrations work complementarily.

**What was integrated**:
- ✅ contracts/src/JACKSettlementAdapter.sol
- ✅ contracts/test/JACKSettlementAdapter.t.sol

**What was preserved**:
- ✅ Yellow Network integration (v1.1.0)
- ✅ LI.FI integration (v1.2.1)

Both providers now work side-by-side in the SDK.

**Included in**: commit 546b4ff, tag sdk-v1.2.1
**Release Notes**: See SDK_RELEASE_v1.2.1.md
```

---

## PR #29: Document production JACKSettlementAdapter implementation

**Close with this comment:**

```
✅ Contract documentation integrated in SDK v1.2.1

The comprehensive settlement adapter documentation from this PR has been integrated into v1.2.1. The documentation now includes architecture diagrams, API references, and integration guides.

**What was integrated**:
- ✅ apps/docs/docs/contracts/index.md
- ✅ apps/docs/docs/contracts/settlement-adapter.md
- ✅ apps/docs/sidebars.ts (Smart Contracts section)

**What was preserved**:
- ✅ Yellow Network integration and documentation

**Included in**: commit 546b4ff, tag sdk-v1.2.1
**Release Notes**: See SDK_RELEASE_v1.2.1.md
```

---

## PR #30: Update social links in footers and docs

**Close with this comment:**

```
✅ Social links fully integrated in SDK v1.2.1

All social link updates from this PR have been integrated into v1.2.1. Discord and X (Twitter) links are now visible across the dashboard, landing page, and documentation.

**What was integrated**:
- ✅ Discord link: https://discord.gg/7k8CdmYHpn
- ✅ X link: https://x.com/Jack_kernel
- ✅ Dashboard footer updates
- ✅ Landing page footer updates
- ✅ Documentation footer updates

**What was preserved**:
- ✅ Yellow Network integration

**Included in**: commit 546b4ff, tag sdk-v1.2.1
**Release Notes**: See SDK_RELEASE_v1.2.1.md
```

---

## Summary

All 4 PRs have been integrated into SDK v1.2.1 with a cherry-pick strategy that:
- ✅ Preserved Yellow Network integration (v1.1.0)
- ✅ Added LI.FI integration (v1.2.1)
- ✅ Integrated settlement adapter contracts
- ✅ Integrated comprehensive documentation
- ✅ Integrated social links

Both Yellow and LI.FI now work together as complementary providers in the SDK.
