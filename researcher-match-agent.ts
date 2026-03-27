/**
 * CareGuide AI — Researcher-Patient Matching Agent
 * Agent 4: Rare Condition Expert Matcher
 *
 * Slots after the Verification Agent in the existing pipeline.
 * Triggered when: urgency is medium/high AND condition is flagged
 * as rare, unusual, or undiagnosed by previous agents.
 *
 * Pipeline position:
 *   Agent 1 (Symptom Extraction)
 *   → Agent 2 (Research & Care Pathway)
 *   → Agent 3 (Verification & Safety Override)
 *   → Agent 4 (Researcher-Patient Matcher) ← THIS FILE
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerificationOutput {
  symptoms: ExtractedSymptom[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  isRareCondition: boolean;
  suggestedSpecialties: string[];
  verifiedSummary: string;
  redFlags: string[];
  isEmergency: boolean;
}

export interface ExtractedSymptom {
  name: string;
  duration?: string;
  severity: "mild" | "moderate" | "severe";
  isRedFlag: boolean;
}

export interface ResearcherProfile {
  id: string;
  name: string;
  institution: string;
  specialties: string[];
  rareConditionFocus: string[];
  activeTrials: ClinicalTrial[];
  publicationKeywords: string[];
  acceptingPatients: boolean;
  contactPath: "referral" | "direct" | "trial_enrollment";
  matchScore?: number;
  matchReason?: string;
}

export interface ClinicalTrial {
  trialId: string;
  title: string;
  phase: string;
  enrollmentStatus: "open" | "closed" | "pending";
  eligibilitySummary: string;
}

export interface ResearcherMatchOutput {
  isRareConditionCase: boolean;
  matchedResearchers: ResearcherProfile[];
  openTrials: ClinicalTrial[];
  conditionHypotheses: string[];       // Possible named conditions (non-diagnostic)
  knowledgeGapNote: string;            // What is unknown / under-researched
  recommendedNextStep: string;
  agentConfidence: "high" | "medium" | "low";
  safetyPassthrough: VerificationOutput; // Forwards verified data unchanged
}

// ─── Mock Researcher Database ─────────────────────────────────────────────────
// In production: replace with Airbyte-synced NPI + PubMed + ClinicalTrials.gov

const RESEARCHER_DATABASE: ResearcherProfile[] = [
  {
    id: "r001",
    name: "Dr. Aisha Okonkwo",
    institution: "UCSF Rare Disease Center",
    specialties: ["neurology", "rare disease", "autoimmune"],
    rareConditionFocus: ["POTS", "MCAS", "hypermobile EDS", "dysautonomia"],
    activeTrials: [
      {
        trialId: "NCT04821234",
        title: "Dysautonomia Biomarker Discovery Study",
        phase: "Phase 2",
        enrollmentStatus: "open",
        eligibilitySummary:
          "Adults 18-65 with unexplained tachycardia, fatigue, and orthostatic symptoms",
      },
    ],
    publicationKeywords: ["autonomic dysfunction", "mast cell", "connective tissue"],
    acceptingPatients: true,
    contactPath: "referral",
  },
  {
    id: "r002",
    name: "Dr. Marcus Tan",
    institution: "Mayo Clinic Center for Individualized Medicine",
    specialties: ["rheumatology", "immunology", "undiagnosed diseases"],
    rareConditionFocus: ["systemic vasculitis", "autoinflammatory syndromes", "periodic fever"],
    activeTrials: [
      {
        trialId: "NCT05102988",
        title: "Genomic Profiling in Undiagnosed Autoinflammatory Disease",
        phase: "Observational",
        enrollmentStatus: "open",
        eligibilitySummary:
          "Patients with recurrent fever episodes without confirmed diagnosis",
      },
    ],
    publicationKeywords: ["inflammasome", "IL-1", "undiagnosed fever", "periodic fever syndromes"],
    acceptingPatients: true,
    contactPath: "trial_enrollment",
  },
  {
    id: "r003",
    name: "Dr. Elena Voss",
    institution: "NIH Undiagnosed Diseases Program",
    specialties: ["internal medicine", "genetics", "undiagnosed diseases"],
    rareConditionFocus: ["mitochondrial disease", "rare metabolic disorders", "unknown multisystem"],
    activeTrials: [],
    publicationKeywords: ["whole exome sequencing", "rare disease diagnosis", "metabolomics"],
    acceptingPatients: false,
    contactPath: "referral",
  },
  {
    id: "r004",
    name: "Dr. James Osei",
    institution: "Stanford Medicine Rare Neurological Disorders Clinic",
    specialties: ["neurology", "neurogenetics"],
    rareConditionFocus: ["small fiber neuropathy", "rare epilepsies", "movement disorders"],
    activeTrials: [
      {
        trialId: "NCT05231100",
        title: "Small Fiber Neuropathy Skin Biopsy Registry",
        phase: "Observational",
        enrollmentStatus: "open",
        eligibilitySummary:
          "Adults with burning pain, numbness, or autonomic symptoms without confirmed diagnosis",
      },
    ],
    publicationKeywords: ["small fiber neuropathy", "intraepidermal nerve fiber density", "neuropathic pain"],
    acceptingPatients: true,
    contactPath: "direct",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines if the verified output warrants researcher matching.
 * Triggers on: rare/complex flags, medium+ urgency with no clear diagnosis path,
 * or explicit "undiagnosed" language in the summary.
 */
function shouldTriggerResearcherMatch(verified: VerificationOutput): boolean {
  if (verified.isEmergency) return false; // Emergency → 911 first, not research
  if (verified.urgencyLevel === "low" && !verified.isRareCondition) return false;

  const rareKeywords = [
    "rare", "unusual", "undiagnosed", "atypical", "unexplained",
    "complex", "multisystem", "chronic", "unknown",
  ];
  const summaryLower = verified.verifiedSummary.toLowerCase();
  const hasRareLanguage = rareKeywords.some((kw) => summaryLower.includes(kw));

  return verified.isRareCondition || hasRareLanguage;
}

/**
 * Scores a researcher's relevance to the patient's symptom profile.
 * Simple keyword overlap — in production, replace with vector similarity
 * against Aerospike-cached embeddings.
 */
function scoreResearcher(
  researcher: ResearcherProfile,
  verified: VerificationOutput
): number {
  let score = 0;

  // Specialty match with suggested specialties from previous agents
  const specialtyOverlap = researcher.specialties.filter((s) =>
    verified.suggestedSpecialties.some((vs) =>
      vs.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(vs.toLowerCase())
    )
  );
  score += specialtyOverlap.length * 30;

  // Symptom keyword match against publication focus
  const symptomText = verified.symptoms.map((s) => s.name.toLowerCase()).join(" ");
  const pubKeywordHits = researcher.publicationKeywords.filter((kw) =>
    symptomText.includes(kw.toLowerCase())
  );
  score += pubKeywordHits.length * 20;

  // Bonus: accepting patients
  if (researcher.acceptingPatients) score += 15;

  // Bonus: has an open trial
  const hasOpenTrial = researcher.activeTrials.some(
    (t) => t.enrollmentStatus === "open"
  );
  if (hasOpenTrial) score += 20;

  // Bonus: red flag overlap with rare condition focus
  const redFlagText = verified.redFlags.join(" ").toLowerCase();
  const rareConditionHits = researcher.rareConditionFocus.filter((rc) =>
    redFlagText.includes(rc.toLowerCase())
  );
  score += rareConditionHits.length * 25;

  return score;
}

// ─── Main AI Call ─────────────────────────────────────────────────────────────

/**
 * Calls the AI model to:
 *   1. Generate possible (non-diagnostic) condition hypotheses
 *   2. Identify knowledge gaps
 *   3. Produce a recommended next step for the patient
 *
 * Uses the same AI gateway as the rest of the pipeline.
 */
async function callResearcherMatchAI(
  verified: VerificationOutput,
  topResearchers: ResearcherProfile[]
): Promise<{
  conditionHypotheses: string[];
  knowledgeGapNote: string;
  recommendedNextStep: string;
  agentConfidence: "high" | "medium" | "low";
}> {
  const systemPrompt = `You are a medical research navigation assistant. Your role is to help
patients with rare or unusual conditions connect with researchers who may be able to help.

STRICT RULES — violation of any of these invalidates your output:
1. Never diagnose. Use language like "may be consistent with", "some researchers study", "could warrant evaluation for".
2. Never name a specific treatment or medication.
3. Always recommend consulting a physician before pursuing any research pathway.
4. If symptoms suggest emergency, output recommendedNextStep as "Call 911 or go to the nearest ER immediately."
5. Confidence must be "low" if fewer than 2 symptom matches exist, "medium" for 2-4, "high" for 5+.

You will receive:
- Verified symptom data from previous agents
- Top matched researcher profiles (already scored by the system)

Respond ONLY with valid JSON matching this exact schema:
{
  "conditionHypotheses": ["string — possible named conditions, prefixed with 'may be consistent with'"],
  "knowledgeGapNote": "string — what is currently under-researched about this symptom pattern",
  "recommendedNextStep": "string — one clear, safe, actionable step for the patient",
  "agentConfidence": "high" | "medium" | "low"
}`;

  const userPrompt = `Verified patient data:
${JSON.stringify(verified, null, 2)}

Top matched researchers (already filtered and scored):
${JSON.stringify(
  topResearchers.map((r) => ({
    name: r.name,
    institution: r.institution,
    focus: r.rareConditionFocus,
    hasOpenTrial: r.activeTrials.some((t) => t.enrollmentStatus === "open"),
  })),
  null,
  2
)}

Produce the JSON response now.`;

  // Uses the same Lovable AI Gateway as the rest of the pipeline
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-gateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "{}";

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    // Graceful fallback — never crash the pipeline
    return {
      conditionHypotheses: [],
      knowledgeGapNote: "Unable to analyze at this time.",
      recommendedNextStep:
        "Please consult a specialist in rare diseases or contact the NIH Undiagnosed Diseases Program.",
      agentConfidence: "low",
    };
  }
}

// ─── Main Agent Handler ───────────────────────────────────────────────────────

/**
 * Entry point — called by the edge function orchestrator after Agent 3.
 *
 * Usage in care-guide/index.ts:
 *
 *   import { runResearcherMatchAgent } from "./researcher-match-agent.ts";
 *   const matchResult = await runResearcherMatchAgent(verificationOutput);
 */
export async function runResearcherMatchAgent(
  verified: VerificationOutput
): Promise<ResearcherMatchOutput> {

  // Step 1: Gate — only run for rare/unusual cases
  if (!shouldTriggerResearcherMatch(verified)) {
    return {
      isRareConditionCase: false,
      matchedResearchers: [],
      openTrials: [],
      conditionHypotheses: [],
      knowledgeGapNote: "",
      recommendedNextStep: "",
      agentConfidence: "low",
      safetyPassthrough: verified,
    };
  }

  // Step 2: Score and rank all researchers against this patient's profile
  const scored = RESEARCHER_DATABASE
    .map((r) => ({ ...r, matchScore: scoreResearcher(r, verified) }))
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3); // Top 3 only

  // Step 3: Add human-readable match reasons
  const scoredWithReasons = scored.map((r) => ({
    ...r,
    matchReason: buildMatchReason(r, verified),
  }));

  // Step 4: Collect all open trials from matched researchers
  const openTrials = scoredWithReasons.flatMap((r) =>
    r.activeTrials.filter((t) => t.enrollmentStatus === "open")
  );

  // Step 5: AI call for hypotheses, gap analysis, and next step
  const aiOutput = await callResearcherMatchAI(verified, scoredWithReasons);

  return {
    isRareConditionCase: true,
    matchedResearchers: scoredWithReasons,
    openTrials,
    conditionHypotheses: aiOutput.conditionHypotheses,
    knowledgeGapNote: aiOutput.knowledgeGapNote,
    recommendedNextStep: aiOutput.recommendedNextStep,
    agentConfidence: aiOutput.agentConfidence,
    safetyPassthrough: verified, // Verified data flows through unchanged
  };
}

// ─── Match Reason Builder ─────────────────────────────────────────────────────

function buildMatchReason(
  researcher: ResearcherProfile,
  verified: VerificationOutput
): string {
  const parts: string[] = [];

  const specialtyHit = researcher.specialties.find((s) =>
    verified.suggestedSpecialties.some((vs) => vs.toLowerCase().includes(s.toLowerCase()))
  );
  if (specialtyHit) parts.push(`specializes in ${specialtyHit}`);

  const conditionHit = researcher.rareConditionFocus.find((rc) =>
    verified.symptoms.some((s) => s.name.toLowerCase().includes(rc.toLowerCase()))
  );
  if (conditionHit) parts.push(`researches conditions similar to your reported symptoms`);

  const openTrial = researcher.activeTrials.find((t) => t.enrollmentStatus === "open");
  if (openTrial) parts.push(`has an open study you may qualify for`);

  if (!researcher.acceptingPatients) parts.push(`(currently via referral only)`);

  return parts.length > 0
    ? `Matched because Dr. ${researcher.name.split(" ").pop()} ${parts.join(", ")}.`
    : "Matched based on symptom and specialty overlap.";
}

// ─── Kiro Agent Spec (for spec-first planning) ────────────────────────────────
/**
 * KIRO SPEC BLOCK
 * Paste this into Kiro's spec panel to auto-generate implementation tasks.
 *
 * ---
 * name: ResearcherMatchAgent
 * description: >
 *   A post-verification agent that matches patients with unusual or undiagnosed
 *   conditions to medical researchers and open clinical trials. Triggered only
 *   after Agent 3 (Verification) passes. Never diagnoses — navigates only.
 *
 * inputs:
 *   - VerificationOutput (from Agent 3)
 *
 * outputs:
 *   - ResearcherMatchOutput (fed to ResultsPanel as a new "Researchers" tab)
 *
 * tasks:
 *   - Implement shouldTriggerResearcherMatch gate
 *   - Build scoreResearcher() with Aerospike vector fallback
 *   - Wire AI gateway call with JSON schema enforcement
 *   - Add ResearcherCard component to ResultsPanel
 *   - Add TrialCard component with eligibility summary
 *   - Extend AgentOrchestrationPanel with Agent 4 rail
 *   - Add "Researchers" tab to ResultsPanel (index 3)
 *   - Integrate with Airbyte for live researcher database sync
 *
 * safety_constraints:
 *   - Must not trigger if isEmergency === true
 *   - All condition hypotheses must use hedged language
 *   - Verification output must pass through unchanged
 *   - Agent confidence < "medium" hides researcher cards from UI
 * ---
 */
// ─── Main Execution Block (for testing) ───────────────────────────────────────────
if (import.meta.main) {
  console.log("🚀 Running ResearcherMatchAgent test...");

  // Mock patient data from Agent 3 (Verification Output)
  const mockVerification: VerificationOutput = {
    symptoms: [
      { name: "Recurrent fever", severity: "moderate", isRedFlag: false },
      { name: "Unexplained muscle weakness", severity: "moderate", isRedFlag: false },
      { name: "Joint pain", severity: "mild", isRedFlag: false }
    ],
    urgencyLevel: "medium",
    isRareCondition: true,
    suggestedSpecialties: ["Rheumatology", "Neurology", "Genetics"],
    verifiedSummary: "Patient presents with persistent fever and multisystem symptoms that are atypical for common infections. Rare autoinflammatory condition suspected.",
    redFlags: [],
    isEmergency: false
  };

  // Mock AI Gateway for testing (avoids requiring real keys/network)
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    if (typeof url === "string" && url.includes("ai-gateway")) {
      console.log("🤖 [Mock AI] Intercepted call to AI gateway...");
      return {
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              conditionHypotheses: ["may be consistent with systemic vasculitis", "may be consistent with autoinflammatory syndromes"],
              knowledgeGapNote: "The interface between cytokine disregulation and these specific rheumatological patterns is an active area of research.",
              recommendedNextStep: "Consult with a specialist at an Undiagnosed Diseases Program for genomic profiling.",
              agentConfidence: "medium"
            })
          }]
        })
      } as Response;
    }
    return originalFetch(url, options);
  };

  try {
    const result = await runResearcherMatchAgent(mockVerification);
    console.log("\n✅ Test Result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
}
