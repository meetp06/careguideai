/**
 * Sanitize user transcript input before sending to AI agents.
 * Strips HTML tags, limits length, and trims whitespace.
 */

const MAX_TRANSCRIPT_LENGTH = 2000;

const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

export function sanitizeTranscript(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text
    // Remove any HTML tags
    .replace(HTML_TAG_REGEX, '')
    // Collapse multiple whitespace into single space
    .replace(MULTIPLE_SPACES_REGEX, ' ')
    // Trim leading/trailing whitespace
    .trim();

  // Limit to max length
  if (sanitized.length > MAX_TRANSCRIPT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TRANSCRIPT_LENGTH);
  }

  return sanitized;
}
