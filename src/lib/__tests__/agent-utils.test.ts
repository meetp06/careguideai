import { describe, it, expect } from 'vitest';
import { buildMockSymptoms, matchDoctorsBySpecialty, detectEmergency } from '../agent-utils';

describe('buildMockSymptoms', () => {
  it('should detect throat symptoms', () => {
    const result = buildMockSymptoms('my throat hurts');
    expect(result).toHaveLength(1);
    expect(result[0].symptom).toBe('Sore throat');
    expect(result[0].recommendedSpecialist).toBe('ENT');
    expect(result[0].urgency).toBe('Low');
  });

  it('should detect swallowing difficulty as throat symptom', () => {
    const result = buildMockSymptoms('i have trouble swallowing');
    expect(result[0].symptom).toBe('Sore throat');
  });

  it('should detect cough symptoms', () => {
    const result = buildMockSymptoms('i have a persistent cough');
    expect(result).toHaveLength(1);
    expect(result[0].symptom).toBe('Cough');
    expect(result[0].recommendedSpecialist).toBe('Pulmonology');
  });

  it('should detect stomach and nausea symptoms', () => {
    const result = buildMockSymptoms('my stomach hurts and i feel nausea');
    expect(result).toHaveLength(1);
    expect(result[0].symptom).toBe('Stomach pain / Nausea');
    expect(result[0].recommendedSpecialist).toBe('Gastroenterology');
  });

  it('should detect chest pain as emergency', () => {
    const result = buildMockSymptoms('i have chest pain');
    expect(result.some(s => s.urgency === 'Emergency')).toBe(true);
    expect(result.some(s => s.recommendedSpecialist === 'Urgent Care')).toBe(true);
  });

  it('should detect headache symptoms', () => {
    const result = buildMockSymptoms('i have a terrible headache');
    expect(result[0].symptom).toBe('Headache');
    expect(result[0].recommendedSpecialist).toBe('Neurology');
  });

  it('should detect fever symptoms', () => {
    const result = buildMockSymptoms('i have a high fever');
    expect(result[0].symptom).toBe('Fever');
    expect(result[0].recommendedSpecialist).toBe('Internal Medicine');
  });

  it('should detect skin/rash symptoms', () => {
    const result = buildMockSymptoms('i have a rash on my arm');
    expect(result[0].symptom).toBe('Skin concern');
    expect(result[0].recommendedSpecialist).toBe('Dermatology');
  });

  it('should detect back/joint pain symptoms', () => {
    const result = buildMockSymptoms('my knee hurts after running');
    expect(result[0].symptom).toBe('Musculoskeletal pain');
    expect(result[0].recommendedSpecialist).toBe('Orthopedics');
  });

  it('should detect multiple symptoms in one transcript', () => {
    const result = buildMockSymptoms('i have a sore throat and a cough with fever');
    expect(result.length).toBeGreaterThanOrEqual(3);
    const symptomNames = result.map(s => s.symptom);
    expect(symptomNames).toContain('Sore throat');
    expect(symptomNames).toContain('Cough');
    expect(symptomNames).toContain('Fever');
  });

  it('should return generic symptom for unrecognized input', () => {
    const result = buildMockSymptoms('i just feel weird');
    expect(result).toHaveLength(1);
    expect(result[0].symptom).toBe('General concern');
    expect(result[0].recommendedSpecialist).toBe('Family Medicine');
  });

  it('should return symptom rows with all required fields', () => {
    const result = buildMockSymptoms('headache');
    const row = result[0];
    expect(row).toHaveProperty('symptom');
    expect(row).toHaveProperty('duration');
    expect(row).toHaveProperty('severity');
    expect(row).toHaveProperty('urgency');
    expect(row).toHaveProperty('possibleConcern');
    expect(row).toHaveProperty('recommendedSpecialist');
    expect(row).toHaveProperty('nextStep');
  });
});

describe('detectEmergency', () => {
  it('should detect chest pain as emergency', () => {
    expect(detectEmergency('i have chest pain')).toBe(true);
  });

  it('should detect breathing difficulty as emergency', () => {
    expect(detectEmergency('i am having trouble breathing')).toBe(true);
  });

  it('should detect stroke as emergency', () => {
    expect(detectEmergency('i think i am having a stroke')).toBe(true);
  });

  it('should detect heavy bleeding as emergency', () => {
    expect(detectEmergency('i am bleeding heavily')).toBe(true);
  });

  it('should detect unconsciousness as emergency', () => {
    expect(detectEmergency('the person is unconscious')).toBe(true);
  });

  it('should detect seizure as emergency', () => {
    expect(detectEmergency('they are having a seizure')).toBe(true);
  });

  it('should not flag non-emergency symptoms', () => {
    expect(detectEmergency('i have a mild headache')).toBe(false);
    expect(detectEmergency('my throat is a bit sore')).toBe(false);
    expect(detectEmergency('i have a runny nose')).toBe(false);
  });
});

describe('matchDoctorsBySpecialty', () => {
  it('should match ENT specialty', () => {
    const result = matchDoctorsBySpecialty('ENT', false);
    expect(result.some(d => d.specialty.includes('ENT'))).toBe(true);
  });

  it('should always include Family Medicine as fallback', () => {
    const result = matchDoctorsBySpecialty('Neurology', false);
    expect(result.some(d => d.specialty === 'Family Medicine')).toBe(true);
  });

  it('should always include Urgent Care as fallback', () => {
    const result = matchDoctorsBySpecialty('Dermatology', false);
    expect(result.some(d => d.specialty === 'Urgent Care')).toBe(true);
  });

  it('should put Urgent Care first for emergency cases', () => {
    const result = matchDoctorsBySpecialty('Cardiology', true);
    expect(result[0].specialty).toBe('Urgent Care');
  });

  it('should limit results to 4 doctors max', () => {
    const result = matchDoctorsBySpecialty('Internal', false);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('should not duplicate doctors', () => {
    const result = matchDoctorsBySpecialty('Family Medicine', false);
    const ids = result.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
