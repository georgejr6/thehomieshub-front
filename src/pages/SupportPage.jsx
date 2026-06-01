import React from 'react';
import { Helmet } from 'react-helmet';

const SupportPage = () => {
  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl text-foreground">
      <Helmet>
        <title>Support | The Homies Hub</title>
        <meta name="description" content="Get help and support for The Homies Hub." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-muted-foreground mb-8 text-sm">We're here to help.</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">
          For any issues, questions, or feedback about The Homies Hub, reach out to us directly:
        </p>
        <p className="mt-3 font-medium">george@novam.us</p>
        <p className="text-muted-foreground text-sm mt-1">We typically respond within 24 hours.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Account Issues</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li><strong>Can't log in:</strong> Use the "Forgot Password" option on the login screen to reset your password.</li>
          <li><strong>Delete your account:</strong> Go to Settings → Account → Delete Account inside the app, or visit <a href="/settings/account" className="underline text-primary">thehomies.app/settings/account</a>.</li>
          <li><strong>Update your profile:</strong> Go to Settings → Edit Profile in the app.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Reporting Content</h2>
        <p className="text-muted-foreground leading-relaxed">
          To report a post, reel, or user, tap the three-dot menu or flag icon on the content and select "Report."
          Our team reviews all reports promptly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Memberships & Billing</h2>
        <p className="text-muted-foreground leading-relaxed">
          Memberships and point purchases are managed at <a href="/memberships" className="underline text-primary">thehomies.app/memberships</a>.
          For billing questions or refund requests, email us at george@novam.us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Community Guidelines</h2>
        <p className="text-muted-foreground leading-relaxed">
          Read our <a href="/community-guidelines" className="underline text-primary">Community Guidelines</a> and <a href="/child-safety" className="underline text-primary">Child Safety Standards</a> to understand what's allowed on the platform.
        </p>
      </section>
    </div>
  );
};

export default SupportPage;
