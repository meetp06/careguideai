import { motion } from 'framer-motion';
import { AgentInfo, AgentStatus } from '@/types/care-guide';
import { Cpu, Mic, Search, Book, Shield, Stethoscope, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AgentOrchestrationPanelProps {
  agents: AgentInfo[];
  isProcessing: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  mic: Mic,
  search: Search,
  book: Book,
  shield: Shield,
  stethoscope: Stethoscope,
  calendar: Calendar,
};

const statusConfig: Record<AgentStatus, { color: string; ringColor: string; textColor: string; label: string }> = {
  idle: { color: 'bg-muted', ringColor: 'ring-muted', textColor: 'text-muted-foreground', label: 'Waiting' },
  running: { color: 'bg-primary', ringColor: 'ring-primary/50', textColor: 'text-primary', label: 'Running' },
  verified: { color: 'bg-accent', ringColor: 'ring-accent/50', textColor: 'text-accent', label: 'Verified' },
  completed: { color: 'bg-accent', ringColor: 'ring-accent/50', textColor: 'text-accent', label: 'Done' },
  warning: { color: 'bg-warning', ringColor: 'ring-warning/50', textColor: 'text-warning', label: 'Warning' },
  error: { color: 'bg-destructive', ringColor: 'ring-destructive/50', textColor: 'text-destructive', label: 'Error' },
};

function AgentNode({ agent, index }: { agent: AgentInfo; index: number }) {
  const Icon = iconMap[agent.icon] || Cpu;
  const config = statusConfig[agent.status];
  const isActive = agent.status === 'running';
  const isDone = agent.status === 'completed' || agent.status === 'verified';

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 relative z-10 w-24"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <div
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-sm border-2 ${
          isDone ? 'border-accent' : isActive ? 'border-primary' : 'border-border'
        } transition-colors duration-500 shadow-sm`}
      >
        {isActive && (
          <motion.div
            className={`absolute inset-0 rounded-full ring-4 ${config.ringColor}`}
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <Icon className={`w-4 h-4 ${config.textColor}`} />

        {isDone && (
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-[1px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
          </div>
        )}
        {agent.status === 'warning' && (
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-[1px]">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
          {agent.name}
        </p>
        <p className="text-[9px] text-muted-foreground leading-tight">{config.label}</p>
      </div>
    </motion.div>
  );
}

export function AgentOrchestrationPanel({ agents, isProcessing }: AgentOrchestrationPanelProps) {
  // Re-order agents into 3 columns x 2 rows (1, 2, 3 top; 4, 5, 6 bottom)
  // Our agents are: Voice Intake (0), Symptoms (1), Research (2), Verification (3), Doctor Match (4), Booking (5)
  // Let's position them explicitly for a structured wavy flow
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-visible">
      
      {/* Background Flow Header */}
      <motion.div
        className="absolute top-8 pb-4 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Cpu className="w-4 h-4 text-agent-gray" />
        <p className="text-xs font-medium uppercase tracking-widest text-agent-gray">
          Agent Processing
        </p>
      </motion.div>

      {/* Connectivity Lines (Wavy background spanning left to right) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mx-20 z-0 opacity-60">
        <svg className="w-full h-[60%] overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="20%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="80%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Flow animation requires strokeDasharray */}
          </defs>
          
          {/* Main flow lines */}
          <motion.path
            d="M 0 100 C 100 50, 200 150, 400 100"
            fill="none"
            stroke="url(#flowGrad)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            animate={isProcessing ? { strokeDashoffset: [40, 0] } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 0 130 C 150 180, 250 80, 400 130"
            fill="none"
            stroke="url(#flowGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            animate={isProcessing ? { strokeDashoffset: [30, 0] } : {}}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 0 70 C 120 20, 280 180, 400 70"
            fill="none"
            stroke="url(#flowGrad)"
            strokeWidth="1"
            strokeDasharray="3 3"
            animate={isProcessing ? { strokeDashoffset: [20, 0] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 0 100 C 150 100, 250 100, 400 100"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Fixed Agent Grid Container overlaid on wavy lines */}
      <div className="relative z-10 w-full max-w-[320px] px-2 flex flex-col justify-center gap-12 mt-12">
        <div className="flex justify-between">
          <AgentNode agent={agents[0]} index={0} />
          <AgentNode agent={agents[2]} index={2} />
          <AgentNode agent={agents[4]} index={4} />
        </div>
        <div className="flex justify-between pl-10 pr-10">
          <AgentNode agent={agents[1]} index={1} />
          <AgentNode agent={agents[3]} index={3} />
          <AgentNode agent={agents[5]} index={5} />
        </div>
      </div>
      
    </div>
  );
}
