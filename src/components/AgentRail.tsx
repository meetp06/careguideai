import { motion } from 'framer-motion';
import { AgentStatus } from '@/types/care-guide';
import { CheckCircle2, Loader2, AlertTriangle, Circle } from 'lucide-react';

interface AgentRailProps {
  name: string;
  status: AgentStatus;
  index: number;
}

const statusConfig: Record<AgentStatus, { color: string; icon: React.ReactNode; label: string }> = {
  idle: {
    color: 'bg-muted',
    icon: <Circle className="w-3 h-3 text-muted-foreground" />,
    label: 'Waiting',
  },
  running: {
    color: 'bg-primary',
    icon: <Loader2 className="w-3 h-3 text-primary animate-spin" />,
    label: 'Running',
  },
  verified: {
    color: 'bg-accent',
    icon: <CheckCircle2 className="w-3 h-3 text-accent" />,
    label: 'Verified',
  },
  completed: {
    color: 'bg-accent',
    icon: <CheckCircle2 className="w-3 h-3 text-accent" />,
    label: 'Done',
  },
  warning: {
    color: 'bg-warning',
    icon: <AlertTriangle className="w-3 h-3 text-warning" />,
    label: 'Warning',
  },
  error: {
    color: 'bg-destructive',
    icon: <AlertTriangle className="w-3 h-3 text-destructive" />,
    label: 'Error',
  },
};

export function AgentRail({ name, status, index }: AgentRailProps) {
  const config = statusConfig[status];
  const isActive = status === 'running';
  const isDone = status === 'verified' || status === 'completed';

  return (
    <motion.div
      className="flex items-center gap-3 py-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      {/* Status icon */}
      <div className="w-5 flex-shrink-0 flex justify-center">{config.icon}</div>

      {/* Agent name */}
      <span
        className={`text-xs font-medium w-28 flex-shrink-0 truncate ${
          isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {name}
      </span>

      {/* Rail track */}
      <div className="flex-1 h-1 rounded-full bg-muted relative overflow-hidden">
        {isActive && (
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full bg-primary/60"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        )}
        {isDone && (
          <motion.div
            className="absolute top-0 left-0 h-full w-full rounded-full bg-accent/50"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4 }}
            style={{ transformOrigin: 'left' }}
          />
        )}
      </div>

      {/* Status badge */}
      <span
        className={`text-[10px] font-medium w-14 text-right ${
          isDone ? 'text-accent' : isActive ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {config.label}
      </span>
    </motion.div>
  );
}
