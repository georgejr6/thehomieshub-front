"""
deploy.py — Deploy WagerEscrow to Algorand Testnet
===================================================
Usage:
  python deploy.py --mnemonic "word1 word2 ... word25"

This deploys a NEW wager contract and prints the app_id + escrow address.
The backend stores these for later use.

Requirements:
  pip install py-algorand-sdk

For real deployments (per-wager), the backend calls the Algorand node directly
via algosdk in Node.js. This script is for manual testing / seeding.
"""

import argparse
import base64
import os
import sys

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

# ── Node config (Algonode testnet) ─────────────────────────────────────────────

ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN   = ""  # public node — no token needed

USDC_ASSET_ID = 10458941   # testnet USDC
PLATFORM_FEE  = "ZHKTZUB7T7IDPUWN3EFJIMTPM5GYAFEQXBBOGZQWC4MUFWYCVDDXYPVR6Q"

# ── Helpers ────────────────────────────────────────────────────────────────────

def get_client():
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def read_teal(filename):
    path = os.path.join(os.path.dirname(__file__), filename)
    with open(path, "r") as f:
        return f.read()

def compile_program(client, source):
    result = client.compile(source)
    return base64.b64decode(result["result"])

def wait_for_confirmation(client, txid, timeout=10):
    last_round = client.status()["last-round"]
    while True:
        try:
            pending = client.pending_transaction_info(txid)
            if pending.get("confirmed-round", 0) > 0:
                return pending
            if pending.get("pool-error"):
                raise Exception(f"Transaction failed: {pending['pool-error']}")
        except Exception as e:
            if "not found" not in str(e).lower():
                raise
        client.status_after_block(last_round + 1)
        last_round += 1
        timeout -= 1
        if timeout <= 0:
            raise Exception(f"Transaction {txid} not confirmed after waiting")

# ── Deploy ────────────────────────────────────────────────────────────────────

def deploy_wager(
    deployer_mnemonic: str,
    expires_at: int,       # unix timestamp
    mode: str,             # "P2P" or "POOL"
    fee_bps: int,          # e.g. 300 = 3%
    stake_amt: int,        # micro USDC (P2P fixed stake; 0 for POOL)
    num_outcomes: int,     # 1 to 4
):
    client = get_client()
    private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(private_key)

    print(f"Deployer: {deployer_address}")

    # Compile TEAL
    approval_teal = read_teal("approval.teal")
    clear_teal    = read_teal("clear.teal")
    approval_prog = compile_program(client, approval_teal)
    clear_prog    = compile_program(client, clear_teal)

    # Global state: 14 keys  |  Local state: 3 keys
    global_schema = transaction.StateSchema(num_uints=12, num_byte_slices=4)
    local_schema  = transaction.StateSchema(num_uints=3,  num_byte_slices=0)

    params = client.suggested_params()
    params.flat_fee = True
    params.fee = 2000  # covers inner txns

    app_args = [
        expires_at.to_bytes(8, "big"),
        mode.encode(),
        fee_bps.to_bytes(8, "big"),
        stake_amt.to_bytes(8, "big"),
        num_outcomes.to_bytes(8, "big"),
    ]

    txn = transaction.ApplicationCreateTxn(
        sender=deployer_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_prog,
        clear_program=clear_prog,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=app_args,
    )

    signed = txn.sign(private_key)
    txid   = client.send_transaction(signed)
    print(f"Deploy txid: {txid}")

    result  = wait_for_confirmation(client, txid)
    app_id  = result["application-index"]
    escrow  = account.address_from_private_key(
        mnemonic.to_private_key(deployer_mnemonic)
    )
    # The app's escrow address is deterministic from app_id
    escrow_address = account.get_application_address(app_id)

    print(f"\nApp ID:          {app_id}")
    print(f"Escrow address:  {escrow_address}")
    print(f"\nAdd to your wager record:")
    print(f'  algorandAppId: {app_id}')
    print(f'  escrowAddress: "{escrow_address}"')

    # Now opt the contract into USDC
    _optin_contract_to_usdc(client, private_key, deployer_address, app_id, escrow_address)

    return app_id, escrow_address

def _optin_contract_to_usdc(client, private_key, sender, app_id, escrow_address):
    """Fund the escrow with min ALGO and opt it into USDC."""
    params = client.suggested_params()
    params.flat_fee = True
    params.fee = 2000

    # 1. Fund escrow with 0.3 ALGO (covers min balance + inner txn fees)
    fund_txn = transaction.PaymentTxn(
        sender=sender,
        sp=params,
        receiver=escrow_address,
        amt=300_000,  # 0.3 ALGO in microALGO
    )

    # 2. Call asset_optin on the contract
    optin_txn = transaction.ApplicationNoOpTxn(
        sender=sender,
        sp=params,
        index=app_id,
        app_args=[b"asset_optin"],
    )

    # Group them
    gid = transaction.calculate_group_id([fund_txn, optin_txn])
    fund_txn.group  = gid
    optin_txn.group = gid

    signed_fund  = fund_txn.sign(private_key)
    signed_optin = optin_txn.sign(private_key)

    txid = client.send_transactions([signed_fund, signed_optin])
    wait_for_confirmation(client, txid)
    print(f"Contract opted into USDC. Txid: {txid}")

# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy WagerEscrow to Algorand testnet")
    parser.add_argument("--mnemonic", required=True, help="25-word Algorand mnemonic")
    parser.add_argument("--expires",  type=int, default=None, help="Expiry unix timestamp")
    parser.add_argument("--mode",     default="P2P", choices=["P2P", "POOL"])
    parser.add_argument("--fee-bps",  type=int, default=300, help="Fee in basis points (300=3%%)")
    parser.add_argument("--stake",    type=int, default=10_000_000, help="Stake in micro USDC (10000000 = $10)")
    parser.add_argument("--outcomes", type=int, default=2, help="Number of outcomes (1-4)")

    args = parser.parse_args()

    import time
    expires = args.expires or int(time.time()) + 7 * 24 * 3600  # 7 days from now

    deploy_wager(
        deployer_mnemonic=args.mnemonic,
        expires_at=expires,
        mode=args.mode,
        fee_bps=args.fee_bps,
        stake_amt=args.stake,
        num_outcomes=args.outcomes,
    )
