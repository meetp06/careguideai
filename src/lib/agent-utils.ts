import { SymptomRow, DoctorProfile } from '@/types/care-guide';
import { mockDoctors } from '@/data/mock-doctors';

/**
 * Build mock symptom rows from keywords in the transcript.
 * Used as a fallback when the real AI pipeline is unavailable.
 */
export function buildMockSymptoms(lower: string): SymptomRow[] {
  const symptoms: SymptomRow[] = [];

  if (lower.includes('throat') || lower.includes('swallow')) {
    symptoms.push({
      symptom: 'Sore throat',
      duration: 'Not specified',
      severity: 'Moderate',
      urgency: 'Low',
      possibleConcern: 'Pharyngitis / Upper respiratory infection',
      recommendedSpecialist: 'ENT',
      nextStep: 'Schedule appointment within 48 hours',
    });
  }

  if (lower.includes('cough')) {
    symptoms.push({
      symptom: 'Cough',
      duration: 'Not specified',
      severity: 'Moderate',
      urgency: 'Medium',
      possibleConcern: 'Respiratory infection',
      recommendedSpecialist: 'Pulmonology',
      nextStep: 'Monitor and see doctor if persisting',
    });
  }

  if (lower.includes('stomach') || lower.includes('nausea') || lower.includes('abdominal')) {
    symptoms.push({
      symptom: 'Stomach pain / Nausea',
      duration: 'Not specified',
      severity: 'Moderate',
      urgency: 'Medium',
      possibleConcern: 'Gastritis / GI issue',
      recommendedSpecialist: 'Gastroenterology',
      nextStep: 'See specialist if symptoms persist > 3 days',
    });
  }

  if (lower.includes('chest pain') || lower.includes('heart')) {
    symptoms.push({
      symptom: 'Chest pain',
      duration: 'Not specified',
      severity: 'Severe',
      urgency: 'Emergency',
      possibleConcern: 'Possible cardiac event',
      recommendedSpecialist: 'Urgent Care',
      nextStep: 'Seek immediate emergency care',
    });
  }

  if (lower.includes('headache') || lower.includes('head')) {
    symptoms.push({
      symptom: 'Headache',
      duration: 'Not specified',
      severity: 'Mild',
      urgency: 'Low',
      possibleConcern: 'Tension headache / Migraine',
      recommendedSpecialist: 'Neurology',
      nextStep: 'Rest, hydrate, and monitor',
    });
  }

  if (lower.includes('fever')) {
    symptoms.push({
      symptom: 'Fever',
      duration: 'Not specified',
      severity: 'Moderate',
      urgency: 'Medium',
      possibleConcern: 'Infection / Inflammatory response',
      recommendedSpecialist: 'Internal Medicine',
      nextStep: 'Monitor temperature, seek care if >103°F',
    });
  }

  if (lower.includes('rash') || lower.includes('skin') || lower.includes('itch')) {
    symptoms.push({
      symptom: 'Skin concern',
      duration: 'Not specified',
      severity: 'Mild',
      urgency: 'Low',
      possibleConcern: 'Dermatitis / Allergic reaction',
      recommendedSpecialist: 'Dermatology',
      nextStep: 'Schedule dermatology appointment',
    });
  }

  if (lower.includes('back pain') || lower.includes('joint') || lower.includes('knee')) {
    symptoms.push({
      symptom: 'Musculoskeletal pain',
      duration: 'Not specified',
      severity: 'Moderate',
      urgency: 'Low',
      possibleConcern: 'Musculoskeletal strain / Joint issue',
      recommendedSpecialist: 'Orthopedics',
      nextStep: 'Rest and schedule orthopedic evaluation',
    });
  }

  if (symptoms.length === 0) {
    symptoms.push({
      symptom: 'General concern',
      duration: 'Not specified',
      severity: 'Mild',
      urgency: 'Low',
      possibleConcern: 'Needs further evaluation',
      recommendedSpecialist: 'Family Medicine',
      nextStep: 'Schedule a general check-up',
    });
  }

  return symptoms;
}

/**
 * Detect if emergency keywords are present in the transcript.
 */
export function detectEmergency(lower: string): boolean {
  const emergencyKeywords = [
    'chest pain',
    'breathing',
    'stroke',
    'bleeding heavily',
    'unconscious',
    'seizure',
    'heart attack',
  ];
  return emergencyKeywords.some((kw) => lower.includes(kw));
}

/**
 * Match doctors from the mock database by specialty.
 * Always includes Family Medicine and Urgent Care as fallbacks.
 */
export function matchDoctorsBySpecialty(specialty: string, isEmergency: boolean): DoctorProfile[] {
  const lower = specialty.toLowerCase();
  const matched = mockDoctors.filter(
    (d) =>
      d.specialty.toLowerCase().includes(lower) ||
      lower.includes(d.specialty.toLowerCase().split(' ')[0]),
  );

  const general = mockDoctors.find((d) => d.specialty === 'Family Medicine');
  const urgent = mockDoctors.find((d) => d.specialty === 'Urgent Care');

  const results = isEmergency && urgent ? [urgent, ...matched] : [...matched];

  if (general && !results.find((d) => d.id === general.id)) results.push(general);
  if (urgent && !isEmergency && !results.find((d) => d.id === urgent.id)) results.push(urgent);

  return results.slice(0, 4);
}
