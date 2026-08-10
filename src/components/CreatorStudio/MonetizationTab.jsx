import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, DollarSign, TrendingUp, ShoppingBag, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/api/homieshub';
import PayoutConnect from './PayoutConnect';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const MonetizationTab = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data } = await api.get('/marketplace/dashboard');
                if (alive) setStats(data?.result?.stats || null);
            } catch { /* not fatal */ } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    if (user?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/30 rounded-lg bg-muted/10 mt-4">
                <ShieldCheck className="h-16 w-16 text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">Admin Access Detected</h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                    You're logged in as an Administrator. Manage creator payouts and content from the Admin Panel.
                </p>
                <Button asChild size="lg" className="gap-2">
                    <Link to="/admin/monetization"><ShieldCheck className="w-4 h-4" /> Go to Admin Panel</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto mt-4 space-y-6">
            {/* Earnings snapshot */}
            <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Total earned</CardDescription>
                        <CardTitle className="text-2xl">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : usd(stats?.totalEarnedCents)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Awaiting payout</CardDescription>
                        <CardTitle className="text-2xl">{loading ? '—' : usd(stats?.pendingPayoutCents)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Sales</CardDescription>
                        <CardTitle className="text-2xl">{loading ? '—' : (stats?.salesCount || 0)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* The real Stripe Connect onboarding stepper */}
            <PayoutConnect />

            {/* What to sell next */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Start earning</CardTitle>
                    <CardDescription>Once payouts are connected, list something to sell.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Link to="/creator-studio?tab=trips" className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary/50 transition-colors">
                        <MapPin className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Sell a trip guide</p>
                            <p className="text-xs text-muted-foreground">Turn a place you've been into income.</p>
                        </div>
                    </Link>
                    <Link to="/creator-studio?tab=store" className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary/50 transition-colors">
                        <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Open your store</p>
                            <p className="text-xs text-muted-foreground">Sell digital or physical products.</p>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};

export default MonetizationTab;
