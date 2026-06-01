import React from 'react';
import { Helmet } from 'react-helmet';

const ChildSafetyPage = () => {
  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl text-foreground">
      <Helmet>
        <title>Child Safety Standards | The Homies Hub</title>
        <meta name="description" content="The Homies Hub child safety standards and CSAE prevention policy." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2">Child Safety Standards</h1>
      <p className="text-muted-foreground mb-8 text-sm">Last updated: June 1, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Homies Hub has a zero-tolerance policy for child sexual abuse and exploitation (CSAE) in any form.
          We are committed to maintaining a safe platform and actively work to prevent, detect, and remove any
          content that sexualizes or exploits minors. Any user found to be engaging in such behavior will be
          immediately banned and reported to the relevant authorities.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Prohibited Content</h2>
        <p className="text-muted-foreground mb-3 leading-relaxed">The following content is strictly prohibited on The Homies Hub:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>Child Sexual Abuse Material (CSAM) of any kind</li>
          <li>Any content that sexually exploits, sexualizes, or endangers minors</li>
          <li>Grooming, solicitation, or trafficking of minors</li>
          <li>Any depiction — real, illustrated, or AI-generated — of minors in a sexual context</li>
          <li>Sharing, distributing, or linking to any of the above</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Detection & Enforcement</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Homies Hub provides in-app reporting tools that allow any user to flag content or accounts for
          review. Reports are reviewed promptly. Violations result in immediate account suspension, content
          removal, and where required by law, reporting to the National Center for Missing &amp; Exploited
          Children (NCMEC) and other relevant national or regional authorities.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Reporting a Concern</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you encounter any content on The Homies Hub that you believe violates these standards, please
          use the in-app Report button on the relevant post, reel, or profile. You may also contact us
          directly at:
        </p>
        <p className="mt-3 font-medium">george@novam.us</p>
        <p className="text-muted-foreground text-sm mt-1">
          We take all reports seriously and respond as quickly as possible.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Legal Compliance</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Homies Hub complies with all applicable child safety laws, including the PROTECT Our Children
          Act. We report apparent violations of federal child pornography laws to NCMEC's CyberTipline as
          required by 18 U.S.C. § 2258A.
        </p>
      </section>
    </div>
  );
};

export default ChildSafetyPage;
