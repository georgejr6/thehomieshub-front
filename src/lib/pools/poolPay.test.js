import algosdk from 'algosdk';
import { describe, expect, it, vi } from 'vitest';
import { ExactAvmScheme as FacilitatorScheme } from '@x402/avm/exact/facilitator';

vi.mock('./chain', async (orig) => {
  const real = await orig();
  return {
    ...real,
    suggestedParams: async () => ({
      flatFee: false, fee: 0n, minFee: 1000n, firstValid: 1000n, lastValid: 1100n,
      genesisID: 'mainnet-v1.0', genesisHash: algosdk.base64ToBytes('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='),
    }),
  };
});

const { PoolBetScheme } = await import('./poolPay');
const { appAddress, betBoxName, poolBoxName, USDC_ASA } = await import('./chain');

const NETWORK = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=';

describe('PoolBetScheme', () => {
  const bettor = algosdk.generateAccount();
  const facil = algosdk.generateAccount();
  const appId = 123456n;
  const address = bettor.addr.toString();
  let signedIdx = null;

  // Pera-style signer: returns only the txns whose signers include the address.
  const signTransactions = async ([group]) => {
    signedIdx = group.map((g, i) => (g.signers.length ? i : -1)).filter((i) => i >= 0);
    return group.filter((g) => g.signers.length).map((g) => g.txn.signTxn(bettor.sk));
  };

  const req = {
    scheme: 'exact', network: NETWORK, amount: '5000000', asset: String(USDC_ASA), payTo: appAddress(appId),
    maxTimeoutSeconds: 300,
    extra: { feePayer: facil.addr.toString(), appId: Number(appId), poolId: 7, outcome: 2, asset: USDC_ASA },
  };

  it('builds [fee-payer, axfer, bet appcall] and the facilitator verifies it', async () => {
    const scheme = new PoolBetScheme({ address, signTransactions, poolId: 7, outcome: 2, amountMicro: 5_000_000, appId });
    const { payload } = await scheme.createPaymentPayload(2, req);
    expect(payload.paymentIndex).toBe(1);
    expect(payload.paymentGroup).toHaveLength(3);
    expect(signedIdx).toEqual([1, 2]);

    const decoded = payload.paymentGroup.map((b64, i) => {
      const bytes = algosdk.base64ToBytes(b64);
      return i === 0 ? algosdk.decodeUnsignedTransaction(bytes) : algosdk.decodeSignedTransaction(bytes).txn;
    });
    const [fp, ax, ap] = decoded;
    expect(fp.sender.toString()).toBe(facil.addr.toString());
    expect(fp.fee).toBe(3000n);
    expect(ax.fee).toBe(0n);
    expect(ap.fee).toBe(0n);
    expect(ax.assetTransfer.receiver.toString()).toBe(appAddress(appId));
    expect(ax.assetTransfer.amount).toBe(5_000_000n);
    expect(ap.applicationCall.appIndex).toBe(appId);
    expect(ap.applicationCall.boxes.map((b) => algosdk.bytesToBase64(b.name))).toEqual([
      algosdk.bytesToBase64(poolBoxName(7)), algosdk.bytesToBase64(betBoxName(7, address)),
    ]);
    const sel = algosdk.ABIMethod.fromSignature('bet(axfer,uint64,uint8)void').getSelector();
    expect(ap.applicationCall.appArgs[0]).toEqual(sel);
    expect(ap.applicationCall.appArgs[2]).toEqual(new Uint8Array([2]));
    const g = algosdk.bytesToBase64(fp.group);
    expect(algosdk.bytesToBase64(ax.group)).toBe(g);
    expect(algosdk.bytesToBase64(ap.group)).toBe(g);

    // The real @x402/avm facilitator logic (simulation stubbed).
    const facilitator = new FacilitatorScheme({
      getAddresses: () => [facil.addr.toString()],
      signTransaction: async (bytes) => algosdk.decodeUnsignedTransaction(bytes).signTxn(facil.sk),
      simulateTransactions: async () => ({ txnGroups: [{}] }),
    });
    const result = await facilitator.verify({ x402Version: 2, accepted: req, payload }, req);
    expect(result).toEqual({ isValid: true, payer: address });
  });

  it('refuses to sign when the 402 asks for a different pool/outcome/amount', async () => {
    const scheme = new PoolBetScheme({ address, signTransactions, poolId: 7, outcome: 1, amountMicro: 5_000_000, appId });
    await expect(scheme.createPaymentPayload(2, req)).rejects.toThrow(/mismatch/);
    const s2 = new PoolBetScheme({ address, signTransactions, poolId: 7, outcome: 2, amountMicro: 5_000_000, appId });
    await expect(s2.createPaymentPayload(2, { ...req, payTo: facil.addr.toString() })).rejects.toThrow(/pool contract/);
  });
});

describe('pool chain helpers', async () => {
  const { buildVoteTxn, estimatePayoutMicro, CANCEL_VOTE, suggestedParams } = await import('./chain');
  const params = await suggestedParams(); // mocked above: no network

  it('vote(uint64,uint8) references the pool box, USDC and the fee receiver, and covers the inner fee', async () => {
    const judge = algosdk.generateAccount().addr.toString();
    const feeReceiver = algosdk.generateAccount().addr.toString();
    const house = algosdk.generateAccount().addr.toString();
    const txn = await buildVoteTxn({ appId: 99, poolId: 3, choice: 1, signer: judge, feeReceiver, house, params });
    const ac = txn.applicationCall;
    expect(ac.appArgs[0]).toEqual(algosdk.ABIMethod.fromSignature('vote(uint64,uint8)void').getSelector());
    expect(ac.appArgs[1]).toEqual(algosdk.encodeUint64(3n));
    expect(ac.appArgs[2]).toEqual(new Uint8Array([1]));
    expect(ac.boxes.map((b) => algosdk.bytesToBase64(b.name))).toEqual([algosdk.bytesToBase64(poolBoxName(3))]);
    expect(ac.foreignAssets).toEqual([BigInt(USDC_ASA)]);
    expect(ac.accounts.map(String)).toEqual([feeReceiver, house]);
    expect(txn.fee).toBe(2000n);
    const cancel = await buildVoteTxn({ appId: 99, poolId: 3, choice: CANCEL_VOTE, signer: judge, params });
    expect(cancel.applicationCall.appArgs[2]).toEqual(new Uint8Array([200]));
  });

  it('payout estimate matches the contract integer math (10% fee, pro-rata, floor)', () => {
    // pot 1000, 200 on outcome 0: $10 on it pays 10 * 900 / 200 = 45
    expect(estimatePayoutMicro([200e6, 800e6], 0, 10e6, 0)).toBe(45e6);
    // adding a new $10 bet: total 1010, fee 101, net 909, on pick 210 -> floor(10e6*909e6/210e6)
    expect(estimatePayoutMicro([200e6, 800e6], 0, 10e6)).toBe(Number((10_000_000n * 909_000_000n) / 210_000_000n));
    // fee floors: total 7 micro -> fee 0
    expect(estimatePayoutMicro([3, 4], 0, 3, 0)).toBe(7);
    // big pot, exact
    expect(estimatePayoutMicro([123_456_789_012, 987_654_321_098], 1, 500_000_000, 0))
      .toBe(Number((500_000_000n * (1_111_111_110_110n - 111_111_111_011n)) / 987_654_321_098n));
    expect(estimatePayoutMicro([0, 5e6], 0, 0, 0)).toBe(0);
  });
});
