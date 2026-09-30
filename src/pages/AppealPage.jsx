import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

// Where a banned account's "Appeal the ban" goes (backend banGate appealUrl).
// Reachable while banned (BannedScreen steps aside on this path).
const AppealPage = () => (
  <div className="container mx-auto max-w-2xl px-4 py-10 text-foreground">
    <Helmet>
      <title>Appeal a ban | The Homies Hub</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <h1 className="mb-2 text-3xl font-bold">Appeal a ban</h1>
    <p className="mb-6 text-sm text-muted-foreground">Every appeal is read by a person.</p>
    <ol className="list-decimal space-y-3 pl-6 text-muted-foreground">
      <li>Email our support team from the address on your account (the contact is on the <Link to="/support" className="text-primary underline">Support page</Link>).</li>
      <li>Include your @username and why you think the ban should be lifted.</li>
      <li>We reply within a few days. Please send one appeal — duplicates don't speed it up.</li>
    </ol>
  </div>
);

export default AppealPage;
