import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/styles/homies-theme.css';
import '@/index.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { ContentProvider } from '@/contexts/ContentContext';
import { MediaProvider } from '@/contexts/MediaContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { WalletProvider as AlgoWalletProvider, WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet-react';

// ── Algorand wallet manager — extension wallets only ─────────────────────────
// Pera Wallet is now handled directly via @perawallet/connect-beta (WalletContext).
// use-wallet only manages desktop browser extension wallets here.
const walletManager = new WalletManager({
  wallets: [
    WalletId.LUTE,    // Lute browser extension (best for desktop)
    WalletId.EXODUS,  // Exodus desktop/extension
    WalletId.KIBISIS, // Kibisis browser extension
  ],
  network: NetworkId.MAINNET,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <AuthProvider>
        <AlgoWalletProvider manager={walletManager}>
          <WalletProvider>
            <ContentProvider>
              <MediaProvider>
                <MessageProvider>
                  <FeatureProvider>
                    <App />
                  </FeatureProvider>
                </MessageProvider>
              </MediaProvider>
            </ContentProvider>
          </WalletProvider>
        </AlgoWalletProvider>
      </AuthProvider>
    </BrowserRouter>
  </>
);