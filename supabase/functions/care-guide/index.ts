import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "npm:postgres";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any) {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    console.error(`AI call failed (${status}):`, text);
    throw { status, message: text };
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  // Fallback to message content
  const content = result.choices?.[0]?.message?.content;
  if (content) {
    try { return JSON.parse(content); } catch { return content; }
  }
  throw { status: 500, message: "No usable AI response" };
}

// ─── Agent 1: Symptom Extraction ───
async function runSymptomExtraction(apiKey: string, transcript: string) {
  const system = `You are a medical intake agent. Extract structured symptom data from a patient's description. Be thorough. Use cautious medical language. Never diagnose.`;
  const user = `Extract all symptoms, their duration, severity, and body area from this patient description:\n\n"${transcript}"`;

  return callAI(apiKey, system, user, [
    {
      type: "function",
      function: {
        name: "extract_symptoms",
        description: "Extract structured symptoms from patient description",
        parameters: {
          type: "object",
          properties: {
            symptoms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symptom: { type: "string" },
                  duration: { type: "string" },
                  severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] },
                  bodyArea: { type: "string" },
                },
                required: ["symptom", "duration", "severity", "bodyArea"],
                additionalProperties: false,
              },
            },
            redFlags: { type: "array", items: { type: "string" }, description: "Any emergency red flag symptoms detected" },
            patientSummary: { type: "string", description: "Brief paraphrase of what the patient said" },
          },
          required: ["symptoms", "redFlags", "patientSummary"],
          additionalProperties: false,
        },
      },
    },
  ], { type: "function", function: { name: "extract_symptoms" } });
}

// ─── Agent 2: Research & Care Pathway ───
async function runResearchAgent(apiKey: string, extractionResult: any) {
  const system = `You are a medical research navigation agent. Given extracted symptoms, determine urgency, possible concerns, recommended specialist types, and next steps. You are NOT a doctor — use "possible concern", "may indicate", "consider seeing" language only.`;
  const user = `Based on these extracted symptoms, provide care pathway guidance:\n\n${JSON.stringify(extractionResult, null, 2)}\n\nMap each symptom to urgency level, possible concern, specialist recommendation, and next step. Also provide an overall summary.`;

  return callAI(apiKey, system, user, [
    {
      type: "function",
      function: {
        name: "provide_research",
        description: "Provide research-based care pathway for extracted symptoms",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                whatYouSaid: { type: "string" },
                whatThisMayIndicate: { type: "string" },
                recommendedNextStep: { type: "string" },
                whenToSeekUrgentCare: { type: "string" },
              },
              required: ["whatYouSaid", "whatThisMayIndicate", "recommendedNextStep", "whenToSeekUrgentCare"],
              additionalProperties: false,
            },
            symptoms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symptom: { type: "string" },
                  duration: { type: "string" },
                  severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] },
                  urgency: { type: "string", enum: ["Low", "Medium", "High", "Emergency"] },
                  possibleConcern: { type: "string" },
                  recommendedSpecialist: { type: "string" },
                  nextStep: { type: "string" },
                },
                required: ["symptom", "duration", "severity", "urgency", "possibleConcern", "recommendedSpecialist", "nextStep"],
                additionalProperties: false,
              },
            },
            isEmergency: { type: "boolean" },
            recommendedSpecialtyType: {
              type: "string",
              enum: ["Internal Medicine", "ENT", "Gastroenterology", "Family Medicine", "Pulmonology", "Urgent Care", "Cardiology", "Neurology", "Dermatology", "Orthopedics"],
            },
          },
          required: ["summary", "symptoms", "isEmergency", "recommendedSpecialtyType"],
          additionalProperties: false,
        },
      },
    },
  ], { type: "function", function: { name: "provide_research" } });
}

// ─── Agent 3: Verification & Safety ───
async function runVerificationAgent(apiKey: string, extractionResult: any, researchResult: any, transcript: string) {
  const system = `You are a SAFETY VERIFICATION agent for a medical navigation system. Your job is to independently review the outputs of previous agents and check for:
1. Unsafe or diagnosis-like language (any certainty like "you have X" or "this is definitely Y")
2. Urgency consistency — if red flags were detected, urgency should be High or Emergency
3. Logic consistency — do the recommended specialists match the symptoms?
4. Missing red flags — are there emergency symptoms the extraction agent may have missed?
5. Appropriateness — is the guidance safe for a non-medical navigation tool?

You MUST be strict. If anything is wrong, set passed to false and explain why.
If the previous agents used certainty language, REWRITE the problematic fields with safe language.`;

  const user = `Review these outputs for safety and correctness:

ORIGINAL TRANSCRIPT: "${transcript}"

EXTRACTION RESULT:
${JSON.stringify(extractionResult, null, 2)}

RESEARCH RESULT:
${JSON.stringify(researchResult, null, 2)}

Verify all outputs. If corrections are needed, provide corrected versions of specific fields.`;

  return callAI(apiKey, system, user, [
    {
      type: "function",
      function: {
        name: "verify_safety",
        description: "Verify safety and correctness of medical navigation outputs",
        parameters: {
          type: "object",
          properties: {
            passed: { type: "boolean", description: "True only if ALL checks pass. False if any issue found." },
            verificationNotes: {
              type: "array",
              items: { type: "string" },
              description: "List of checks performed and their results",
            },
            urgencyOverride: {
              type: "string",
              enum: ["none", "escalate_to_high", "escalate_to_emergency"],
              description: "Override urgency if extraction/research underestimated severity",
            },
            correctedSummary: {
              type: "object",
              description: "Corrected summary fields if unsafe language was found. Null if no corrections needed.",
              properties: {
                whatThisMayIndicate: { type: "string" },
                recommendedNextStep: { type: "string" },
                whenToSeekUrgentCare: { type: "string" },
              },
              additionalProperties: false,
            },
            missedRedFlags: {
              type: "array",
              items: { type: "string" },
              description: "Any emergency red flags the previous agents missed",
            },
          },
          required: ["passed", "verificationNotes", "urgencyOverride", "missedRedFlags"],
          additionalProperties: false,
        },
      },
    },
  ], { type: "function", function: { name: "verify_safety" } });
}

// ─── Doctor Matching ───
function getDoctorsForSpecialty(specialty: string) {
  const allDoctors = [
    { id: "1", name: "Dr. Sarah Chen", specialty: "Internal Medicine", location: "Bay Medical Center, Suite 201", distance: "1.2 mi", rating: 4.9, reviewCount: 342, availability: "Tomorrow, 10:00 AM", phone: "(555) 234-5678", imageUrl: "", acceptsNewPatients: true },
    { id: "2", name: "Dr. James Rivera", specialty: "ENT (Otolaryngology)", location: "Pacific Health Clinic", distance: "2.4 mi", rating: 4.8, reviewCount: 218, availability: "Wed, 2:30 PM", phone: "(555) 345-6789", imageUrl: "", acceptsNewPatients: true },
    { id: "3", name: "Dr. Priya Sharma", specialty: "Gastroenterology", location: "Summit Digestive Health", distance: "3.1 mi", rating: 4.7, reviewCount: 189, availability: "Thu, 9:00 AM", phone: "(555) 456-7890", imageUrl: "", acceptsNewPatients: true },
    { id: "4", name: "Dr. Michael Okafor", specialty: "Family Medicine", location: "Community Care Clinic", distance: "0.8 mi", rating: 4.9, reviewCount: 501, availability: "Today, 4:00 PM", phone: "(555) 567-8901", imageUrl: "", acceptsNewPatients: true },
    { id: "5", name: "Dr. Emily Watson", specialty: "Pulmonology", location: "Metro Lung & Sleep Center", distance: "4.5 mi", rating: 4.6, reviewCount: 156, availability: "Fri, 11:00 AM", phone: "(555) 678-9012", imageUrl: "", acceptsNewPatients: false },
    { id: "6", name: "Dr. David Kim", specialty: "Urgent Care", location: "QuickCare Walk-In Clinic", distance: "0.5 mi", rating: 4.5, reviewCount: 723, availability: "Open Now", phone: "(555) 789-0123", imageUrl: "", acceptsNewPatients: true },
    { id: "7", name: "Dr. Lisa Park", specialty: "Cardiology", location: "Heart & Vascular Institute", distance: "3.8 mi", rating: 4.9, reviewCount: 278, availability: "Mon, 9:00 AM", phone: "(555) 890-1234", imageUrl: "", acceptsNewPatients: true },
    { id: "8", name: "Dr. Robert Martinez", specialty: "Neurology", location: "NeuroHealth Center", distance: "5.2 mi", rating: 4.7, reviewCount: 164, availability: "Tue, 1:00 PM", phone: "(555) 901-2345", imageUrl: "", acceptsNewPatients: true },
    { id: "9", name: "Dr. Amanda Foster", specialty: "Dermatology", location: "Clear Skin Clinic", distance: "2.0 mi", rating: 4.8, reviewCount: 295, availability: "Wed, 10:30 AM", phone: "(555) 012-3456", imageUrl: "", acceptsNewPatients: true },
    { id: "10", name: "Dr. Kevin Wu", specialty: "Orthopedics", location: "Precision Bone & Joint", distance: "3.5 mi", rating: 4.7, reviewCount: 210, availability: "Thu, 2:00 PM", phone: "(555) 123-4567", imageUrl: "", acceptsNewPatients: true },
  ];

  const lower = specialty.toLowerCase();
  const matched = allDoctors.filter((d) =>
    d.specialty.toLowerCase().includes(lower) || lower.includes(d.specialty.toLowerCase().split(" ")[0])
  );

  const generalDoc = allDoctors.find((d) => d.specialty === "Family Medicine");
  const urgentDoc = allDoctors.find((d) => d.specialty === "Urgent Care");

  const results = [...matched];
  if (generalDoc && !results.find((d) => d.id === generalDoc.id)) results.push(generalDoc);
  if (urgentDoc && !results.find((d) => d.id === urgentDoc.id)) results.push(urgentDoc);

  return results.slice(0, 4);
}

// ─── Live Data Fetch (Airbyte Agent Connectors) ───
async function fetchDoctorsFromAirbyte(specialty: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/doctors?specialty=${encodeURIComponent(specialty)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Airbyte service fetch failed, falling back to mock:", err);
  }
  // Fallback if the python service isn't running
  return getDoctorsForSpecialty(specialty);
}

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Agent 1] Starting symptom extraction...");
    const extraction = await runSymptomExtraction(LOVABLE_API_KEY, transcript);
    console.log("[Agent 1] Extraction complete:", JSON.stringify(extraction).slice(0, 200));

    console.log("[Agent 2] Starting research agent...");
    const research = await runResearchAgent(LOVABLE_API_KEY, extraction);
    console.log("[Agent 2] Research complete:", JSON.stringify(research).slice(0, 200));

    console.log("[Agent 3] Starting verification agent...");
    const verification = await runVerificationAgent(LOVABLE_API_KEY, extraction, research, transcript);
    console.log("[Agent 3] Verification complete:", JSON.stringify(verification).slice(0, 200));

    // Apply verification overrides
    let finalSummary = { ...research.summary, verificationNotes: verification.verificationNotes || [] };
    let finalIsEmergency = research.isEmergency;
    let finalSymptoms = research.symptoms;

    // Apply corrected summary if verification found issues
    if (verification.correctedSummary) {
      if (verification.correctedSummary.whatThisMayIndicate) {
        finalSummary.whatThisMayIndicate = verification.correctedSummary.whatThisMayIndicate;
      }
      if (verification.correctedSummary.recommendedNextStep) {
        finalSummary.recommendedNextStep = verification.correctedSummary.recommendedNextStep;
      }
      if (verification.correctedSummary.whenToSeekUrgentCare) {
        finalSummary.whenToSeekUrgentCare = verification.correctedSummary.whenToSeekUrgentCare;
      }
    }

    // Apply urgency override
    if (verification.urgencyOverride === "escalate_to_emergency") {
      finalIsEmergency = true;
      finalSymptoms = finalSymptoms.map((s: any) => ({
        ...s,
        urgency: s.urgency === "Low" || s.urgency === "Medium" ? "High" : s.urgency,
      }));
    } else if (verification.urgencyOverride === "escalate_to_high") {
      finalSymptoms = finalSymptoms.map((s: any) => ({
        ...s,
        urgency: s.urgency === "Low" ? "Medium" : s.urgency,
      }));
    }

    // Add missed red flags as additional symptoms
    if (verification.missedRedFlags?.length > 0) {
      for (const flag of verification.missedRedFlags) {
        finalSymptoms.push({
          symptom: flag,
          duration: "Not specified",
          severity: "Severe",
          urgency: "High",
          possibleConcern: "Red flag identified by safety verification",
          recommendedSpecialist: "Urgent Care",
          nextStep: "Seek immediate medical evaluation",
        });
      }
      finalIsEmergency = true;
    }

    const specialtyType = research.recommendedSpecialtyType || "Family Medicine";
    const doctors = await fetchDoctorsFromAirbyte(finalIsEmergency ? "Urgent Care" : specialtyType);

    const result = {
      summary: finalSummary,
      symptoms: finalSymptoms,
      doctors,
      isEmergency: finalIsEmergency,
      verificationPassed: verification.passed,
      agentTrace: {
        extractionRedFlags: extraction.redFlags || [],
        verificationOverride: verification.urgencyOverride,
        missedRedFlags: verification.missedRedFlags || [],
      },
    };

    // Save to Ghost DBs for Context Engineering Challenge
    const GHOST_AGENT_MEMORY_URL = Deno.env.get("GHOST_AGENT_MEMORY_URL");
    const GHOST_VERIFIED_PATHWAYS_URL = Deno.env.get("GHOST_VERIFIED_PATHWAYS_URL");
    if (GHOST_AGENT_MEMORY_URL && GHOST_VERIFIED_PATHWAYS_URL) {
      const sqlMemory = postgres(GHOST_AGENT_MEMORY_URL);
      const sqlPathways = postgres(GHOST_VERIFIED_PATHWAYS_URL);
      
      try {
        console.log("[Ghost] Saving to agent_memory...");
        await sqlMemory`
          INSERT INTO session_logs (transcript, symptoms_extracted, verification_passed)
          VALUES (${transcript}, ${JSON.stringify(extraction)}, ${verification.passed})
        `;
      } catch (e) {
        console.error("Failed to save memory log:", e);
      } finally {
        await sqlMemory.end();
      }

      if (verification.passed) {
        try {
          console.log("[Ghost] Saving new patterns to verified_pathways...");
          for (const s of finalSymptoms) {
            await sqlPathways`
              INSERT INTO pathways (symptom, specialty_recommended, urgency)
              VALUES (${s.symptom}, ${s.recommendedSpecialist}, ${s.urgency})
            `;
          }
        } catch (e) {
          console.error("Failed to save pathway:", e);
        } finally {
          await sqlPathways.end();
        }
      } else {
         await sqlPathways.end();
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("care-guide error:", error);
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (error.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
