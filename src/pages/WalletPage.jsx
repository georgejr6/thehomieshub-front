import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { AnimatePresence, motion } from 'framer-motion';
import { Diamond, ShoppingCart, DollarSign, Receipt, Send, ArrowUp, ArrowDown, Lock, Wallet as WalletIcon, Link as LinkIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import WalletConnectModal from '@/components/WalletConnectModal';
import PayoutConnect from '@/components/CreatorStudio/PayoutConnect';
import { cn } from '@/lib/utils';
import api from "@/api/homieshub";


const pointPackages = [
    { points: 100, price: 0.99, iconCount: 1 },
    { points: 550, price: 4.99, iconCount: 2, recommended: true },
    { points: 1200, price: 9.99, iconCount: 3 },
    { points: 6500, price: 49.99, iconCount: 4 },
];

const transactionHistory = [
    { id: 1, type: 'purchase', details: 'Purchased 550 points', amount: -550, date: '2025-10-09' },
    { id: 2, type: 'gift_sent', details: 'Sent gift to @alexnomad', amount: -100, date: '2025-10-08' },
    { id: 3, type: 'earnings', details: 'Received from Livestream', amount: 250, date: '2025-10-07' },
    { id: 4, type: 'payout', details: 'Payout requested', amount: -2000, date: '2025-10-05' },
];

const WalletPage = ({ onLoginRequest }) => {
    const {  enterWalletMode, connectedWallet } = useWallet();
    const { user, isPremium, triggerLockedFeature } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('purchase');
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [walletPoints, setWalletPoints] = useState(0);
    const [txItems, setTxItems] = useState([]);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [loadingTx, setLoadingTx] = useState(false);

    useEffect(() => {
        if (!user) {
            onLoginRequest();
        }
    }, [user, onLoginRequest]);
    useEffect(() => {
        if (user) loadWallet();
    }, [user]);

    useEffect(() => {
        if (user && activeTab === "transactions") loadTransactions();
    }, [user, activeTab]);

    const handlePurchase = (pkg) => {
        // map package points to pack key used by backend
        const packKey =
            pkg.points === 100 ? "small" :
                pkg.points === 550 ? "medium" :
                    pkg.points === 1200 ? "large" :
                        "xlarge";

        startCheckout(packKey);
    };

    // Payout setup is intentionally NOT premium-gated — anyone should be able to
    // connect a payout account and start earning right away.
    const handleTabChange = (value) => {
        setActiveTab(value);
    }

    const loadWallet = async () => {
        setLoadingWallet(true);
        try {
            const resp = await api.get("/wallet/me");
            const pts = resp?.data?.result?.walletPoints ?? 0;
            setWalletPoints(pts);
        } catch (e) {
            console.error("Failed to load wallet:", e);
            toast({
                title: "Failed to load wallet",
                description: e?.response?.data?.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoadingWallet(false);
        }
    };

    const loadTransactions = async () => {
        setLoadingTx(true);
        try {
            const resp = await api.get("/wallet/transactions?limit=50&page=1");
            const items = resp?.data?.result?.items || [];
            setTxItems(items);
        } catch (e) {
            console.error("Failed to load transactions:", e);
            toast({
                title: "Failed to load transactions",
                description: e?.response?.data?.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoadingTx(false);
        }
    };

    const startCheckout = async (packKey) => {
        try {
            const resp = await api.post("/wallet/credits/checkout", { pack: packKey });
            const url = resp?.data?.result?.url;
            if (!url) throw new Error("Missing checkout URL");
            window.location.href = url; // Stripe redirect
        } catch (e) {
            console.error("Checkout error:", e);
            toast({
                title: "Checkout failed",
                description: e?.response?.data?.message || e?.message || "Please try again",
                variant: "destructive",
            });
        }
    };


    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Please log in to view your wallet.</p>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>My Wallet - The Homies Hub</title>
                <meta name="description" content="View your balance, purchase points, and manage your earnings on The Homies Hub." />
            </Helmet>

            <WalletConnectModal isOpen={isConnectModalOpen} onOpenChange={setIsConnectModalOpen} />

            <div className="p-4 md:p-8 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Wallet</h1>
                        <p className="text-muted-foreground">View your balance, purchase points, and manage your earnings.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button
                            onClick={() => setIsConnectModalOpen(true)}
                            variant="outline"
                            className={cn("border-primary/20 hover:bg-primary/5", connectedWallet && "border-green-500/30 bg-green-500/5 hover:bg-green-500/10")}
                        >
                            {connectedWallet ? (
                                <>
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
                                    <span className="text-green-500 font-medium">Wallet Connected</span>
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Connect Crypto Wallet
                                </>
                            )}
                        </Button>
                        <Button onClick={enterWalletMode} className="bg-primary text-black hover:bg-primary/90 shadow-glow-gold-sm">
                            <WalletIcon className="mr-2 h-4 w-4" />
                            Enter Wallet Mode
                        </Button>
                    </div>
                </div>

                <Card className="bg-card/50 border-primary/20">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground text-sm">Total Point Balance</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <Diamond className="w-10 h-10 text-primary" />
                            <motion.p
                                className="text-5xl font-bold text-primary"
                                key={walletPoints}
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                            >
                                {walletPoints.toLocaleString()}
                            </motion.p>
                            <span className="text-2xl font-semibold text-muted-foreground self-end pb-1">Pts</span>
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="purchase"><ShoppingCart className="mr-2 h-4 w-4" />Purchase Points</TabsTrigger>
                        <TabsTrigger value="earnings">
                            <DollarSign className="mr-2 h-4 w-4" />
                            Creator Earnings
                        </TabsTrigger>
                        <TabsTrigger value="transactions"><Receipt className="mr-2 h-4 w-4" />Transactions</TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab === 'purchase' ? "purchase-content" : activeTab === 'earnings' ? "earnings-content" : "transactions-content"}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabsContent value="purchase" forceMount={true} className={activeTab === "purchase" ? "block" : "hidden"}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Purchase Points</CardTitle>
                                        <p className="text-muted-foreground text-sm">Buy points to send as gifts during livestreams.</p>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {pointPackages.map((pkg) => (
                                            <Card key={pkg.points} className={cn("flex flex-col text-center transition-all", pkg.recommended && "border-primary ring-2 ring-primary shadow-lg shadow-primary/20")}>
                                                <CardHeader>
                                                    <div className="flex justify-center text-primary mb-2">
                                                        {[...Array(pkg.iconCount)].map((_, i) => <Diamond key={i} className="w-6 h-6" fill="currentColor" />)}
                                                    </div>
                                                    <CardTitle className="text-2xl">{pkg.points.toLocaleString()} Pts</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-grow flex flex-col justify-end">
                                                    <p className="text-muted-foreground mb-4">for ${pkg.price}</p>
                                                    <Button onClick={() => handlePurchase(pkg)} className={cn(!pkg.recommended && "btn-secondary-custom")}>
                                                        <ShoppingCart className="mr-2 h-4 w-4" /> Purchase
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="earnings" forceMount={true} className={activeTab === "earnings" ? "block" : "hidden"}>
                                <PayoutConnect />
                            </TabsContent>

                            <TabsContent value="transactions" forceMount={true} className={activeTab === "transactions" ? "block" : "hidden"}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Points Transactions</CardTitle>
                                        <p className="text-muted-foreground text-sm">A complete history of your sent and received points.</p>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Details</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {txItems.length > 0 ? txItems.map((t) => {
                                                    const amount = t.pointsChange || 0;
                                                    const isIn = amount > 0;
                                                    const details =
                                                        t.type === "topup"
                                                            ? `Purchased points (${t?.meta?.pack || ""})`
                                                            : t.type;

                                                    return (
                                                        <TableRow key={t._id}>
                                                            <TableCell className="text-muted-foreground">
                                                                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}
                                                            </TableCell>
                                                            <TableCell>{details}</TableCell>
                                                            <TableCell
                                                                className={cn(
                                                                    "text-right font-semibold flex items-center justify-end gap-1",
                                                                    isIn ? "text-green-400" : "text-red-400"
                                                                )}
                                                            >
                                                                {isIn ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                                                {Math.abs(amount).toLocaleString()} Pts
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center h-24">
                                                            No transactions yet.
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            </div>
        </>
    );
};

export default WalletPage;