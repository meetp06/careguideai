import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppState } from '@/types/care-guide';

interface SolutionOrbPanelProps {
  appState: AppState;
  verificationPassed: boolean;
  isEmergency: boolean;
}

export function SolutionOrbPanel({ appState, verificationPassed, isEmergency }: SolutionOrbPanelProps) {
  const isComplete = appState === 'complete';
  const isProcessing = appState === 'processing';

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-6">
      <motion.p
        className="text-xs font-medium uppercase tracking-widest text-accent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Verified Response
      </motion.p>

      {/* Solution orb */}
      <div className="relative flex items-center justify-center">
        {isComplete && (
          <>
            <div className="absolute w-32 h-32 rounded-full border border-accent/20 solution-orb-glow" />
            <div
              className="absolute w-24 h-24 rounded-full border border-accent/30 solution-orb-glow"
              style={{ animationDelay: '0.4s' }}
            />
          </>
        )}

        <motion.div
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 ${
            isComplete
              ? isEmergency
                ? 'bg-destructive/10 text-destructive'
                : 'bg-accent/10 text-accent'
              : isProcessing
              ? 'bg-muted text-muted-foreground'
              : 'bg-secondary text-muted-foreground'
          }`}
          animate={
            isComplete
              ? { scale: [0.95, 1.05, 1] }
              : {}
          }
          transition={{ duration: 0.5 }}
        >
          {isComplete ? (
            isEmergency ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )
          ) : (
            <ShieldCheck className="w-7 h-7 opacity-30" />
          )}
        </motion.div>
      </div>

      {/* Status badges */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {verificationPassed ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Safety Verified
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Logic Checked
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Review Recommended
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isComplete && !isProcessing && (
        <p className="text-xs text-muted-foreground text-center max-w-[160px]">
          Results will appear here after analysis
        </p>
      )}
    </div>
  );
}
