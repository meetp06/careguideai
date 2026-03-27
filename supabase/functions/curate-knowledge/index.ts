import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Knowledge Curation Agent (Agent 7)
 *
 * This edge function receives verified results from the frontend pipeline,
 * strips personal data, and converts the output into reusable structured
 * knowledge that can be stored in a vector database.
 *
 * Current implementation: Logs the curated entry (demo mode).
 * Production: Would write to Aerospike for real-time state and a vector DB
 * for long-term semantic memory.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, isEmergency, verificationPassed } = await req.json();

    if (!symptoms || !Array.isArray(symptoms)) {
      return new Response(JSON.stringify({ error: "Missing symptoms data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip any potential personal information from the data
    const anonymizedSymptoms = symptoms.map((s: any) => ({
      symptom: s.symptom,
      severity: s.severity,
      urgency: s.urgency,
      possibleConcern: s.possibleConcern,
      recommendedSpecialist: s.recommendedSpecialist,
      // Explicitly exclude: duration (may contain personal timeline info),
      // nextStep (may reference personal context)
    }));

    // Build reusable knowledge entry
    const knowledgeEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      cleanedSymptomSummary: anonymizedSymptoms
        .map((s: any) => s.symptom)
        .join(", "),
      verifiedGuidance: anonymizedSymptoms
        .map(
          (s: any) =>
            `${s.symptom} (${s.urgency}) → ${s.recommendedSpecialist}`
        )
        .join("; "),
      urgencyLevel: isEmergency ? "Emergency" : "Standard",
      recommendedSpecialists: [
        ...new Set(
          anonymizedSymptoms.map((s: any) => s.recommendedSpecialist)
        ),
      ],
      verificationScore: verificationPassed ? 1.0 : 0.5,
      sourceTags: ["voice-intake", "multi-agent-pipeline"],
      anonymized: true,
    };

    console.log(
      "[Knowledge Curation] Curated entry:",
      JSON.stringify(knowledgeEntry).slice(0, 500)
    );

    // In production, this would:
    // 1. Generate embedding via AI model
    // 2. Store in vector database (e.g., Pinecone, Weaviate)
    // 3. Cache in Aerospike for real-time retrieval
    // 4. Update similarity index

    return new Response(
      JSON.stringify({
        stored: true,
        knowledgeId: knowledgeEntry.id,
        message: "Knowledge entry curated and stored (demo mode)",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("curate-knowledge error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Knowledge curation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
