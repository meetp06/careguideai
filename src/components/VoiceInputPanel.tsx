import { useState } from 'react';
import { Mic, MicOff, RotateCcw, Send, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState } from '@/types/care-guide';

interface VoiceInputPanelProps {
  appState: AppState;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onReset: () => void;
  onSubmitText: (text: string) => void;
  isSupported: boolean;
}

export function VoiceInputPanel({
  appState,
  isListening,
  transcript,
  interimTranscript,
  onStartListening,
  onStopListening,
  onReset,
  onSubmitText,
  isSupported,
}: VoiceInputPanelProps) {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');

  const stateLabel = isListening
    ? 'Listening...'
    : appState === 'processing'
    ? 'Processing...'
    : appState === 'complete'
    ? 'Complete'
    : 'Tap to speak';

  const handleTextSubmit = () => {
    const trimmed = textValue.trim();
    if (trimmed) {
      onSubmitText(trimmed);
      setTextValue('');
      setShowTextInput(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-5">
      <motion.p
        className="text-xs font-medium uppercase tracking-widest text-voice-blue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Voice Intake
      </motion.p>

      {/* Orb */}
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute w-36 h-36 rounded-full border border-primary/20 ${
            isListening ? 'voice-orb-listening' : 'voice-orb-pulse'
          }`}
        />
        <div
          className={`absolute w-28 h-28 rounded-full border border-primary/30 ${
            isListening ? 'voice-orb-listening' : 'voice-orb-pulse'
          }`}
          style={{ animationDelay: '0.3s' }}
        />

        <motion.button
          onClick={isListening ? onStopListening : onStartListening}
          disabled={!isSupported || appState === 'processing'}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
            isListening
              ? 'bg-primary text-primary-foreground shadow-lg'
              : appState === 'processing'
              ? 'bg-muted text-muted-foreground cursor-wait'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </motion.button>
      </div>

      {/* State label */}
      <motion.p
        key={stateLabel}
        className="text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {stateLabel}
      </motion.p>

      {/* Transcript preview */}
      <div className="w-full max-w-[240px] min-h-[60px]">
        <AnimatePresence mode="wait">
          {(transcript || interimTranscript) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-secondary/50 p-3"
            >
              <p className="text-xs text-foreground leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground italic">{interimTranscript}</span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text input fallback */}
      <AnimatePresence>
        {showTextInput && appState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-[240px]"
          >
            <div className="flex gap-1.5">
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                }}
                placeholder="Describe your concern..."
                className="flex-1 text-xs rounded-lg border border-border bg-white/40 dark:bg-black/40 backdrop-blur-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[60px]"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textValue.trim()}
                className="self-end p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-2">
        {appState === 'complete' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </motion.button>
        )}

        {appState === 'idle' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowTextInput(!showTextInput)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Keyboard className="w-3 h-3" />
            {showTextInput ? 'Hide keyboard' : 'Type instead'}
          </motion.button>
        )}
      </div>

      {!isSupported && (
        <p className="text-xs text-destructive text-center">
          Voice not supported — use the text input below.
        </p>
      )}
    </div>
  );
}
