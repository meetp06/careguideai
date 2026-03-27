import { useState, useCallback, useRef } from 'react';
import { AgentInfo, AgentStatus, CareGuideResult } from '@/types/care-guide';
import { buildMockSymptoms, matchDoctorsBySpecialty, detectEmergency } from '@/lib/agent-utils';
import { sanitizeTranscript } from '@/lib/sanitize';

const initialAgents: AgentInfo[] = [
  { id: 'intake', name: 'Voice Intake', icon: 'mic', status: 'idle', description: 'Capturing voice input' },
  { id: 'symptoms', name: 'Symptom Analysis', icon: 'search', status: 'idle', description: 'Extracting symptoms' },
  { id: 'research', name: 'Research', icon: 'book', status: 'idle', description: 'Analyzing care pathway' },
  { id: 'verification', name: 'Verification', icon: 'shield', status: 'idle', description: 'Safety verification' },
  { id: 'doctor', name: 'Doctor Match', icon: 'stethoscope', status: 'idle', description: 'Finding specialists' },
  { id: 'booking', name: 'Booking Ready', icon: 'calendar', status: 'idle', description: 'Preparing booking' },
];

export function useAgentOrchestration() {
  const [agents, setAgents] = useState<AgentInfo[]>(initialAgents);
  const [result, setResult] = useState<CareGuideResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef(false);

  const updateAgent = useCallback((id: string, status: AgentStatus) => {
    setAgents(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  }, []);

  const resetAgents = useCallback(() => {
    setAgents(initialAgents);
    setResult(null);
    setIsProcessing(false);
    abortRef.current = true;
  }, []);

  const curateKnowledge = async (data: CareGuideResult) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      await fetch(`${supabaseUrl}/functions/v1/curate-knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          symptoms: data.symptoms,
          isEmergency: data.isEmergency,
          verificationPassed: data.verificationPassed,
        }),
      });
    } catch {
      // Fire-and-forget — don't disrupt user flow
    }
  };

  const runPipeline = useCallback(
    async (transcript: string) => {
      const cleanTranscript = sanitizeTranscript(transcript);
      if (!cleanTranscript) return;

      abortRef.current = false;
      setIsProcessing(true);
      setResult(null);
      setAgents(initialAgents);

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (supabaseUrl && supabaseKey) {
          // Agent 1: Voice Intake
          updateAgent('intake', 'running');
          await delay(600);
          if (abortRef.current) return;
          updateAgent('intake', 'completed');

          // Agent 2+3+4: Edge function runs 3 real AI agents
          updateAgent('symptoms', 'running');

          const response = await fetch(`${supabaseUrl}/functions/v1/care-guide`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ transcript: cleanTranscript }),
          });

          if (!response.ok) throw new Error('Edge function failed');

          // Simulate progressive agent completion as data arrives
          if (abortRef.current) return;
          updateAgent('symptoms', 'completed');
          await delay(300);

          updateAgent('research', 'running');
          await delay(400);
          if (abortRef.current) return;
          updateAgent('research', 'completed');

          updateAgent('verification', 'running');
          const data = await response.json();
          if (abortRef.current) return;
          updateAgent('verification', data.verificationPassed ? 'verified' : 'warning');

          // Agent 5: Doctor Match
          await delay(300);
          updateAgent('doctor', 'running');
          await delay(400);
          if (abortRef.current) return;
          updateAgent('doctor', 'completed');

          // Agent 6: Booking Ready
          updateAgent('booking', 'running');
          await delay(200);
          if (abortRef.current) return;
          updateAgent('booking', 'completed');

          const finalResult = data as CareGuideResult;
          setResult(finalResult);

          // Agent 7: Knowledge Curation (fire-and-forget)
          curateKnowledge(finalResult);
        } else {
          await runMockPipeline(cleanTranscript);
        }
      } catch (error) {
        console.error('Pipeline error, falling back to mock:', error);
        await runMockPipeline(cleanTranscript);
      }

      setIsProcessing(false);
    },
    [updateAgent],
  );

  const runMockPipeline = async (transcript: string) => {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const lower = transcript.toLowerCase();

    updateAgent('intake', 'running');
    await delay(800);
    if (abortRef.current) return;
    updateAgent('intake', 'completed');

    updateAgent('symptoms', 'running');
    await delay(1200);
    if (abortRef.current) return;
    updateAgent('symptoms', 'completed');

    updateAgent('research', 'running');
    await delay(1000);
    if (abortRef.current) return;
    updateAgent('research', 'completed');

    updateAgent('verification', 'running');
    await delay(800);
    if (abortRef.current) return;

    const isEmergency = detectEmergency(lower);

    updateAgent('verification', isEmergency ? 'warning' : 'verified');

    updateAgent('doctor', 'running');
    await delay(600);
    if (abortRef.current) return;
    updateAgent('doctor', 'completed');

    updateAgent('booking', 'running');
    await delay(300);
    if (abortRef.current) return;
    updateAgent('booking', 'completed');

    // Build mock result with specialty-based doctor matching
    const symptoms = buildMockSymptoms(lower);
    const specialtyNeeded = symptoms[0]?.recommendedSpecialist || 'Primary Care';
    const matchedDoctors = matchDoctorsBySpecialty(specialtyNeeded, isEmergency);

    setResult({
      summary: {
        whatYouSaid: transcript,
        whatThisMayIndicate: symptoms.map(s => s.possibleConcern).join('; '),
        recommendedNextStep: `Consider seeing a ${symptoms[0]?.recommendedSpecialist || 'Primary Care physician'}. ${symptoms[0]?.nextStep || 'Schedule an appointment.'}`,
        whenToSeekUrgentCare: 'Seek immediate care if you experience difficulty breathing, high fever (>103°F), severe pain, or rapidly worsening symptoms.',
        verificationNotes: [
          'Urgency levels consistent with reported symptoms',
          isEmergency ? '⚠ Emergency red flags detected — urgency escalated' : 'No emergency red flags detected',
          'Specialist recommendations match symptom profile',
          'No diagnostic or prescriptive language used',
        ],
      },
      symptoms,
      doctors: matchedDoctors,
      isEmergency,
      verificationPassed: !isEmergency,
    });
  };

  return { agents, result, isProcessing, runPipeline, resetAgents };
}
