import { describe, it, expect } from 'vitest';
import { mockDoctors } from '../mock-doctors';

describe('mockDoctors data integrity', () => {
  it('should contain exactly 10 doctors', () => {
    expect(mockDoctors).toHaveLength(10);
  });

  it('should have unique IDs for all doctors', () => {
    const ids = mockDoctors.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have all required fields on every doctor', () => {
    for (const doc of mockDoctors) {
      expect(doc.id).toBeTruthy();
      expect(doc.name).toBeTruthy();
      expect(doc.specialty).toBeTruthy();
      expect(doc.location).toBeTruthy();
      expect(doc.distance).toBeTruthy();
      expect(typeof doc.rating).toBe('number');
      expect(doc.rating).toBeGreaterThanOrEqual(1);
      expect(doc.rating).toBeLessThanOrEqual(5);
      expect(typeof doc.reviewCount).toBe('number');
      expect(doc.availability).toBeTruthy();
      expect(doc.phone).toBeTruthy();
      expect(typeof doc.acceptsNewPatients).toBe('boolean');
    }
  });

  it('should cover key specialties needed for the app', () => {
    const specialties = mockDoctors.map(d => d.specialty);
    expect(specialties).toContain('Family Medicine');
    expect(specialties).toContain('Urgent Care');
    expect(specialties.some(s => s.includes('ENT'))).toBe(true);
    expect(specialties).toContain('Gastroenterology');
    expect(specialties).toContain('Pulmonology');
    expect(specialties).toContain('Cardiology');
    expect(specialties).toContain('Neurology');
    expect(specialties).toContain('Dermatology');
    expect(specialties).toContain('Orthopedics');
  });

  it('should have at least one doctor accepting new patients', () => {
    const accepting = mockDoctors.filter(d => d.acceptsNewPatients);
    expect(accepting.length).toBeGreaterThan(0);
  });
});
