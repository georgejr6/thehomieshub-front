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
