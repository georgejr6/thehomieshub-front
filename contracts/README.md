# Wager Smart Contracts — Algorand

## Files

| File | Purpose |
|------|---------|
| `wager_escrow.py` | PyTeal source — the on-chain escrow contract |
| `approval.teal` | Compiled approval program (auto-generated) |
| `clear.teal` | Compiled clear state program (auto-generated) |
| `deploy.py` | Python script — deploys one contract to testnet |
| `backend/models/Wager.js` | Mongoose model — add to your backend |
| `backend/controllers/wager.controller.js` | Express controller — add to your backend |
| `backend/routes/wager.routes.js` | Express routes — add to your backend |

---

## How it works

```
User (Pera Wallet)
    │
    │  1. Create Wager (backend deploys contract)
    ▼
Algorand Application (WagerEscrow)
    │  ← escrow address holds USDC
    │
    │  2. Join: [USDC transfer → escrow] + [join() call] (atomic group)
    │  3. Arbiter calls resolve(winner_index)
    │     → fee sent to platform wallet via inner txn
    │  4. Winners call claim()
    │     → payout sent via inner txn
    │  5. If expired: any participant calls refund()
    └──────────────────────────────────────────────
```

---

## Setup

### 1. Compile contracts (already done — TEAL files are committed)

```bash
cd contracts
pip install pyteal py-algorand-sdk
python wager_escrow.py
# → writes approval.teal + clear.teal
```

### 2. Add backend files to your Node.js backend

Copy `backend/models/Wager.js` → your backend's `models/` folder
Copy `backend/controllers/wager.controller.js` → `controllers/`
Copy `backend/routes/wager.routes.js` → `routes/`

In your `server.js` / `app.js`:
```js
const wagerRoutes = require('./routes/wager.routes');
app.use('/api/wagers', wagerRoutes);
```

Install algosdk on the backend:
```bash
npm install algosdk
```

### 3. Deploy a test contract to testnet

```bash
python deploy.py \
  --mnemonic "your 25 word mnemonic here" \
  --mode P2P \
  --fee-bps 300 \
  --stake 10000000 \
  --outcomes 2
```

This prints the `app_id` and `escrow_address` — the frontend saves these when creating a wager.

---

## Contract state

### Global (per wager)
| Key | Type | Description |
|-----|------|-------------|
| `creator` | bytes | Creator's Algorand address |
| `arbiter` | bytes | Platform wallet address |
| `expires_at` | uint64 | Unix timestamp |
| `status` | bytes | OPEN / ACTIVE / RESOLVED / EXPIRED / DISPUTED |
| `mode` | bytes | P2P or POOL |
| `fee_bps` | uint64 | Fee in basis points (300 = 3%) |
| `total_pot` | uint64 | Micro USDC in escrow |
| `stake_amt` | uint64 | P2P: required stake per player |
| `num_outcomes` | uint64 | Number of outcome choices (1–4) |
| `out_0`..`out_3` | uint64 | Running total per outcome |
| `winner` | uint64 | Winning outcome index (set on resolve) |

### Local (per participant)
| Key | Type | Description |
|-----|------|-------------|
| `side` | uint64 | Which outcome they bet on |
| `amount` | uint64 | Micro USDC staked |
| `claimed` | uint64 | 0 = unclaimed, 1 = paid out |

---

## Switching to mainnet

1. In `wager_escrow.py`: change `USDC_ASSET_ID_TESTNET = 10458941` to `31566704`
2. Recompile: `python wager_escrow.py`
3. In `src/lib/algorand.js`: change `USDC_ASSET_ID = 10458941` to `31566704`
4. In `backend/controllers/wager.controller.js`: change `USDC_ASSET_ID = 10458941`
5. Update `ALGOD_SERVER` to `https://mainnet-api.algonode.cloud`

---

## Fee structure

- Fee is set per wager (1%–10%), stored in `fee_bps` (e.g. 300 = 3%)
- On `resolve()`, the contract sends the fee directly to the platform wallet via inner transaction
- Winners receive their proportional share of `total_pot - fee`
- P2P: winner takes `(stake * 2) - fee`
- Pool: each winner gets `(their_stake / winning_pool_total) * net_pot`
