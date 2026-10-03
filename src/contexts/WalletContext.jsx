import React, { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet as useAlgoWallet } from '@txnlab/use-wallet-react';
import { PeraWalletConnect } from '@perawallet/connect';
import api from '@/api/homieshub';
import { useAuth } from '@/contexts/AuthContext';

const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '7703ab56cc3bc2f4eaf6fac95ffff4e6';

// Singleton Pera v2 instance — created once, reused across connects
let _peraInstance = null;
const getPeraWallet = () => {
  if (!_peraInstance) {
    _peraInstance = new PeraWalletConnect({
      shouldShowSignTxnToast: false,
    });
  }
  return _peraInstance;
};

const WalletContext = createContext();
export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  // use-wallet still needed for extension wallets (Lute, Exodus, Kibisis)
  const {
    wallets: algoWallets,
    activeWallet:  algoActiveWallet,
    activeAddress: algoActiveAddress,
    transactionSigner,
  } = useAlgoWallet();

  // Pera v2 state — managed separately from use-wallet
  const [peraAddress, setPeraAddress] = useState(null);
  const peraRef = useRef(getPeraWallet());

  const [isConnecting, setIsConnecting] = useState(false);

  // The wallet saved on the Homies account (used for payouts and the mobile app).
  const { user, refreshMe } = useAuth();
  const linkedAddress = user?.algorandAddress || null;
  const userRef = useRef(user);
  userRef.current = user;

  const linkToAccount = useCallback(async (address) => {
    if (!userRef.current) return false;
    try {
      await api.patch('/user/algo-wallet', { address });
      await refreshMe();
      return true;
    } catch (_) { return false; }
  }, [refreshMe]);

  const navigate  = useNavigate();
  const location  = useLocation();
  const isWalletModeActive = location.pathname.startsWith('/wallet');

  // Attempt to restore a persisted Pera session on mount
  React.useEffect(() => {
    peraRef.current.reconnectSession()
      .then((accounts) => { if (accounts?.length) setPeraAddress(accounts[0]); })
      .catch(() => {});
  }, []);

  // iOS Safari fix: when the user approves in Pera and returns to this tab,
  // restart the relay WebSocket so the buffered session-approval is delivered
  // and the pending approval() promise resolves.
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const wc = peraRef.current?.client;
        if (wc?.core?.relayer) {
          wc.core.relayer.restartTransport().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Derive active wallet: Pera v2 takes priority, then use-wallet extensions
  const connectedWallet = useMemo(() => {
    if (peraAddress) return { type: 'Pera Wallet', address: peraAddress };
    if (algoActiveAddress) return { type: algoActiveWallet?.metadata?.name || 'Wallet', address: algoActiveAddress };
    return null;
  }, [peraAddress, algoActiveAddress, algoActiveWallet?.metadata?.name]);

  /**
   * Connect — Pera (mobile) uses the beta SDK directly.
   * Extension wallets (Lute, Exodus, Kibisis) still go through use-wallet.
   */
  const connectWallet = useCallback(async (walletIdOrName) => {
    setIsConnecting(true);
    try {
      if (!walletIdOrName || walletIdOrName === 'pera' || walletIdOrName === 'Pera Wallet') {
        const pera = peraRef.current;
        const accounts = await pera.connect();
        if (!accounts?.length) throw new Error('No accounts returned from Pera');
        setPeraAddress(accounts[0]);
        // First wallet on the account: save it (payouts + mobile app use it).
        // A different saved wallet is only replaced from Settings.
        if (!userRef.current?.algorandAddress) linkToAccount(accounts[0]);
        return { type: 'Pera Wallet', address: accounts[0] };
      }

      // Extension wallet path (use-wallet)
      const wallet = algoWallets.find(
        (w) => w.id === walletIdOrName || w.metadata.name === walletIdOrName
      );
      if (!wallet) throw new Error(`Wallet "${walletIdOrName}" is not available`);
      const accounts = await wallet.connect();
      wallet.setActive();
      if (!userRef.current?.algorandAddress) linkToAccount(accounts[0].address);
      return { type: wallet.metadata.name, address: accounts[0].address };
    } finally {
      setIsConnecting(false);
    }
  }, [algoWallets, linkToAccount]);

  const disconnectWallet = useCallback(async () => {
    if (peraAddress) {
      try { await peraRef.current.disconnect(); } catch (_) {}
      setPeraAddress(null);
      // Ending the session leaves the account's saved wallet alone (Settings → Unlink).
    } else if (algoActiveWallet) {
      await algoActiveWallet.disconnect();
    }
  }, [peraAddress, algoActiveWallet, linkToAccount]);

  // Signing out ends the wallet session, so the next account on this browser
  // doesn't inherit it.
  const prevUserRef = useRef(user?._id);
  React.useEffect(() => {
    if (prevUserRef.current && !user) disconnectWallet().catch(() => {});
    prevUserRef.current = user?._id;
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sign transactions — Pera v2 uses its own signTransaction.
   * Extension wallets use use-wallet's transactionSigner.
   */
  const signTransactions = useCallback(async (txnGroups) => {
    if (peraAddress) {
      // Pass the signer so Pera skips items whose signers don't include it
      // (e.g. an x402 facilitator's fee-payer transaction).
      return await peraRef.current.signTransaction(txnGroups, peraAddress);
    }
    const flatItems     = txnGroups.flat();
    const allTxns       = flatItems.map((item) => item.txn);
    const indexesToSign = flatItems
      .map((item, i) => (item.signers?.length > 0 ? i : null))
      .filter((i) => i !== null);
    return await transactionSigner(allTxns, indexesToSign);
  }, [peraAddress, transactionSigner]);

  const value = useMemo(() => ({
    // Expose the full wallets list so WalletConnectModal can still show extension wallets
    wallets:         algoWallets,
    peraWallet:      peraRef.current,
    connectedWallet,
    linkedAddress,
    linkToAccount,
    connectWallet,
    disconnectWallet,
    signTransactions,
    transactionSigner,
    isConnecting,
    algoBalance:         null,
    setAlgoBalance:      () => {},
    enterWalletMode:     () => navigate('/wallet'),
    exitWalletMode:      () => navigate('/'),
    minimizeWalletMode:  () => navigate('/'),
    maximizeWalletMode:  () => navigate('/wallet'),
    walletMode: { active: isWalletModeActive, minimized: false },
  }), [
    algoWallets,
    connectedWallet,
    linkedAddress,
    linkToAccount,
    connectWallet,
    disconnectWallet,
    signTransactions,
    transactionSigner,
    isConnecting,
    isWalletModeActive,
    navigate,
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
