import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minimize2, Wallet, CreditCard, History,
  Settings, Copy, ExternalLink, ArrowUpRight, ArrowDownLeft,
  Diamond, Send, ShieldCheck, RefreshCw, Image as ImageIcon, Power, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "@/api/homieshub";
import WalletConnectModal from '@/components/WalletConnectModal';

// --- Mock Data (kept for non-wallet related visuals) ---
const MOCK_ASAS = [
  { id: 453211, name: "Sunset Vibes #1", edition: "1 of 10", image: "https://images.unsplash.com/photo-1616091093747-4d80def1b506?w=400&h=400&fit=crop" },
  { id: 899223, name: "City Lights #4", edition: "4 of 50", image: "https://images.unsplash.com/photo-1549416878-b9ca95255250?w=400&h=400&fit=crop" },
  { id: 112344, name: "Desert Storm", edition: "Original", image: "https://images.unsplash.com/photo-1682687219574-d60f47d464f1?w=400&h=400&fit=crop" },
  { id: 778899, name: "Cyber Punk 2077", edition: "Limited", image: "https://images.unsplash.com/photo-1534239697864-18d4078b5486?w=400&h=400&fit=crop" },
];

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'in', desc: 'Received from @alexnomad', amount: 500, date: 'Oct 24, 2:30 PM' },
  { id: 2, type: 'out', desc: 'Gifted to @traveler', amount: -100, date: 'Oct 23, 11:15 AM' },
  { id: 3, type: 'in', desc: 'Purchase: 1200 Pts', amount: 1200, date: 'Oct 22, 9:45 AM' },
  { id: 4, type: 'out', desc: 'Payout Request', amount: -2000, date: 'Oct 20, 4:20 PM' },
];

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 w-full md:w-auto",
      active
        ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(240,185,77,0.2)]"
        : "text-muted-foreground hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className="h-4 w-4" />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

// ── Settings Tab — standalone component to prevent remount-on-parent-rerender ──
const SettingsTab = () => {
  const { connectedWallet, disconnectWallet } = useWallet();
  const { toast } = useToast();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-900 border-primary/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectedWallet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                  <div>
                    <span className="text-green-400 font-medium block">Connected via {connectedWallet.type}</span>
                    <span className="text-xs text-white/50 font-mono">{connectedWallet.address}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  navigator.clipboard.writeText(connectedWallet.address);
                  toast({ title: "Copied!", description: "Wallet address copied." });
                }}>
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => setWalletModalOpen(true)}>
                  Switch Wallet
                </Button>
                <Button variant="destructive" className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Connect your Algorand wallet to place and sign wagers.</p>
              <Button
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-12"
                onClick={() => setWalletModalOpen(true)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Algorand Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader><CardTitle className="text-white">Security Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Auto-Lock Wallet Mode</span>
                <span className="text-xs text-muted-foreground">Require PIN after 15 minutes of inactivity</span>
              </div>
            </div>
            <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 h-4 w-4 bg-black rounded-full" /></div>
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Hide Balances</span>
                <span className="text-xs text-muted-foreground">Mask amounts when in public view</span>
              </div>
            </div>
            <div className="h-6 w-11 bg-zinc-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full" /></div>
          </div>
        </CardContent>
      </Card>

      <WalletConnectModal isOpen={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};


const WalletIsolationMode = ({ activeTab: initialTab }) => {
  const {
    walletMode,
    exitWalletMode,
    minimizeWalletMode,
    connectedWallet,
  } = useWallet();

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [walletPoints, setWalletPoints] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [txItems, setTxItems] = useState([]);
const [loadingTx, setLoadingTx] = useState(false);

  // Map routes to tabs
  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/purchase')) return 'purchase';
    if (path.includes('/earnings')) return 'earnings';
    if (path.includes('/transactions')) return 'transactions';
    if (path.includes('/moments')) return 'moments';
    if (path.includes('/settings')) return 'settings';
    return 'overview';
  };

  const activeTab = getTabFromPath();

  const setActiveTab = (tab) => {
    if (tab === 'overview') navigate('/wallet');
    else navigate(`/wallet/${tab}`);
  };

  const loadWallet = async () => {
    setLoadingWallet(true);
    try {
      const resp = await api.get("/wallet/me");
      setWalletPoints(resp?.data?.result?.walletPoints ?? 0);
    } catch (e) {
      console.error("Failed to load wallet:", e);
      setWalletPoints(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Refresh wallet whenever wallet mode page changes (including Stripe redirect back)
  useEffect(() => {
    if (!walletMode.active) return;
    loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletMode.active, location.pathname, location.search]);

  const copyAddress = () => {
    if (connectedWallet?.address) {
      navigator.clipboard.writeText(connectedWallet.address);
      toast({ title: "Copied!", description: "Wallet address copied to clipboard." });
    }
  };

  const loadTransactions = async () => {
  setLoadingTx(true);
  try {
    const resp = await api.get("/wallet/transactions?limit=50&page=1");
    setTxItems(resp?.data?.result?.items || []);
  } catch (e) {
    console.error("Failed to load transactions:", e);
    setTxItems([]);
  } finally {
    setLoadingTx(false);
  }
};


  useEffect(() => {
  if (!walletMode.active) return;
  if (activeTab === "transactions") loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [walletMode.active, activeTab]);

  const startCheckout = async (packKey) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to buy points.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(true);
    try {
      const resp = await api.post("/wallet/credits/checkout", { pack: packKey });
      const url = resp?.data?.result?.url;
      if (!url) throw new Error("Missing checkout URL");
      window.location.href = url;
    } catch (e) {
      console.error("Checkout error:", e);
      toast({
        title: "Checkout failed",
        description: e?.response?.data?.message || e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!walletMode.active) return null;

  // --- TAB CONTENT COMPONENTS ---

  const OverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-900/50 border-primary/20 shadow-glow-gold-sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <h2 className="text-5xl font-bold text-primary tracking-tight">
              {Number(walletPoints || 0).toLocaleString()}
            </h2>
            <span className="text-xl text-white/60 mb-1">Pts</span>
          </div>

          {connectedWallet ? (
            <div className="mt-6 p-3 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <Wallet className="h-5 w-5 text-black" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{connectedWallet.type}</span>
                  <span className="text-sm font-mono text-white tracking-wider">{connectedWallet.address}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="text-primary hover:text-white hover:bg-white/10" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
              <p className="text-red-400 text-sm font-medium">No Wallet Connected</p>
              <Button variant="link" className="text-primary text-xs mt-1 h-auto p-0" onClick={() => setActiveTab('settings')}>
                Connect in Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-white/10">
        <CardContent className="pt-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <ImageIcon className="h-8 w-8 mx-auto text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-white">{MOCK_ASAS.length}</div>
              <div className="text-xs text-muted-foreground">Minted Moments</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <ArrowUpRight className="h-8 w-8 mx-auto text-green-400 mb-2" />
              <div className="text-2xl font-bold text-white">+2.4k</div>
              <div className="text-xs text-muted-foreground">Pts Earned (30d)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PurchaseTab = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {[
        { points: 100, price: 0.99, pack: "small" },
        { points: 550, price: 4.99, recommended: true, pack: "medium" },
        { points: 1200, price: 9.99, pack: "large" },
        { points: 6500, price: 49.99, pack: "xlarge" }
      ].map((pkg) => (
        <div
          key={pkg.points}
          className={cn(
            "relative group p-6 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 bg-zinc-900",
            pkg.recommended
              ? "border-primary shadow-[0_0_20px_rgba(240,185,77,0.15)] bg-gradient-to-b from-zinc-900 to-zinc-900/80"
              : "border-white/10 hover:border-white/30 hover:bg-zinc-800"
          )}
          onClick={() => {
            if (checkoutLoading) return;
            startCheckout(pkg.pack);
          }}
        >
          {pkg.recommended && <span className="absolute -top-3 px-3 py-0.5 bg-primary text-black text-[10px] font-bold rounded-full tracking-wider uppercase">Best Value</span>}
          <div className="p-3 rounded-full bg-black/50 border border-white/10 group-hover:scale-110 transition-transform">
            <Diamond className={cn("h-6 w-6", pkg.recommended ? "text-primary" : "text-white")} />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{pkg.points.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Points</div>
          </div>
          <Button
            disabled={checkoutLoading}
            className={cn(
              "w-full mt-2 font-bold",
              pkg.recommended ? "bg-primary text-black hover:bg-primary/90" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {checkoutLoading ? "Redirecting..." : `$${pkg.price}`}
          </Button>
        </div>
      ))}
    </div>
  );

  const EarningsTab = () => (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-primary/20">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Available for Payout</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              ${(Number(walletPoints || 0) / 100).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD</span>
            </div>
            <div className="text-xs text-primary mt-1">{Number(walletPoints || 0).toLocaleString()} Points equivalent</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10 flex items-center justify-center p-6">
          <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => toast({ title: "Request Sent", description: "Payout request initiated." })}>
            Request Payout
          </Button>
        </Card>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Payouts</h3>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Send className="h-5 w-5" /></div>
              <div>
                <div className="text-white font-medium">Payout to Bank •••• 4242</div>
                <div className="text-xs text-muted-foreground">Processed on Oct {10 + i}, 2025</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">$125.00</div>
              <div className="text-xs text-green-400">Completed</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TransactionsTab = () => (
    <div className="max-w-3xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {loadingTx ? (
  <div className="text-muted-foreground p-4">Loading transactions…</div>
) : txItems.length === 0 ? (
  <div className="text-muted-foreground p-4">No transactions yet.</div>
) : (
  txItems.map((t) => {
    const amount = Number(t.pointsChange || 0);
    const isIn = amount > 0;

    const desc =
      t.type === "topup"
        ? `Purchase: ${t?.meta?.pack || ""}`.trim()
        : t.type === "gift_sent"
        ? `Gift sent`
        : t.type === "gift_received"
        ? `Gift received`
        : t.type;

    const dateText = t.createdAt
      ? new Date(t.createdAt).toLocaleString()
      : "";

    return (
      <div
        key={t._id}
        className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-white/5 hover:border-primary/20 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isIn ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}
          >
            {isIn ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-white font-medium">{desc}</div>
            <div className="text-xs text-muted-foreground">{dateText}</div>
          </div>
        </div>

        <div className={cn("font-bold text-lg", isIn ? "text-green-400" : "text-white")}>
          {isIn ? "+" : "-"}{Math.abs(amount).toLocaleString()}
        </div>
      </div>
    );
  })
)}

    </div>
  );

  const MomentsTab = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {MOCK_ASAS.map((asa) => (
        <div key={asa.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
          <img src={asa.image} alt={asa.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="text-[10px] text-primary font-mono mb-0.5">{asa.edition}</div>
            <div className="text-white font-bold text-sm leading-tight">{asa.name}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">ID: {asa.id}</span>
              <ExternalLink className="h-3 w-3 text-white opacity-50 hover:opacity-100 cursor-pointer" />
            </div>
          </div>
        </div>
      ))}
      <div className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-colors">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><RefreshCw className="h-5 w-5" /></div>
        <span className="text-sm font-medium text-muted-foreground">Mint New Moment</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={exitWalletMode} className="gap-2 text-muted-foreground hover:text-white group">
            <div className="bg-red-500/10 p-1 rounded-full group-hover:bg-red-500/20 transition-colors">
              <Power className="h-4 w-4 text-red-500" />
            </div>
            <span className="font-bold">EXIT MODE</span>
          </Button>
          <div className="h-6 w-[1px] bg-white/10" />
          <h1 className="text-lg font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Mode
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Balance</span>
            <span className="font-mono font-bold text-primary">{Number(walletPoints || 0).toLocaleString()}</span>
          </div>
          <Button variant="outline" size="icon" onClick={minimizeWalletMode} className="border-white/10 hover:bg-white/10 text-white">
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Nav */}
        <div className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-white/10 shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Wallet} label="Overview" />
              <TabButton active={activeTab === 'purchase'} onClick={() => setActiveTab('purchase')} icon={Diamond} label="Purchase Points" />
              <TabButton active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')} icon={CreditCard} label="Creator Earnings" />
              <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={History} label="Transactions" />
              <TabButton active={activeTab === 'moments'} onClick={() => setActiveTab('moments')} icon={ImageIcon} label="Minted Moments" />
              <div className="hidden md:block h-[1px] bg-white/10 my-2" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <main className="flex-1 bg-black p-4 md:p-8 overflow-y-auto relative">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-1 capitalize">{activeTab.replace('-', ' ')}</h2>
              <p className="text-muted-foreground">Manage your digital assets securely.</p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'purchase' && <PurchaseTab />}
                {activeTab === 'earnings' && <EarningsTab />}
                {activeTab === 'transactions' && <TransactionsTab />}
                {activeTab === 'moments' && <MomentsTab />}
                {activeTab === 'settings' && <SettingsTab />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        </main>
      </div>
    </div>
  );
};

export default WalletIsolationMode;
