import { describe, it, expect } from 'vitest';
import { sanitizeTranscript } from '../sanitize';

describe('sanitizeTranscript', () => {
  it('should return empty string for null/undefined/empty input', () => {
    expect(sanitizeTranscript('')).toBe('');
    expect(sanitizeTranscript(null as any)).toBe('');
    expect(sanitizeTranscript(undefined as any)).toBe('');
  });

  it('should strip HTML tags', () => {
    expect(sanitizeTranscript('I have a <b>sore</b> throat')).toBe('I have a sore throat');
    expect(sanitizeTranscript('<script>alert("xss")</script>pain')).toBe('alert("xss")pain');
    expect(sanitizeTranscript('no tags here')).toBe('no tags here');
  });

  it('should collapse multiple whitespace into single space', () => {
    expect(sanitizeTranscript('I have   a   headache')).toBe('I have a headache');
    expect(sanitizeTranscript('  lots   of   spaces  ')).toBe('lots of spaces');
    expect(sanitizeTranscript('newline\n\nhere')).toBe('newline here');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeTranscript('  hello  ')).toBe('hello');
    expect(sanitizeTranscript('\t\ttabs\t\t')).toBe('tabs');
  });

  it('should limit transcript length to 2000 characters', () => {
    const longText = 'a'.repeat(3000);
    const result = sanitizeTranscript(longText);
    expect(result.length).toBe(2000);
  });

  it('should handle combined edge cases', () => {
    const input = '  <b>I have</b>   a really   <i>bad</i>   headache  ';
    expect(sanitizeTranscript(input)).toBe('I have a really bad headache');
  });
});
