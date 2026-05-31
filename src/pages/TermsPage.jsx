import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

const Section = ({ number, title, children }) => (
  <section>
    <h3 className="text-foreground font-semibold text-lg flex items-start gap-2">
      <span className="text-primary">{number}.</span> {title}
    </h3>
    <div className="mt-2 space-y-2">{children}</div>
  </section>
);

const TermsPage = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Helmet>
        <title>Terms of Service | The Homies Hub</title>
        <meta name="description" content="Terms of Service for The Homies Hub platform." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2 text-primary">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last Updated: April 2026</p>

      <div className="space-y-6">
        {/* Access Control Section — highlighted */}
        <Card className="bg-card/80 border-primary/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              Access Control, Verification, and Refund Policy
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              By subscribing to The Homies Hub, you acknowledge and agree to the following access terms:
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <Section number="1" title="Limited Access Based on User Behavior">
              <p>
                The Homies Hub reserves the right to restrict, limit, or revoke access to specific content,
                community features, or membership benefits (including Discord tiers) at any time for any reason,
                without notice. This includes but is not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Users flagged internally or externally for misconduct or abusive behavior</li>
                <li>
                  Subscriptions from accounts using email addresses or identifiers previously associated
                  with platform abuse, harassment, or content reporting
                </li>
                <li>
                  Subscriptions suspected of violating our community standards, privacy policies, or intended use
                </li>
              </ul>
              <p className="font-medium text-foreground/80">
                Flagged users will not be entitled to refunds even if full access is withheld or delayed.
              </p>
            </Section>

            <Section number="2" title="Mandatory Verification">
              <p>
                To access premium content or special community areas (such as private Discord tiers), users may
                be required to complete an identity verification process, including a live video call at the sole
                discretion of The Homies Hub team.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verification is not guaranteed and may be denied or delayed at any time.</li>
                <li>Verification does not guarantee access if other risk factors are present.</li>
                <li>
                  Failure or refusal to complete verification when requested may result in limited or suspended
                  access without refund.
                </li>
              </ul>
            </Section>

            <Section number="3" title="Refunds and Subscription Cancellations">
              <p>
                All subscriptions are final and non-refundable unless explicitly authorized by The Homies Hub.
                We do not offer refunds for:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Early cancellations by the subscriber</li>
                <li>Limited access due to flagged behavior or incomplete verification</li>
                <li>
                  Dissatisfaction resulting from access restrictions, discretion-based content moderation,
                  or community tier reassignments
                </li>
              </ul>
            </Section>

            <Section number="4" title="Platform Discretion">
              <p>
                The Homies Hub is a private platform. Access to content is a privilege, not a guaranteed right.
                We reserve the full right to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Monitor subscription activity</li>
                <li>Restrict visibility of posts or videos</li>
                <li>Require further authentication</li>
                <li>Terminate or adjust access for any account at any time based on internal risk reviews</li>
              </ul>
              <p className="font-medium text-foreground/80 border-l-2 border-primary/50 pl-3 mt-3">
                By subscribing, you accept these terms and waive the right to dispute transactions arising
                from account restrictions or moderation actions.
              </p>
            </Section>
          </CardContent>
        </Card>

        {/* General Terms */}
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle>General Terms of Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <Section number="5" title="Eligibility">
              <p>
                You must be at least 18 years of age to use The Homies Hub. By creating an account, you
                warrant that you are 18 years or older and have the legal capacity to enter into this agreement.
              </p>
            </Section>

            <Section number="6" title="Account Responsibilities">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree
                to notify us immediately of any unauthorized use of your account. You are responsible for all
                activities that occur under your account.
              </p>
            </Section>

            <Section number="7" title="Content Ownership & Licensing">
              <p>
                You retain ownership of the content you upload. By posting content, you grant The Homies Hub a
                non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on
                the platform.
              </p>
            </Section>

            <Section number="8" title="Prohibited Content & Behavior">
              <p>
                Users may not upload content that is illegal, promotes hate speech, or violates intellectual
                property rights. Harassment, bullying, and impersonation are strictly prohibited.
              </p>
            </Section>

            <Section number="9" title="NSFW Content Rules">
              <p>NSFW content is permitted only in designated areas and must be correctly tagged. The following are strictly prohibited:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Child sexual abuse material (CSAM)</li>
                <li>Non-consensual sexual content (revenge porn)</li>
                <li>Content depicting sexual violence or exploitation</li>
              </ul>
            </Section>

            <Section number="10" title="Enforcement & Termination">
              <p>
                We reserve the right to remove content and suspend or terminate accounts that violate these
                terms without prior notice. Serious violations will be reported to law enforcement.
              </p>
            </Section>

            <Section number="11" title="Limitation of Liability">
              <p>
                The Homies Hub is provided "as is". We are not liable for any indirect, incidental, or
                consequential damages arising from your use of the service.
              </p>
            </Section>

            <Section number="12" title="Contact">
              <p>
                For legal inquiries, please contact{' '}
                <a href="mailto:contact@thehomieshub.com" className="text-primary hover:underline">
                  contact@thehomieshub.com
                </a>.
              </p>
            </Section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsPage;
