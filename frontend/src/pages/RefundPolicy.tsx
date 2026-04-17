import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { links } from '@/config/links';
const RefundPolicy = () => {
const lastUpdated = "March 8, 2026";

  const refundTerms = [
    {
      title: "1. General Policy",
      content: (
        <p>
          We want you to be fully satisfied with your Mewwme Premium experience. However, because Mewwme Premium is a digital service that is delivered immediately upon purchase, we have specific guidelines regarding when refunds can be issued. All sales are considered final unless they fall under our eligible refund conditions.
        </p>
      ),
    },
    {
      title: "2. Eligibility for Refunds",
      content: (
        <>
          <p className="mb-2">You may be eligible for a full or partial refund within <strong>7 days</strong> of your initial purchase if:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You were accidentally charged multiple times for the same subscription (Duplicate Billing).</li>
            <li>The bot experienced significant, prolonged downtime that prevented you from using the Premium features you paid for.</li>
            <li>A core Premium feature is completely broken and our support team is unable to fix it within a reasonable timeframe.</li>
          </ul>
        </>
      ),
    },
    {
      title: "3. Non-Refundable Situations",
      content: (
        <>
          <p className="mb-2">We <strong>do not</strong> issue refunds under the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You simply changed your mind after purchasing.</li>
            <li>You did not read or understand the features included in the Premium tier before buying.</li>
            <li>You or your server was banned or blacklisted from using Mewwme due to a violation of our <a href="/termsofservice" className="text-blue-400 hover:text-blue-300 underline transition-colors">Terms of Service</a>.</li>
            <li>The 7-day refund window has already passed.</li>
          </ul>
        </>
      ),
    },
    {
      title: "4. Subscription Cancellations",
      content: (
        <p>
          You can cancel your Premium subscription at any time through our dashboard or your payment provider. Canceling a subscription prevents future renewals, but it does not automatically refund your current billing cycle. You will continue to have access to Premium features until your current billing period ends. We do not offer partial refunds for unused time in a billing cycle.
        </p>
      ),
    },
    {
      title: "5. Chargebacks and Disputes",
      content: (
        <p>
          If you have an issue with your payment, please contact us first. Initiating a chargeback or payment dispute through your bank, credit card company, or PayPal without contacting our support team first is a violation of our policy. Doing so will result in an immediate and permanent blacklist of your account and your servers from using Mewwme.
        </p>
      ),
    },
    {
      title: "6. How to Request a Refund",
      content: (
        <p>
          To request a refund, please join our official <a href={links.supportServer} className="text-blue-400 hover:text-blue-300 underline transition-colors">Support Server</a> and open a billing or support ticket. Please include your Discord ID, the Server ID where Premium is active, and your transaction/receipt ID to help us process your request faster. Refund processing may take 5-10 business days depending on your payment provider.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <div className="h-20 lg:h-24" />
      <main className="flex-1">
        <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white">
                  Refund Policy
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Information regarding our premium subscriptions, cancellations, and refunds.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Last updated: {lastUpdated}
              </p>
            </motion.div>

            {/* Content Sections */}
            <div className="space-y-8">
              {refundTerms.map((term, index) => (
                <motion.div
                  key={term.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.5) }}
                  className="glass-card rounded-2xl p-6 sm:p-8"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {term.title}
                  </h2>
                  <div className="text-muted-foreground leading-relaxed">
                    {term.content}
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicy;