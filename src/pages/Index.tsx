import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceInputPanel } from '@/components/VoiceInputPanel';
import { AgentOrchestrationPanel } from '@/components/AgentOrchestrationPanel';
import { SolutionOrbPanel } from '@/components/SolutionOrbPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAgentOrchestration } from '@/hooks/useAgentOrchestration';
import { AppState } from '@/types/care-guide';
import { motion } from 'framer-motion';
import { Heart, Moon, Sun, ArrowLeft } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  }, [isDark]);

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  } = useSpeechRecognition();

  const { agents, result, isProcessing, runPipeline, resetAgents } = useAgentOrchestration();

  const hasTriggered = useRef(false);

  const appState: AppState = isListening
    ? 'listening'
    : isProcessing
    ? 'processing'
    : result
    ? 'complete'
    : 'idle';

  // When user stops speaking and there's a transcript, trigger pipeline
  useEffect(() => {
    if (!isListening && transcript.trim() && !hasTriggered.current && !isProcessing) {
      hasTriggered.current = true;
      runPipeline(transcript.trim());
    }
  }, [isListening, transcript, isProcessing, runPipeline]);

  const handleReset = useCallback(() => {
    resetTranscript();
    resetAgents();
    hasTriggered.current = false;
  }, [resetTranscript, resetAgents]);

  const handleSubmitText = useCallback((text: string) => {
    hasTriggered.current = true;
    runPipeline(text);
  }, [runPipeline]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">CareGuide AI</h1>
            <p className="text-[10px] text-muted-foreground">Verified Voice Agents for Medical Navigation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Home
          </button>
        </div>
      </header>

      {/* Main 4-panel layout */}
      <main className="flex flex-1 overflow-hidden">
        <motion.section
          className="w-[220px] flex-shrink-0 relative z-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <VoiceInputPanel
            appState={appState}
            isListening={isListening}
            transcript={transcript}
            interimTranscript={interimTranscript}
            onStartListening={startListening}
            onStopListening={stopListening}
            onReset={handleReset}
            onSubmitText={handleSubmitText}
            isSupported={isSupported}
          />
        </motion.section>

        <motion.section
          className="w-[320px] flex-shrink-0 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AgentOrchestrationPanel agents={agents} isProcessing={isProcessing} />
        </motion.section>

        <motion.section
          className="w-[200px] flex-shrink-0 border-r border-border/50 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SolutionOrbPanel
            appState={appState}
            verificationPassed={result?.verificationPassed ?? false}
            isEmergency={result?.isEmergency ?? false}
          />
        </motion.section>

        <motion.section
          className="flex-1 min-w-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ResultsPanel result={result} />
        </motion.section>
      </main>

      <DisclaimerBanner />
    </div>
  );
};

export default Index;
