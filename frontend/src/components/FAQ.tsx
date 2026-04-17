import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: 'What is Mewwme?',
    answer: (
      <>
        A Discord music bot on the <strong>Somnia Testnet</strong>. You bind
        your wallet, buy premium with STT tokens, tip servers on-chain, and
        browse guilds on the community page. Login with Discord, bind a wallet,
        and you&apos;re set. Need STT? Grab some from the faucet at
        testnet.somnia.network.
      </>
    ),
  },
  {
    question: 'How does wallet binding work?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Go to <strong>/profile</strong>, connect MetaMask or OKX Wallet on
          Somnia Testnet, and sign a verification message. That links your
          wallet to your Discord account. No tokens moved, no approvals.
        </p>
        <p>
          One wallet per account. You can change it on the same page, but
          there is a <strong>7-day cooldown</strong> between changes.
        </p>
      </div>
    ),
  },
  {
    question: 'How does Premium work?',
    answer: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Pay with STT on-chain. Each plan gives you server slots for{' '}
          <strong>30 days</strong>. Plans stack, so buying two adds up.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="font-bold text-pink-400 mb-1">Guild Basic</p>
            <p className="text-lg font-bold text-white">3 STT</p>
            <p className="text-xs text-white/40">1 server</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="font-bold text-pink-400 mb-1">Guild Plus</p>
            <p className="text-lg font-bold text-white">7 STT</p>
            <p className="text-xs text-white/40">3 servers</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="font-bold text-pink-400 mb-1">Guild Pro</p>
            <p className="text-lg font-bold text-white">10 STT</p>
            <p className="text-xs text-white/40">5 servers</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    question: 'How do I activate Premium on my server?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <ol className="ml-5 list-decimal space-y-2">
          <li>Bind your wallet on <strong>/profile</strong>.</li>
          <li>Go to <strong>/premium</strong>, pick a plan, pay on-chain.</li>
          <li>
            In your Discord server, run{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-pink-400 font-bold text-xs">
              /premium claim
            </code>
          </li>
        </ol>
        <p className="text-xs italic">
          To move it, run{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-pink-400 font-bold text-xs">
            /premium unclaim
          </code>{' '}
          first, then claim on the new server.
        </p>
      </div>
    ),
  },
  {
    question: 'How does tipping work?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Guild owners can deploy a <strong>tip jar contract</strong> from the
          dashboard. Once deployed, anyone can send STT to it from the{' '}
          <strong>/community</strong> page with an optional message (max 120
          characters).
        </p>
        <p>
          The guild owner claims tips from the dashboard. A{' '}
          <strong>1.5% fee</strong> is taken on claim. Everything is on-chain.
        </p>
      </div>
    ),
  },
  {
    question: 'What is the Community page?',
    answer: (
      <>
        The <strong>/community</strong> page lists all guilds with a tip jar.
        Search by name, sort by popularity or newest, and see donation counts.
        Premium guilds have a blue checkmark. Click any guild to tip or view
        details.
      </>
    ),
  },
]

const FAQ = () => {
  return (
    <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Everything <span className="text-mewwme">Explained</span></h2>
          <p className="text-muted-foreground">Got questions? We've got answers</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-card rounded-2xl border border-white/10 px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-foreground font-medium text-left hover:no-underline py-5 text-sm sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
