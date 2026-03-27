import { useState } from 'react';
import { Phone, Loader2, CheckCircle2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PhoneIntakeProps {
  onTranscriptReady: (transcript: string) => void;
}

export function PhoneIntakePanel({ onTranscriptReady }: PhoneIntakeProps) {
  const [status, setStatus] = useState<'idle' | 'calling' | 'listening' | 'done' | 'error'>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  const BLAND_PHONE_NUMBER = '+1 (844) 256-5463'; // Bland AI intake number

  const startPhoneIntake = async () => {
    setStatus('calling');
    try {
      // Dispatch a Bland AI call TO the user's phone for symptom intake
      const response = await fetch('http://localhost:8001/api/phone-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'outbound' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCallId(data.callId || null);
        setStatus('listening');
        // Poll for transcript completion
        pollForTranscript(data.callId);
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  };

  const pollForTranscript = async (id: string) => {
    const maxAttempts = 30; // 2.5 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`http://localhost:8001/api/phone-intake/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.transcript && data.status === 'completed') {
            setTranscript(data.transcript);
            setStatus('done');
            onTranscriptReady(data.transcript);
            return;
          }
        }
      } catch { /* continue polling */ }
    }
    setStatus('error');
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Phone Intake via Bland AI</h3>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-muted-foreground mb-3">
              Prefer speaking on the phone? Call our AI agent or let it call you.
              Describe your symptoms naturally — the transcript is processed by our 6-agent pipeline.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-3">
              <Mic className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Call our AI intake line:</p>
                <p className="text-lg font-bold text-primary tracking-wide">{BLAND_PHONE_NUMBER}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={startPhoneIntake}>
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Or have our AI call you instead
            </Button>
          </motion.div>
        )}

        {status === 'calling' && (
          <motion.div key="calling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Dispatching AI call...</p>
          </motion.div>
        )}

        {status === 'listening' && (
          <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 gap-2">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
              <Phone className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground">Call in progress...</p>
            <p className="text-xs text-muted-foreground">Describe your symptoms to the AI agent</p>
          </motion.div>
        )}

        {status === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 gap-2">
            <CheckCircle2 className="w-8 h-8 text-accent" />
            <p className="text-sm font-medium text-foreground">Transcript received!</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">{transcript.slice(0, 150)}...</p>
            <p className="text-xs text-primary font-medium">Processing through agent pipeline...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
