import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LinkWrapper } from '@/components/link-wrapper';
import { links } from '@/config/links';

const faqs = [
  {
    question: 'What is Mewwme?',
    answer: (
      <>
        Mewwme is a Discord music bot with Web3 integration on the Somnia Network.
        It offers high-quality audio playback, a clean user interface, and allows
        communities to receive tips using native STT tokens all recorded on-chain.
      </>
    ),
  },
  {
    question: 'How do I add Mewwme to my server?',
    answer: (
      <>
        You can add Mewwme to your server by clicking{' '}
        <LinkWrapper href={links.botInvite}>here</LinkWrapper>.<br />
        <em>
          NOTE: Mewwme requires <code>Administrator</code> permission to function
          properly. Without it, some features may not work correctly.
        </em>
      </>
    ),
  },
  {
    question: 'How does the tipping system work?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Each server can deploy its own tip contract on the Somnia Network.
          Anyone can send STT tokens as tips to support the server. Here&apos;s how it works:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Server owners deploy a tip contract from the Dashboard.</li>
          <li>Users send tips with native STT tokens no ERC-20 approval needed.</li>
          <li>All tips are recorded on-chain, transparent and verifiable.</li>
          <li>New tips appear in real-time via Somnia Reactivity.</li>
          <li>Server owners can claim accumulated tips from the Dashboard.</li>
        </ul>
        <p className="text-sm">
          You can also tip servers you discover on the{' '}
          <LinkWrapper href="/community" className="text-mewwme font-semibold hover:underline">Community</LinkWrapper> page
        no need to be a member.
        </p>
      </div>
    ),
  },
  {
    question: 'How to get Premium?',
    answer: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Subscribe with native STT on the Somnia Network.
          Visit the <LinkWrapper href="/premium" className="text-mewwme font-semibold hover:underline">Premium page</LinkWrapper> to
          choose your tier:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-800 bg-gray-800/20 p-4 text-center">
            <p className="font-bold text-mewwme mb-1">Guild Basic</p>
            <p className="text-lg font-bold text-foreground">2 STT<span className="text-xs text-muted-foreground">/mo</span></p>
            <p className="text-xs mt-1">1 server</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-800/20 p-4 text-center">
            <p className="font-bold text-mewwme mb-1">Guild Plus</p>
            <p className="text-lg font-bold text-foreground">3 STT<span className="text-xs text-muted-foreground">/mo</span></p>
            <p className="text-xs mt-1">3 servers</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-800/20 p-4 text-center">
            <p className="font-bold text-mewwme mb-1">Guild Pro</p>
            <p className="text-lg font-bold text-foreground">5 STT<span className="text-xs text-muted-foreground">/mo</span></p>
            <p className="text-xs mt-1">5 servers</p>
          </div>
        </div>
        <p className="text-sm">
          Payment is in native STT (no token approval needed). Your subscription quota stacks
          if you purchase multiple plans.
        </p>
        <LinkWrapper
          href="/premium"
          className="text-xs font-bold py-2 px-4 bg-mewwme text-white rounded-lg hover:opacity-80 transition-all inline-block"
        >
          Go to Premium Page
        </LinkWrapper>
      </div>
    ),
  },
  {
    question: 'How do I set up my wallet?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Mewwme uses Privy for wallet management you don&apos;t need to install
          MetaMask or any browser extension.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Login with your Discord account.</li>
          <li>Privy automatically creates an embedded wallet for you.</li>
          <li>Your wallet works on the Somnia Network for tips and premium subscriptions.</li>
          <li>You can view your wallet address in your Profile page.</li>
        </ul>
      </div>
    ),
  },
  {
    question: 'Can I transfer premium to another server?',
    answer: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Yes, you can transfer premium to another server:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Go to your <strong>Profile &rarr; Activated</strong> tab and click{' '}
            <strong>Deactivate</strong> on the current server.
          </li>
          <li>
            Select the new server from the dropdown and click{' '}
            <strong>Activate</strong>. Your remaining duration continues automatically.
          </li>
        </ul>
        <p className="text-sm italic">
          If you encounter issues, contact our staff in the{' '}
          <LinkWrapper href={links.supportServer}>Support Server</LinkWrapper>.
        </p>
      </div>
    ),
  },
  {
    question: 'What is Somnia Network?',
    answer: (
      <div className="space-y-3 text-muted-foreground">
        <p>
          Somnia is a high-performance EVM blockchain with sub-second block times.
          Mewwme uses Somnia for:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Premium subscriptions</strong> pay with native STT tokens.</li>
          <li><strong>Tip contracts</strong> each server has its own on-chain tip jar.</li>
          <li><strong>Reactivity</strong> native WebSocket pub/sub for real-time on-chain events.</li>
        </ul>
        <p className="text-sm">
          All transactions are verifiable on{' '}
          <LinkWrapper href="https://shannon-explorer.somnia.network">Shannon Explorer</LinkWrapper>.
        </p>
      </div>
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
