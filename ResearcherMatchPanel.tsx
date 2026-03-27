/**
 * ResearcherMatchPanel.tsx
 *
 * Drop into ResultsPanel.tsx as tab index 3 ("Researchers").
 * Mirrors the style of DoctorCard.tsx and SymptomTable.tsx.
 *
 * Usage in ResultsPanel.tsx:
 *   import ResearcherMatchPanel from "./ResearcherMatchPanel";
 *   // Add "Researchers" to your tabs array
 *   // Render <ResearcherMatchPanel data={results.researcherMatch} /> in tab 3
 */

import { useState } from "react";
import type { ResearcherMatchOutput, ResearcherProfile, ClinicalTrial } from "../types/care-guide";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const styles = {
    high:   "bg-green-50  text-green-800  border-green-200",
    medium: "bg-amber-50  text-amber-800  border-amber-200",
    low:    "bg-gray-50   text-gray-600   border-gray-200",
  };
  const labels = { high: "Strong match", medium: "Possible match", low: "Exploratory" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function ContactBadge({ path }: { path: ResearcherProfile["contactPath"] }) {
  const map = {
    direct:           { label: "Direct contact", color: "bg-blue-50 text-blue-700 border-blue-200" },
    referral:         { label: "GP referral needed", color: "bg-purple-50 text-purple-700 border-purple-200" },
    trial_enrollment: { label: "Trial enrollment", color: "bg-teal-50 text-teal-700 border-teal-200" },
  };
  const { label, color } = map[path];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label}
    </span>
  );
}

function TrialCard({ trial }: { trial: ClinicalTrial }) {
  return (
    <div className="border border-teal-100 bg-teal-50/50 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
          {trial.trialId}
        </span>
        <span className="text-xs text-teal-600">{trial.phase}</span>
        {trial.enrollmentStatus === "open" && (
          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            Enrolling now
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800">{trial.title}</p>
      <p className="text-xs text-gray-500">{trial.eligibilitySummary}</p>
    </div>
  );
}

function ResearcherCard({ researcher }: { researcher: ResearcherProfile }) {
  const [expanded, setExpanded] = useState(false);
  const openTrials = researcher.activeTrials.filter((t) => t.enrollmentStatus === "open");

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{researcher.name}</p>
          <p className="text-xs text-gray-500">{researcher.institution}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ContactBadge path={researcher.contactPath} />
          {!researcher.acceptingPatients && (
            <span className="text-xs text-gray-400">Referral only</span>
          )}
        </div>
      </div>

      {/* Match reason */}
      {researcher.matchReason && (
        <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
          {researcher.matchReason}
        </p>
      )}

      {/* Specialties */}
      <div className="flex flex-wrap gap-1">
        {researcher.specialties.map((s) => (
          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {s}
          </span>
        ))}
      </div>

      {/* Open trials preview */}
      {openTrials.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            {expanded ? "▾" : "▸"} {openTrials.length} open trial{openTrials.length > 1 ? "s" : ""} available
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {openTrials.map((t) => <TrialCard key={t.trialId} trial={t} />)}
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <button
        disabled={!researcher.acceptingPatients}
        className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
          researcher.acceptingPatients
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        onClick={() =>
          alert(
            `Demo: Would initiate ${researcher.contactPath} pathway for ${researcher.name}`
          )
        }
      >
        {researcher.contactPath === "trial_enrollment"
          ? "Check trial eligibility"
          : researcher.acceptingPatients
          ? "Request connection"
          : "Requires GP referral"}
      </button>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  data: ResearcherMatchOutput | null;
  isLoading?: boolean;
}

export default function ResearcherMatchPanel({ data, isLoading }: Props) {
  // Loading state (while Agent 4 is running)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm">Searching researcher database...</p>
      </div>
    );
  }

  // Not a rare condition case
  if (!data || !data.isRareConditionCase) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
        <p className="text-sm font-medium">No researcher matching triggered</p>
        <p className="text-xs text-center max-w-xs">
          Researcher matching activates for unusual, complex, or undiagnosed presentations.
          Your care pathway has been provided in the Summary tab.
        </p>
      </div>
    );
  }

  const { matchedResearchers, openTrials, conditionHypotheses, knowledgeGapNote,
          recommendedNextStep, agentConfidence } = data;

  return (
    <div className="space-y-5 py-2">

      {/* Disclaimer — always first */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <strong>Navigation only.</strong> This section connects you with researchers who
        study conditions similar to yours. It is not a diagnosis. Always consult a licensed
        physician before pursuing any research pathway or clinical trial.
      </div>

      {/* Confidence + summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Matched researchers</h3>
        <ConfidenceBadge level={agentConfidence} />
      </div>

      {/* Condition hypotheses */}
      {conditionHypotheses.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Possible research directions
          </p>
          <ul className="space-y-1">
            {conditionHypotheses.map((h, i) => (
              <li key={i} className="text-sm text-blue-900">• {h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Knowledge gap */}
      {knowledgeGapNote && (
        <p className="text-xs text-gray-500 italic px-1">{knowledgeGapNote}</p>
      )}

      {/* Researcher cards */}
      {agentConfidence === "low" ? (
        <div className="text-sm text-gray-500 text-center py-4">
          Match confidence is too low to show researcher suggestions. {recommendedNextStep}
        </div>
      ) : (
        <div className="space-y-3">
          {matchedResearchers.map((r) => (
            <ResearcherCard key={r.id} researcher={r} />
          ))}
        </div>
      )}

      {/* Open trials summary */}
      {openTrials.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            All open trials from matched researchers
          </p>
          {openTrials.map((t) => <TrialCard key={t.trialId} trial={t} />)}
        </div>
      )}

      {/* Recommended next step */}
      {recommendedNextStep && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Recommended next step
          </p>
          <p className="text-sm text-gray-800">{recommendedNextStep}</p>
        </div>
      )}
    </div>
  );
}
