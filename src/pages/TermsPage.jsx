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

            <Section number="12" title="Data We Collect, How We Use It, and Who Sees It">
              <p className="font-medium text-foreground/80">
                By creating an account and using The Homies Hub, you acknowledge and consent to the collection,
                storage, and processing of the data described below. Please read this section carefully and in full.
              </p>
              <p className="font-semibold text-foreground mt-3">What we collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identity &amp; contact:</strong> your email address, username, and display name; and if you sign in with Discord, your Discord user ID, username, avatar, and the email tied to your Discord account.</li>
                <li><strong>Network &amp; location:</strong> your IP address(es) each time you visit or log in, and the approximate geographic location (city, region, country) and internet service provider derived from those IP addresses.</li>
                <li><strong>Device &amp; session:</strong> your browser and user-agent, device identifiers, session identifiers, and the dates and times you log in and use the app.</li>
                <li><strong>Behavioral &amp; usage:</strong> the pages you visit and how long you spend on each; the videos and reels you watch and for how long; content you save, share, like, or comment on; music you play; searches you run; and other actions you take across the platform.</li>
                <li><strong>Social graph:</strong> the accounts you follow and who follows you, and any social-media handles or links you choose to connect to your profile.</li>
                <li><strong>Payment:</strong> your subscription status, tier, and billing metadata processed through our payment provider (Stripe). We do not store your full card number.</li>
                <li><strong>Communications:</strong> messages you exchange with our team, our support channels, and our automated bots — including automated direct messages on Discord — which may be logged and stored.</li>
              </ul>
              <p className="font-semibold text-foreground mt-3">How we use it:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>To operate, secure, personalize, and improve the platform and recommend content to you.</li>
                <li>To detect, prevent, and act on fraud, spam, ban evasion, and duplicate or bad-faith accounts — including correlating IP addresses and device identifiers to identify linked accounts.</li>
                <li>To communicate with you about your membership, verification, offers, reminders, and updates by email and on Discord.</li>
                <li>To measure engagement and analytics so we can improve the community.</li>
              </ul>
              <p className="font-semibold text-foreground mt-3">Who can see this data:</p>
              <p>
                Your behavioral, network, location, device, and account data is visible <strong>only to The Homies Hub team and administrators</strong>. We do <strong>not</strong> sell your personal data, and we do <strong>not</strong> expose it to other members or the public — with one exception: any social-media handles or links you connect become visible to other users <strong>only if you explicitly set them to public</strong> in your settings. We may use aggregate, anonymized statistics internally.
              </p>
              <p className="mt-3">
                We retain this data while your account is active and as needed to run the service, comply with the law, resolve disputes, and enforce our agreements. You may request access to or deletion of your data by contacting us. By creating an account and continuing to use the platform, you consent to the collection and use of your data as described in this section.
              </p>
            </Section>

            <Section number="13" title="Contact">
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
