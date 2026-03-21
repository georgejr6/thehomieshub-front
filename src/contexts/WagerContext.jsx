import React, { createContext, useContext, useState, useCallback } from 'react';
import algosdk from 'algosdk';
import { getWagers, getWager, createWager, joinWager as joinWagerAPI, resolveWager, castVote, disputeWager } from '@/api/wager';
import { useToast } from '@/components/ui/use-toast';
import { algodClient, buildWagerPaymentTxn, toMicroUSDC } from '@/lib/algorand';
import { useWallet } from '@/contexts/WalletContext';
import { MOCK_WAGERS } from '@/data/mockWagers';

const WagerContext = createContext();
export const useWager = () => useContext(WagerContext);

export const WagerProvider = ({ children }) => {
  const [wagers, setWagers] = useState([]);
  const [loadingWagers, setLoadingWagers] = useState(false);
  const [activeWager, setActiveWager] = useState(null);
  const { toast } = useToast();
  const { connectedWallet, signTransactions } = useWallet();

  const fetchWagers = useCallback(async (params = {}) => {
    setLoadingWagers(true);
    try {
      const res = await getWagers(params);
      const data = res.data?.result?.wagers || res.data?.wagers || res.data?.result?.items || [];
      setWagers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('fetchWagers: falling back to mock data', err?.message);
      setWagers(MOCK_WAGERS);
    } finally {
      setLoadingWagers(false);
    }
  }, []);

  const fetchWager = useCallback(async (id) => {
    try {
      const res = await getWager(id);
      const w = res.data?.result || res.data;
      setActiveWager(w);
      return w;
    } catch {
      const mock = MOCK_WAGERS.find((w) => w._id === id);
      if (mock) setActiveWager(mock);
      return mock;
    }
  }, []);

  const handleCreateWager = useCallback(async (data) => {
    const res = await createWager(data);
    const wager = res.data?.result || res.data;
    toast({ title: 'Wager Created', description: 'Your wager is live on the Homies Hub.' });
    return wager;
  }, [toast]);

  /**
   * Join a wager — full on-chain flow:
   * 1. Opt user's wallet into the Algorand app (if first time)
   * 2. Build atomic group: [USDC transfer → escrow, join() NoOp call]
   * 3. Sign both txns with Pera Wallet
   * 4. Submit to Algorand, wait for confirmation
   * 5. Record participation on the backend with the confirmed txId
   */
  const handleJoinWager = useCallback(async (wagerId, { side, amount, wager }) => {
    if (!connectedWallet) throw new Error('Connect your Pera Wallet first');

    const senderAddr = connectedWallet.address;

    // ── Mock mode: no on-chain contract yet ────────────────────────────────────
    if (!wager?.algorandAppId || !wager?.escrowAddress) {
      await joinWagerAPI(wagerId, { side, amountMicro: toMicroUSDC(amount), txId: 'mock_txn' });
      toast({ title: 'Joined!', description: `$${amount.toFixed(2)} locked in escrow.` });
      return;
    }

    const appId     = wager.algorandAppId;
    const escrowAddr = wager.escrowAddress;
    const amountMicro = toMicroUSDC(amount);

    // ── Step 1: opt in if needed ───────────────────────────────────────────────
    const acctInfo  = await algodClient.accountInformation(senderAddr).do();
    const isOptedIn = (acctInfo['apps-local-state'] || []).some((a) => a.id === appId);

    if (!isOptedIn) {
      toast({ title: 'Opt-in required', description: 'Approving USDC opt-in — check Pera Wallet.' });
      const params = await algodClient.getTransactionParams().do();
      params.flatFee = true;
      params.fee = 1000;

      const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
        from: senderAddr,
        suggestedParams: params,
        appIndex: appId,
      });

      const [[signedOptIn]] = await signTransactions([[{ txn: optInTxn, signers: [senderAddr] }]]);
      const { txId: optInTxId } = await algodClient.sendRawTransaction(signedOptIn).do();
      await algosdk.waitForConfirmation(algodClient, optInTxId, 4);
    }

    // ── Step 2: build atomic join group ───────────────────────────────────────
    toast({ title: 'Approve transaction', description: 'Sign the USDC stake in Pera Wallet.' });

    const params = await algodClient.getTransactionParams().do();
    params.flatFee = true;
    params.fee = 2000; // covers inner txn fees

    const usdcTxn = await buildWagerPaymentTxn({
      senderAddress: senderAddr,
      escrowAddress: escrowAddr,
      amountUSDC:    amount,
      note:          `join:${wagerId}`,
    });

    const joinCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from:            senderAddr,
      suggestedParams: params,
      appIndex:        appId,
      appArgs:         [
        new TextEncoder().encode('join'),
        algosdk.encodeUint64(side),
      ],
    });

    algosdk.assignGroupID([usdcTxn, joinCallTxn]);

    // ── Step 3: sign with Pera ─────────────────────────────────────────────────
    const signedTxns = await signTransactions([[
      { txn: usdcTxn,      signers: [senderAddr] },
      { txn: joinCallTxn,  signers: [senderAddr] },
    ]]);

    // ── Step 4: submit ────────────────────────────────────────────────────────
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    // ── Step 5: record on backend ─────────────────────────────────────────────
    await joinWagerAPI(wagerId, { side, amountMicro, txId });

    toast({ title: 'Joined!', description: `$${amount.toFixed(2)} USD locked in Algorand escrow.` });
    return txId;
  }, [connectedWallet, signTransactions, toast]);

  const handleCastVote = useCallback(async (id, outcomeIndex) => {
    const res = await castVote(id, { side: outcomeIndex });
    toast({ title: 'Vote Cast', description: 'Your vote has been recorded.' });
    return res.data;
  }, [toast]);

  const handleDisputeWager = useCallback(async (id, reason) => {
    const res = await disputeWager(id, { reason });
    toast({ title: 'Dispute Raised', description: 'Platform will review and resolve.' });
    return res.data;
  }, [toast]);

  return (
    <WagerContext.Provider
      value={{
        wagers,
        loadingWagers,
        activeWager,
        fetchWagers,
        fetchWager,
        createWager:  handleCreateWager,
        joinWager:    handleJoinWager,
        castVote:     handleCastVote,
        disputeWager: handleDisputeWager,
      }}
    >
      {children}
    </WagerContext.Provider>
  );
};

