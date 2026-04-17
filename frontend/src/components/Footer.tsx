import { FaDiscord, FaGithub, FaEnvelope } from 'react-icons/fa';
import { links } from '@/config/links';
const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    QuickLinks: [
      { name: 'Home', href: '/' },
      { name: 'Premium', href: '/premium' },
      { name: 'Commands', href: '/commands' },
      { name: 'Meet The Team', href: '/team' },
    ],
    Support: [
      { name: 'Invite App', href: links.botInvite },
      { name: 'Support Server', href: links.supportServer },
      { name: 'Vote on Top.gg', href: links.topgg},
      { name: 'System Status', href: '/systemstatus'},
    ],
    Legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/termsofservice' },
      { name: 'Refund Policy', href: '/refundpolicy' },
      { name: 'Documentation', href: links.documentation },
    ],
  };

  return (
    <footer className="glass-card relative z-10 overflow-hidden border-t border-white/5 bg-card py-12 px-4 sm:px-6">
      {/* Watermark text behind footer content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden items-center justify-center xl:flex"
      >
        <span
          className="footer-watermark-bottom-fade select-none text-[18vw] font-black tracking-[0.2em] sm:text-[14vw]"
          style={{ color: "#FF69B4", opacity: 0.2 }}
        >
          MEWWME
        </span>
      </div>

      {/* Bottom gradient fade so footer blends smoothly into page background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-96 bg-gradient-to-b from-transparent via-black/60 to-[#0e141a]"
      />

      <div className="relative z-[2] max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 mb-12">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <img src="/assets/mewwme.gif" alt="Mewwme Logo" className="h-8 w-8 rounded-full" />
              <span className="text-xl font-bold text-foreground">Mewwme</span>
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Those who wish to sing, always find a song ♪
            </p>
            <div className="flex gap-4">
              <a href={links.github} className="text-muted-foreground hover:text-foreground transition-colors"><FaGithub size={20} /></a>
              <a href={links.supportServer} className="text-muted-foreground hover:text-foreground transition-colors"><FaDiscord size={20} /></a>
              <a href={links.email} className="text-muted-foreground hover:text-foreground transition-colors"><FaEnvelope size={20} /></a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© {currentYear} Mewwme. All rights reserved.</span>
            <span className="hidden md:inline">•</span>
            <span>Made with <span className="animate-pulse text-red-500">♥</span> by <a href={links.developer} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">L RMN</a></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            All systems operational
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;
