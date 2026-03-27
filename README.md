# CareGuide AI — Verified Voice Agents for Medical Navigation

> A voice-first, multi-agent medical navigation assistant that helps users understand health concerns, receive verified AI-driven guidance, and find the right healthcare provider — without ever claiming to diagnose.

🔗 **Live Demo**: [CareGuide AI](https://id-preview--71a3f9ea-fd4a-4857-b760-015b3846ea5e.lovable.app)

---

## 🎯 What It Does

1. **User speaks** a health concern into the microphone (or types it)
2. **Multiple AI agents** work sequentially to extract symptoms, research care pathways, and verify safety
3. **A dedicated Verification Agent** independently reviews all outputs for unsafe language, missed red flags, and logic consistency — and can override/escalate urgency
4. **Structured results** appear across 3 tabs: Summary, Symptom Table, and Doctor Suggestions
5. **Users can book** appointments with matched specialists (demo mode)

The system is explicitly a **navigation assistant**, not a diagnosis engine. All outputs use cautious language ("possible concern", "may indicate", "consider seeing").

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  Voice Input → Agent Viz → Solution Orb → Results Panel         │
│  (Web Speech API / Text Fallback)                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS POST /functions/v1/care-guide
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Edge Function: care-guide (Deno)                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Agent 1:     │→ │ Agent 2:     │→ │ Agent 3:             │  │
│  │ Symptom      │  │ Research &   │  │ Verification &       │  │
│  │ Extraction   │  │ Care Pathway │  │ Safety Override      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  Each agent = separate AI call with structured tool output      │
│  Verification agent can OVERRIDE urgency and REWRITE outputs    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lovable AI Gateway (Gemini)                        │
│              google/gemini-3-flash-preview                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Agent Pipeline

| Agent | Purpose | Real AI Call? | Can Override? |
|-------|---------|:---:|:---:|
| **Voice Intake** | Captures user speech via Web Speech API | Browser API | — |
| **Symptom Extraction** | Extracts symptoms, duration, severity, red flags | ✅ | — |
| **Research Agent** | Maps symptoms to urgency, specialists, care pathways | ✅ | — |
| **Verification Agent** | Safety review — checks language, logic, missed red flags | ✅ | ✅ Can escalate urgency, rewrite summaries, add missed red flags |
| **Doctor Matching** | Filters provider database by recommended specialty | Logic | — |
| **Booking Agent** | Presents booking UI (demo mode) | UI | — |

### Verification Agent Details

The verification agent is a **separate, independent AI call** that reviews all previous agent outputs. It can:

- **Reject** outputs that contain diagnostic certainty
- **Escalate urgency** from Low→Medium or Medium→Emergency
- **Rewrite** summary fields that use unsafe language
- **Add missed red flags** as additional high-urgency symptoms
- **Override** the `isEmergency` flag if warranted

This is the project's core differentiator — AI that verifies its own AI.

---

## 🛡 Sponsor Architecture Mapping

### AWS — Infrastructure Backbone
- **Role**: Hosting, compute, CDN
- **Implementation**: Lovable Cloud runs on AWS infrastructure. Edge functions execute on Deno Deploy (AWS-backed). Static assets served via CDN.
- **Production path**: ECS/Lambda for agent scaling, CloudFront for global distribution, S3 for asset storage

### Auth0 — Identity & Security Layer
- **Role**: User authentication, session management, RBAC
- **Architecture**: Auth0 Universal Login for patient/provider authentication. JWT tokens for API authorization. Role-based access for admin vs. patient views.
- **Production path**: Auth0 SDK integration with React, token-based edge function auth

### Bland AI — Voice Interaction Layer
- **Role**: Production-grade voice AI for real-time medical intake
- **Current**: Web Speech API as demo substitute (works instantly, no setup)
- **Production path**: Bland AI telephony API for phone-based intake, real-time transcription with medical terminology support, multi-language voice support

### Aerospike — Real-Time Session State
- **Role**: Sub-millisecond session state for active consultations
- **Architecture**: Stores active session data (current transcript, agent progress, partial results) in Aerospike's in-memory store. Separates real-time session state from long-term knowledge storage.
- **Production path**: Aerospike client in edge functions, session TTL for auto-cleanup, cross-device session continuity

### TrueFoundry — Agent Deployment & Observability
- **Role**: Deploy, monitor, and trace multi-agent pipelines
- **Architecture**: Each agent logged with TrueFoundry for latency tracking, error rates, and output quality metrics. Enables A/B testing of agent prompts.
- **Production path**: TrueFoundry model registry for prompt versioning, observability dashboards for agent performance

### Airbyte — Provider Data Ingestion
- **Role**: Ingest and sync healthcare provider databases
- **Architecture**: Airbyte connectors pull provider data from NPI registries, insurance networks, and hospital systems into the doctor matching database.
- **Production path**: Scheduled syncs from multiple provider data sources, deduplication and normalization pipeline

### Overmind — Workflow Optimization
- **Role**: Optimize agent orchestration and resource allocation
- **Architecture**: Analyzes agent pipeline performance to optimize sequencing, parallelism, and resource allocation. Identifies bottleneck agents and suggests prompt improvements.
- **Production path**: Overmind optimization layer between orchestrator and agents

### Kiro — Development Workflow
- **Role**: AI-powered development planning and spec generation
- **Used for**: Architecture planning, component specification, agent contract definition during development

### Macroscope — Codebase Understanding
- **Role**: Codebase analysis and documentation generation
- **Used for**: Understanding cross-component dependencies, maintaining architectural consistency across the multi-agent system

---

## 🧠 Knowledge Architecture

### Verified Knowledge Store (Conceptual)

```
┌─────────────────────┐     ┌──────────────────────┐
│ Real-time Session    │     │ Verified Knowledge   │
│ (Aerospike)          │     │ (Vector DB)          │
│                      │     │                      │
│ - Active transcript  │     │ - Verified symptom   │
│ - Agent progress     │     │   → specialist maps  │
│ - Partial results    │     │ - Anonymized care    │
│ - Session TTL: 30min │     │   pathways           │
│                      │     │ - Only verification- │
│ Private, ephemeral   │     │   passed outputs     │
└─────────────────────┘     └──────────────────────┘
```

**Key principles**:
- Raw medical conversations are **never stored** long-term
- Only **verified, anonymized** care pathway mappings enter the knowledge store
- Vector similarity enables reuse of validated guidance for similar symptom patterns
- Session state is ephemeral and auto-expires

---

## 🚨 Safety Guardrails

1. **System prompts** enforce navigation-only language across all agents
2. **Verification agent** independently checks for unsafe language and can rewrite outputs
3. **Emergency detection** triggers prominent "Call 911" / "Find Nearest ER" CTAs
4. **Persistent disclaimer** banner on every screen
5. **No raw storage** of private medical conversations
6. **Urgency escalation** — verification agent can override if previous agents underestimated severity

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Animations | Framer Motion |
| Voice | Web Speech API (Bland AI in production) |
| Backend | Lovable Cloud Edge Functions (Deno) |
| AI | Lovable AI Gateway → Google Gemini 3 Flash |
| State | React hooks (Aerospike in production) |
| Routing | React Router v6 |
| UI Components | shadcn/ui + Radix Primitives |

---

## 🎬 Demo Script (90 seconds)

1. **Open app** → Show 4-panel layout, explain each panel (10s)
2. **Click mic** → Say "I've had a sore throat for 3 days and a mild fever" (10s)
3. **Watch agents** → Point out sequential agent animation in center panel (15s)
4. **Verification** → Show green "Safety Verified" badge or warning state (10s)
5. **Summary tab** → Read AI-generated navigation guidance (10s)
6. **Table tab** → Show structured symptom analysis with urgency levels (10s)
7. **Doctors tab** → Show specialty-matched doctors, click Book (10s)
8. **Emergency demo** → Type "chest pain and difficulty breathing" → Show red emergency CTA with Call 911 button (15s)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── VoiceInputPanel.tsx      # Voice orb + text input fallback
│   ├── AgentOrchestrationPanel.tsx  # 6 animated agent rails
│   ├── AgentRail.tsx            # Single agent progress line
│   ├── SolutionOrbPanel.tsx     # Green verified / red warning orb
│   ├── ResultsPanel.tsx         # 3-tab results container
│   ├── SummaryView.tsx          # Plain-language summary + emergency CTA
│   ├── SymptomTable.tsx         # Structured findings table
│   ├── DoctorCard.tsx           # Provider card with booking
│   ├── BookingModal.tsx         # Demo booking flow
│   └── DisclaimerBanner.tsx     # Persistent safety disclaimer
├── hooks/
│   ├── useAgentOrchestration.ts # Pipeline orchestrator
│   └── useSpeechRecognition.ts  # Web Speech API wrapper
├── types/
│   └── care-guide.ts            # All type definitions
├── data/
│   └── mock-doctors.ts          # 10 mock provider profiles
└── pages/
    └── Index.tsx                 # Main 4-panel layout

supabase/functions/
└── care-guide/
    └── index.ts                 # 3-agent AI pipeline (extraction → research → verification)
```

---

## 🚀 Getting Started

This project runs on [Lovable](https://lovable.dev). To develop:

1. Open the project in Lovable
2. The backend (edge functions, AI gateway) is pre-configured
3. Click the mic or type a health concern to test
4. View agent orchestration in real-time

---

## ⚖️ Disclaimer

CareGuide AI is a **demonstration prototype** for hackathon purposes. It provides health navigation information only and is **not a substitute for professional medical advice, diagnosis, or treatment**. Always consult a qualified healthcare provider for medical concerns.
