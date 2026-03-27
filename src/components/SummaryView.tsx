import { motion } from 'framer-motion';
import { SummaryData } from '@/types/care-guide';
import { MessageSquare, Lightbulb, ArrowRight, AlertCircle, ShieldCheck, Phone } from 'lucide-react';

interface SummaryViewProps {
  data: SummaryData;
  isEmergency: boolean;
}

const sectionVariant = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

export function SummaryView({ data, isEmergency }: SummaryViewProps) {
  const sections = [
    { icon: MessageSquare, title: 'What you said', content: data.whatYouSaid, color: 'text-primary' },
    { icon: Lightbulb, title: 'What this may indicate', content: data.whatThisMayIndicate, color: 'text-foreground' },
    { icon: ArrowRight, title: 'Recommended next step', content: data.recommendedNextStep, color: 'text-accent' },
    { icon: AlertCircle, title: 'When to seek urgent care', content: data.whenToSeekUrgentCare, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      {isEmergency && (
        <motion.div
          className="rounded-xl bg-destructive/10 border-2 border-destructive/30 p-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-bold text-destructive">
                ⚠ Urgent: This may require immediate medical attention
              </p>
              <p className="text-xs text-destructive/80">
                Based on the symptoms described, we recommend seeking emergency care immediately.
              </p>
              <div className="flex gap-2 mt-3">
                <a
                  href="tel:911"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call 911
                </a>
                <a
                  href="https://www.google.com/maps/search/emergency+room+near+me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold hover:bg-destructive/30 transition-colors"
                >
                  Find Nearest ER
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          className="rounded-xl bg-card border border-border p-4"
          variants={sectionVariant}
          initial="hidden"
          animate="show"
          custom={i}
        >
          <div className="flex items-center gap-2 mb-2">
            <section.icon className={`w-4 h-4 ${section.color}`} />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{section.content}</p>
        </motion.div>
      ))}

      {data.verificationNotes.length > 0 && (
        <motion.div
          className="rounded-xl bg-accent/5 border border-accent/20 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
              Verification Notes
            </h3>
          </div>
          <ul className="space-y-1">
            {data.verificationNotes.map((note, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-accent mt-0.5">✓</span>
                {note}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
