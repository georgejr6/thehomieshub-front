import React from 'react';
import { Helmet } from 'react-helmet';
import { CreditCard } from 'lucide-react';
import BillingSection from '@/components/Billing/BillingSection';

/**
 * Dedicated, linkable billing page (/billing). Wraps the existing BillingSection
 * — connected plan + Stripe info, Manage/Cancel via the Stripe billing portal,
 * and the "connect your membership" flow — so billing has a clear home that the
 * landing page, memberships page, header, and the connect banner can all link to.
 */
const BillingPage = () => {
  return (
    <>
      <Helmet>
        <title>Billing & Membership — The Homies Hub</title>
        <meta name="description" content="Manage your membership, payment method, invoices, and cancellations." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight">Billing &amp; Membership</h1>
        </div>
        <BillingSection />
      </div>
    </>
  );
};

export default BillingPage;
