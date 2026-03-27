export type AgentStatus = 'idle' | 'running' | 'verified' | 'warning' | 'completed' | 'error';
export type AppState = 'idle' | 'listening' | 'processing' | 'complete';

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  description: string;
}

export interface SymptomRow {
  symptom: string;
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  possibleConcern: string;
  recommendedSpecialist: string;
  nextStep: string;
}

export interface SummaryData {
  whatYouSaid: string;
  whatThisMayIndicate: string;
  recommendedNextStep: string;
  whenToSeekUrgentCare: string;
  verificationNotes: string[];
}

export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  location: string;
  distance: string;
  rating: number;
  reviewCount: number;
  availability: string;
  phone: string;
  imageUrl: string;
  acceptsNewPatients: boolean;
}

export interface CareGuideResult {
  summary: SummaryData;
  symptoms: SymptomRow[];
  doctors: DoctorProfile[];
  isEmergency: boolean;
  verificationPassed: boolean;
}
