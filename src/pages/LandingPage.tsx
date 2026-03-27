import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mic,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  Cpu,
  Brain,
  CheckCircle2,
  Sparkles,
  Heart,
  Zap,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: Mic,
    title: 'Speak Naturally',
    description: 'Describe your health concern by voice. No forms, no typing, no medical jargon required.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Cpu,
    title: 'Multi-Agent Reasoning',
    description: 'Six specialized AI agents work in parallel — extracting, researching, and verifying your case.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Safety Verified',
    description: 'An independent verification agent checks every output for safety, consistency, and red flags.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Stethoscope,
    title: 'Find the Right Doctor',
    description: 'Matched to the right specialist based on your symptoms. Book directly from the app.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

const agentSteps = [
  { name: 'Voice Intake', status: 'completed' },
  { name: 'Symptom Analysis', status: 'completed' },
  { name: 'Research Agent', status: 'completed' },
  { name: 'Verification', status: 'verified' },
  { name: 'Doctor Match', status: 'completed' },
  { name: 'Booking Ready', status: 'completed' },
];

const sponsors = [
  'AWS', 'Auth0', 'Bland AI', 'Aerospike', 'TrueFoundry', 'Airbyte', 'Overmind', 'Kiro',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <motion.nav
        className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Heart className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">CareGuide AI</h1>
            <p className="text-[10px] text-muted-foreground leading-none">Verified Voice Agents</p>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-full px-5 text-xs font-semibold gap-1.5"
          onClick={() => navigate('/app')}
        >
          Launch App
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-20 pb-28 max-w-6xl mx-auto">
        {/* Background gradient orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto">
          <motion.div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Medical Navigation
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
          >
            Not just suggestions.{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Verified AI agents
            </span>{' '}
            that take action.
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
          >
            Speak your health concern. Multiple AI agents listen, reason, verify, and connect you
            with the right doctor — instantly.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
          >
            <Button
              size="lg"
              className="rounded-full px-8 text-sm font-semibold gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              onClick={() => navigate('/app')}
            >
              <Mic className="w-4 h-4" />
              Get Started — It's Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6 text-sm font-semibold"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How It Works
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="flex items-center justify-center gap-5 mt-10 text-muted-foreground"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
          >
            <span className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              Safety Verified
            </span>
            <span className="text-border">│</span>
            <span className="flex items-center gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5" />
              No Data Stored
            </span>
            <span className="text-border">│</span>
            <span className="flex items-center gap-1.5 text-xs">
              <Brain className="w-3.5 h-3.5" />
              6 AI Agents
            </span>
          </motion.div>
        </div>
      </section>

      {/* Agent Pipeline Teaser */}
      <section id="how-it-works" className="px-6 md:px-12 py-20 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Six agents. One verified answer.
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Each concern passes through a full multi-agent pipeline — extraction, research,
              verification, matching, and booking — before you see results.
            </p>
          </motion.div>

          {/* Agent rail preview */}
          <div className="space-y-2 max-w-lg mx-auto">
            {agentSteps.map((step, i) => (
              <motion.div
                key={step.name}
                className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-card border border-border/60"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <CheckCircle2
                  className={`w-4 h-4 flex-shrink-0 ${
                    step.status === 'verified' ? 'text-accent' : 'text-primary'
                  }`}
                />
                <span className="text-sm font-medium text-foreground flex-1">{step.name}</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      step.status === 'verified' ? 'bg-accent/60' : 'bg-primary/50'
                    }`}
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium w-16 text-right ${
                    step.status === 'verified' ? 'text-accent' : 'text-primary'
                  }`}
                >
                  {step.status === 'verified' ? 'Verified' : 'Done'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Designed for clarity, not complexity
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            CareGuide AI helps you navigate the healthcare system with confidence — from voice
            to doctor in under a minute.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="rounded-2xl bg-card border border-border/60 p-6 hover:shadow-lg hover:border-border transition-all duration-300"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
            >
              <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                <feat.icon className={`w-5 h-5 ${feat.color}`} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Three-Step Flow */}
      <section className="px-6 md:px-12 py-20 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Three steps to the right doctor
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Listen', desc: 'Speak your concern into the mic. Our AI transcribes and understands instantly.', icon: Mic, color: 'text-blue-500' },
              { step: '02', title: 'Reason', desc: 'Multiple agents analyze symptoms, research pathways, and verify safety.', icon: Brain, color: 'text-violet-500' },
              { step: '03', title: 'Act', desc: 'See your summary, structured table, and matched doctors. Book in one click.', icon: Zap, color: 'text-emerald-500' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-card border border-border/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <p className="text-xs font-semibold text-primary mb-1">Step {item.step}</p>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor Section */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
            Built with sponsor technologies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {sponsors.map((name) => (
              <span key={name} className="text-sm font-semibold text-muted-foreground/60 hover:text-foreground transition-colors">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 py-20">
        <motion.div
          className="max-w-2xl mx-auto text-center rounded-3xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/60 p-12"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to try CareGuide AI?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            No sign-up required. Speak your concern, see verified results, and find the right
            doctor in under 60 seconds.
          </p>
          <Button
            size="lg"
            className="rounded-full px-10 text-sm font-semibold gap-2 shadow-lg shadow-primary/25"
            onClick={() => navigate('/app')}
          >
            <Mic className="w-4 h-4" />
            Start Now
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 md:px-12 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">CareGuide AI</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center max-w-lg">
            CareGuide AI provides navigation and support information and is not a substitute for
            professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </footer>
    </div>
  );
}
