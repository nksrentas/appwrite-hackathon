import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle, Scale } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Terms of Service - EcoTrace' },
    { name: 'description', content: 'Terms and conditions for using EcoTrace services.' },
  ];
};

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="px-6 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Please read these terms carefully before using EcoTrace
            </p>
            <p className="text-sm text-muted-foreground">Effective Date: December 1, 2025</p>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                By using EcoTrace ("the Service"), you agree to these Terms of Service ("Terms"). If
                you disagree with any part of these terms, please do not use our Service.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>1. Acceptance of Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>
                    By accessing or using EcoTrace, you agree to be bound by these Terms and our
                    Privacy Policy. These Terms apply to all visitors, users, and others who access
                    or use the Service.
                  </p>
                  <p>
                    You must be at least 13 years old to use this Service. By using the Service, you
                    represent and warrant that you are at least 13 years of age.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>2. Description of Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>
                    EcoTrace provides carbon footprint tracking and analytics for software
                    development activities. The Service includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Integration with GitHub and other development platforms</li>
                    <li>Real-time carbon emission calculations</li>
                    <li>Analytics and reporting features</li>
                    <li>Team collaboration tools</li>
                    <li>Educational resources and recommendations</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>3. User Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>To use certain features of the Service, you must:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Create an account using GitHub OAuth</li>
                    <li>Provide accurate and complete information</li>
                    <li>Maintain the security of your account</li>
                    <li>Promptly notify us of any unauthorized use</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>
                  <p className="mt-3">
                    We reserve the right to refuse service, terminate accounts, or remove content at
                    our sole discretion.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>4. Acceptable Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">You May:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Use the Service for personal or commercial purposes</li>
                          <li>Share aggregated data and insights</li>
                          <li>Integrate the Service with your development workflow</li>
                          <li>Provide feedback and suggestions</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">You May Not:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Violate any laws or regulations</li>
                          <li>Infringe on intellectual property rights</li>
                          <li>Transmit malware or harmful code</li>
                          <li>Attempt to gain unauthorized access</li>
                          <li>Interfere with the Service's operation</li>
                          <li>Scrape or harvest data without permission</li>
                          <li>Misrepresent emission data or calculations</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>5. Intellectual Property</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>
                    The Service and its original content, features, and functionality are owned by
                    EcoTrace and are protected by international copyright, trademark, patent, trade
                    secret, and other intellectual property laws.
                  </p>
                  <p>
                    Our open-source components are licensed under the MIT License. You may use,
                    modify, and distribute these components according to the license terms.
                  </p>
                  <p>
                    Your data remains your property. By using the Service, you grant us a license to
                    process and display your data as necessary to provide the Service.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>6. Disclaimers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="font-semibold mb-2">Important:</p>
                    <p>
                      Carbon emission calculations are estimates based on available data and
                      research. Actual emissions may vary. The Service is provided "as is" without
                      warranties of any kind.
                    </p>
                  </div>
                  <p>We do not warrant that:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>The Service will be uninterrupted or error-free</li>
                    <li>Calculations are 100% accurate</li>
                    <li>The Service will meet your specific requirements</li>
                    <li>Data will be preserved without loss</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>7. Limitation of Liability</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p>
                    To the maximum extent permitted by law, EcoTrace shall not be liable for any
                    indirect, incidental, special, consequential, or punitive damages, including
                    loss of profits, data, use, or goodwill, arising from your use of the Service.
                  </p>
                  <p className="mt-3">
                    Our total liability shall not exceed the amount you have paid us in the twelve
                    months preceding the claim, or $100 if you haven't made any payments.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>8. Indemnification</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p>
                    You agree to indemnify and hold harmless EcoTrace, its affiliates, and their
                    respective officers, directors, employees, and agents from any claims, damages,
                    losses, liabilities, costs, and expenses arising from your use of the Service or
                    violation of these Terms.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>9. Modifications to Service and Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>
                    We reserve the right to modify or discontinue the Service at any time, with or
                    without notice. We shall not be liable to you or any third party for any
                    modification, suspension, or discontinuance of the Service.
                  </p>
                  <p>
                    We may revise these Terms from time to time. Material changes will be notified
                    via email or prominent notice on the Service. Continued use after changes
                    constitutes acceptance of the revised Terms.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>10. Termination</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>
                    You may terminate your account at any time through the account settings or by
                    contacting us.
                  </p>
                  <p>
                    We may terminate or suspend your account immediately, without prior notice, for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Breach of these Terms</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Extended period of inactivity</li>
                    <li>Request by law enforcement</li>
                  </ul>
                  <p className="mt-3">
                    Upon termination, your right to use the Service will cease immediately. We may
                    retain certain data as required by law or for legitimate business purposes.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>11. Governing Law</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p>
                    These Terms shall be governed by and construed in accordance with the laws of
                    the United States and the State of California, without regard to its conflict of
                    law provisions.
                  </p>
                  <p className="mt-3">
                    Any disputes arising from these Terms or the Service shall be resolved through
                    binding arbitration in San Francisco, California, except where prohibited by
                    law.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>12. Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p className="mb-3">For questions about these Terms, please contact us at:</p>
                  <div className="space-y-2">
                    <p>Email: legal@ecotrace.dev</p>
                    <p>
                      GitHub:{' '}
                      <a
                        href="https://github.com/nksrentas/appwrite-hackathon"
                        className="text-primary hover:underline"
                      >
                        @nksrentas/appwrite-hackathon
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>13. Entire Agreement</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p>
                    These Terms, together with our Privacy Policy, constitute the entire agreement
                    between you and EcoTrace regarding the use of the Service, superseding any prior
                    agreements.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
