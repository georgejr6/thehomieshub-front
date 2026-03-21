"""
WagerEscrow — Algorand Stateful Application
=============================================
Holds USDC (ASA) in escrow for a single wager.
One contract is deployed per wager.

Flow:
  1. Backend deploys this app → gets app_id + escrow_address
  2. Creator joins first (send USDC to escrow_address + call join())
  3. Other participants join the same way
  4. Arbiter calls resolve(winner) → contract sends USDC to winners
  5. If expired with no resolution → anyone calls refund() to get stakes back

State:
  Global:  creator, arbiter, expires_at, status, mode (P2P/POOL),
           fee_bps, total_pot, stake_amt (P2P), num_outcomes,
           outcome_0..3_total, winner
  Local:   side, amount, claimed  (per participant)
"""

from pyteal import *

# ── Constants ─────────────────────────────────────────────────────────────────

USDC_ASSET_ID_TESTNET = 10458941
USDC_ASSET_ID_MAINNET = 31566704

PLATFORM_WALLET = Addr("ZHKTZUB7T7IDPUWN3EFJIMTPM5GYAFEQXBBOGZQWC4MUFWYCVDDXYPVR6Q")

# Wager status byte strings
STATUS_OPEN     = Bytes("OPEN")
STATUS_ACTIVE   = Bytes("ACTIVE")
STATUS_RESOLVED = Bytes("RESOLVED")
STATUS_EXPIRED  = Bytes("EXPIRED")
STATUS_DISPUTED = Bytes("DISPUTED")

# Global state keys
G_CREATOR     = Bytes("creator")
G_ARBITER     = Bytes("arbiter")
G_EXPIRES_AT  = Bytes("expires_at")
G_STATUS      = Bytes("status")
G_MODE        = Bytes("mode")          # "P2P" or "POOL"
G_FEE_BPS     = Bytes("fee_bps")       # fee in basis points (300 = 3%)
G_TOTAL_POT   = Bytes("total_pot")     # micro USDC
G_STAKE_AMT   = Bytes("stake_amt")     # P2P: both players must match this
G_NUM_OUT     = Bytes("num_outcomes")
G_OUT_0       = Bytes("out_0")
G_OUT_1       = Bytes("out_1")
G_OUT_2       = Bytes("out_2")
G_OUT_3       = Bytes("out_3")
G_WINNER      = Bytes("winner")

# Local state keys (per participant)
L_SIDE    = Bytes("side")
L_AMOUNT  = Bytes("amount")
L_CLAIMED = Bytes("claimed")

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_outcome_total(index):
    """Return the global state value for the given outcome index."""
    return Cond(
        [index == Int(0), App.globalGet(G_OUT_0)],
        [index == Int(1), App.globalGet(G_OUT_1)],
        [index == Int(2), App.globalGet(G_OUT_2)],
        [index == Int(3), App.globalGet(G_OUT_3)],
    )

def increment_outcome_total(index, amount):
    """Increment the running total for the given outcome index."""
    return Cond(
        [index == Int(0), App.globalPut(G_OUT_0, App.globalGet(G_OUT_0) + amount)],
        [index == Int(1), App.globalPut(G_OUT_1, App.globalGet(G_OUT_1) + amount)],
        [index == Int(2), App.globalPut(G_OUT_2, App.globalGet(G_OUT_2) + amount)],
        [index == Int(3), App.globalPut(G_OUT_3, App.globalGet(G_OUT_3) + amount)],
    )

def usdc_transfer(receiver, amount):
    """Inner transaction: send micro USDC to receiver."""
    return Seq([
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum:      TxnType.AssetTransfer,
            TxnField.xfer_asset:     Int(USDC_ASSET_ID_TESTNET),
            TxnField.asset_receiver: receiver,
            TxnField.asset_amount:   amount,
            TxnField.fee:            Int(0),
        }),
        InnerTxnBuilder.Submit(),
    ])

# ── On Create ─────────────────────────────────────────────────────────────────
# ApplicationCall with no app_id — deploys the contract.
# Args: [expires_at, mode, fee_bps, stake_amt, num_outcomes]

on_create = Seq([
    Assert(Txn.application_args.length() == Int(5)),
    App.globalPut(G_CREATOR,    Txn.sender()),
    App.globalPut(G_ARBITER,    PLATFORM_WALLET),  # platform is default arbiter
    App.globalPut(G_EXPIRES_AT, Btoi(Txn.application_args[0])),
    App.globalPut(G_MODE,       Txn.application_args[1]),
    App.globalPut(G_FEE_BPS,    Btoi(Txn.application_args[2])),
    App.globalPut(G_STAKE_AMT,  Btoi(Txn.application_args[3])),
    App.globalPut(G_NUM_OUT,    Btoi(Txn.application_args[4])),
    App.globalPut(G_STATUS,     STATUS_OPEN),
    App.globalPut(G_TOTAL_POT,  Int(0)),
    App.globalPut(G_OUT_0,      Int(0)),
    App.globalPut(G_OUT_1,      Int(0)),
    App.globalPut(G_OUT_2,      Int(0)),
    App.globalPut(G_OUT_3,      Int(0)),
    App.globalPut(G_WINNER,     Int(0)),
    Approve(),
])

# ── Opt In (join wager) ───────────────────────────────────────────────────────
# The contract needs to opt in to USDC once after deployment (done by deployer).
# Each participant opts in to local state then calls join().

on_opt_in = Seq([
    # Allow opt in while wager is OPEN or ACTIVE
    Assert(
        Or(
            App.globalGet(G_STATUS) == STATUS_OPEN,
            App.globalGet(G_STATUS) == STATUS_ACTIVE,
        )
    ),
    Assert(Global.latest_timestamp() < App.globalGet(G_EXPIRES_AT)),
    App.localPut(Txn.sender(), L_SIDE,    Int(0)),
    App.localPut(Txn.sender(), L_AMOUNT,  Int(0)),
    App.localPut(Txn.sender(), L_CLAIMED, Int(0)),
    Approve(),
])

# ── join(side) ────────────────────────────────────────────────────────────────
# Called together with an asset transfer (USDC) to the app's escrow address.
# Group: [AssetTransfer → escrow, ApplicationCall → join]
#
# Args: [side (uint64 — outcome index)]

is_join = Txn.application_args[0] == Bytes("join")

side      = Btoi(Txn.application_args[1])
usdc_txn  = Gtxn[Txn.group_index() - Int(1)]   # the USDC payment precedes this call
stake_in  = usdc_txn.asset_amount()

on_join = Seq([
    Assert(App.globalGet(G_STATUS) == STATUS_OPEN),
    Assert(Global.latest_timestamp() < App.globalGet(G_EXPIRES_AT)),
    Assert(side < App.globalGet(G_NUM_OUT)),

    # Verify preceding transaction is a USDC transfer to this app's escrow
    Assert(usdc_txn.type_enum()     == TxnType.AssetTransfer),
    Assert(usdc_txn.xfer_asset()    == Int(USDC_ASSET_ID_TESTNET)),
    Assert(usdc_txn.asset_receiver() == Global.current_application_address()),
    Assert(stake_in > Int(0)),

    # P2P mode: enforce fixed stake amount
    If(
        App.globalGet(G_MODE) == Bytes("P2P"),
        Assert(stake_in == App.globalGet(G_STAKE_AMT)),
    ),

    # Record participant local state
    App.localPut(Txn.sender(), L_SIDE,   side),
    App.localPut(Txn.sender(), L_AMOUNT, stake_in),

    # Update outcome total and global pot
    increment_outcome_total(side, stake_in),
    App.globalPut(G_TOTAL_POT, App.globalGet(G_TOTAL_POT) + stake_in),

    # Transition to ACTIVE once anyone joins (first participant after creator is "matched")
    If(
        App.globalGet(G_TOTAL_POT) >= App.globalGet(G_STAKE_AMT) * Int(2),
        App.globalPut(G_STATUS, STATUS_ACTIVE),
    ),

    Approve(),
])

# ── resolve(winner) ───────────────────────────────────────────────────────────
# Only callable by the arbiter (platform wallet).
# Calculates fee, sends it to platform, marks status RESOLVED.
# Args: ["resolve", winner_index]

is_resolve = Txn.application_args[0] == Bytes("resolve")

winner_idx = Btoi(Txn.application_args[1])

on_resolve = Seq([
    Assert(
        Or(
            App.globalGet(G_STATUS) == STATUS_OPEN,
            App.globalGet(G_STATUS) == STATUS_ACTIVE,
            App.globalGet(G_STATUS) == STATUS_DISPUTED,
        )
    ),
    Assert(Txn.sender() == App.globalGet(G_ARBITER)),
    Assert(winner_idx < App.globalGet(G_NUM_OUT)),

    # Calculate and send platform fee
    # fee_amount = total_pot * fee_bps / 10000
    App.globalPut(G_WINNER, winner_idx),
    App.globalPut(G_STATUS, STATUS_RESOLVED),

    # Send fee to platform wallet via inner transaction
    InnerTxnBuilder.Begin(),
    InnerTxnBuilder.SetFields({
        TxnField.type_enum:      TxnType.AssetTransfer,
        TxnField.xfer_asset:     Int(USDC_ASSET_ID_TESTNET),
        TxnField.asset_receiver: PLATFORM_WALLET,
        TxnField.asset_amount:   App.globalGet(G_TOTAL_POT) * App.globalGet(G_FEE_BPS) / Int(10000),
        TxnField.fee:            Int(0),
    }),
    InnerTxnBuilder.Submit(),

    Approve(),
])

# ── claim() ───────────────────────────────────────────────────────────────────
# Winners call this to receive their proportional share of the payout pool.
# Payout = (user_amount / winning_side_total) * (total_pot - fee)
# Args: ["claim"]

is_claim = Txn.application_args[0] == Bytes("claim")

on_claim = Seq([
    Assert(App.globalGet(G_STATUS) == STATUS_RESOLVED),
    Assert(App.localGet(Txn.sender(), L_CLAIMED) == Int(0)),
    Assert(App.localGet(Txn.sender(), L_SIDE) == App.globalGet(G_WINNER)),

    # user_share = user_amount * net_pool / winning_pool
    InnerTxnBuilder.Begin(),
    InnerTxnBuilder.SetFields({
        TxnField.type_enum:      TxnType.AssetTransfer,
        TxnField.xfer_asset:     Int(USDC_ASSET_ID_TESTNET),
        TxnField.asset_receiver: Txn.sender(),
        TxnField.asset_amount:   (
            App.localGet(Txn.sender(), L_AMOUNT)
            * (App.globalGet(G_TOTAL_POT) - App.globalGet(G_TOTAL_POT) * App.globalGet(G_FEE_BPS) / Int(10000))
            / get_outcome_total(App.globalGet(G_WINNER))
        ),
        TxnField.fee: Int(0),
    }),
    InnerTxnBuilder.Submit(),

    App.localPut(Txn.sender(), L_CLAIMED, Int(1)),
    Approve(),
])

# ── refund() ──────────────────────────────────────────────────────────────────
# Available when expired and unresolved.
# Any participant can call this to reclaim their stake.
# Args: ["refund"]

is_refund = Txn.application_args[0] == Bytes("refund")

on_refund = Seq([
    # Allow refund if expired or explicitly expired status
    Assert(
        Or(
            Global.latest_timestamp() >= App.globalGet(G_EXPIRES_AT),
            App.globalGet(G_STATUS) == STATUS_EXPIRED,
        )
    ),
    Assert(App.globalGet(G_STATUS) != STATUS_RESOLVED),
    Assert(App.localGet(Txn.sender(), L_CLAIMED) == Int(0)),
    Assert(App.localGet(Txn.sender(), L_AMOUNT) > Int(0)),

    App.globalPut(G_STATUS, STATUS_EXPIRED),

    usdc_transfer(Txn.sender(), App.localGet(Txn.sender(), L_AMOUNT)),

    App.localPut(Txn.sender(), L_CLAIMED, Int(1)),
    Approve(),
])

# ── dispute() ────────────────────────────────────────────────────────────────
# Any participant can flag a dispute — status moves to DISPUTED.
# Arbiter must then call resolve() to settle.
# Args: ["dispute"]

is_dispute = Txn.application_args[0] == Bytes("dispute")

on_dispute = Seq([
    Assert(
        Or(
            App.globalGet(G_STATUS) == STATUS_ACTIVE,
            App.globalGet(G_STATUS) == STATUS_OPEN,
        )
    ),
    Assert(App.localGet(Txn.sender(), L_AMOUNT) > Int(0)),
    App.globalPut(G_STATUS, STATUS_DISPUTED),
    Approve(),
])

# ── Contract opt-in to USDC ───────────────────────────────────────────────────
# The deployer calls this once after deployment so the contract can hold USDC.

is_asset_optin = Txn.application_args[0] == Bytes("asset_optin")

on_asset_optin = Seq([
    Assert(Txn.sender() == App.globalGet(G_CREATOR)),
    InnerTxnBuilder.Begin(),
    InnerTxnBuilder.SetFields({
        TxnField.type_enum:      TxnType.AssetTransfer,
        TxnField.xfer_asset:     Int(USDC_ASSET_ID_TESTNET),
        TxnField.asset_receiver: Global.current_application_address(),
        TxnField.asset_amount:   Int(0),
        TxnField.fee:            Int(0),
    }),
    InnerTxnBuilder.Submit(),
    Approve(),
])

# ── Approval Program ──────────────────────────────────────────────────────────

def approval_program():
    return Cond(
        [Txn.application_id() == Int(0),          on_create],
        [Txn.on_completion()   == OnComplete.OptIn, on_opt_in],
        [is_join,                                   on_join],
        [is_resolve,                                on_resolve],
        [is_claim,                                  on_claim],
        [is_refund,                                 on_refund],
        [is_dispute,                                on_dispute],
        [is_asset_optin,                            on_asset_optin],
    )

# ── Clear State Program ───────────────────────────────────────────────────────

def clear_state_program():
    return Approve()

# ── Compile ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os

    mode = compileTeal(approval_program(), mode=Mode.Application, version=9)
    clear = compileTeal(clear_state_program(), mode=Mode.Application, version=9)

    out_dir = os.path.dirname(os.path.abspath(__file__))

    with open(os.path.join(out_dir, "approval.teal"), "w") as f:
        f.write(mode)

    with open(os.path.join(out_dir, "clear.teal"), "w") as f:
        f.write(clear)

    print("Compiled: approval.teal + clear.teal")
