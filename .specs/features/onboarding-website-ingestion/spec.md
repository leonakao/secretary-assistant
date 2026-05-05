# Onboarding Website Ingestion Specification

## Problem Statement

During onboarding, business owners often already have a website with opening
hours, services, prices, location, policies, and FAQs. Asking them to manually
repeat all of that information makes onboarding slower and produces incomplete
company profiles. The onboarding assistant should be able to use website URLs
provided by the owner to load public company information and continue the
interview from a better baseline.

## Goals

- [ ] Let the onboarding assistant process public HTTP/HTTPS URLs provided by
      the owner during onboarding.
- [ ] Extract useful company facts from fetched website content and make them
      available through the conversation/tool history used by the onboarding
      assistant and final company knowledge base.
- [ ] Keep URL access safe, bounded, and tenant-scoped.
- [ ] Preserve the guided onboarding flow: the assistant still asks follow-up
      questions and only finishes after explicit owner confirmation.
- [ ] Show contextual onboarding chat loading text while the assistant executes
      longer-running tools.

## Out of Scope

- Authenticated/private website access.
- JavaScript browser rendering, login flows, CAPTCHAs, or screenshots.
- Full-site crawling, sitemap traversal, or continuous website monitoring in the
  MVP.
- A dedicated website-ingestion database table in the MVP.
- Automatically trusting scraped content over explicit owner corrections.
- Client-facing runtime website search after onboarding is complete.

---

## User Stories

### P1: Load A Provided Website URL During Onboarding - MVP

**User Story**: As a business owner, I want to send my company website URL to
the onboarding assistant so that it can preload known business information
instead of asking me to retype everything.

**Why P1**: This is the smallest complete slice: owner gives URL, assistant
loads content, and onboarding immediately improves.

**Acceptance Criteria**:

1. WHEN an onboarding owner message contains an HTTP or HTTPS URL THEN the
   system SHALL allow the onboarding assistant to request website ingestion for
   that URL.
2. WHEN the website is reachable and returns supported HTML/text content THEN
   the system SHALL extract readable text, summarize business-relevant facts,
   and return a structured tool result with the source URL.
3. WHEN website information is added THEN the assistant SHALL tell the owner
   what it found at a high level and continue by asking for missing or
   confirmation-worthy information.
4. WHEN the final onboarding summary is generated THEN the system SHALL include
   owner-confirmed and website-derived information from the conversation/tool
   history in the company knowledge base without inventing unsupported facts.
5. WHEN the same URL is provided again for the same company THEN the system
   SHALL avoid duplicate profile content in the final summary.

**Independent Test**: In the onboarding web chat, paste a public company URL.
The transcript shows the assistant using website-derived facts, and the final
company description includes those facts with no duplicate sections.

---

### P1: Block Unsafe Or Unsupported URLs

**User Story**: As the system owner, I want URL ingestion to reject unsafe or
unsupported targets so that onboarding cannot be used as a server-side request
forgery vector or resource exhaustion path.

**Why P1**: Website fetch is a network boundary and must be safe before release.

**Acceptance Criteria**:

1. WHEN a URL uses a non-HTTP(S) protocol THEN the system SHALL reject it before
   any outbound request.
2. WHEN a URL resolves to localhost, private, loopback, link-local, multicast, or
   otherwise blocked network ranges THEN the system SHALL reject it before
   fetching content.
3. WHEN a fetch exceeds configured timeout, redirect, byte, or content limits
   THEN the system SHALL stop processing and return a recoverable tool result.
4. WHEN the target content type is unsupported THEN the system SHALL not send raw
   content to the model and SHALL explain that the page could not be processed.
5. WHEN ingestion fails THEN the assistant SHALL continue onboarding normally
   and ask the owner to provide the key business details manually.

**Independent Test**: Submit `http://localhost:3000`, a private IP URL, a large
file URL, and a valid public HTML URL. Only the valid public HTML URL is fetched.

---

### P1: Show Tool-Specific Loading In Onboarding Chat

**User Story**: As a business owner, I want the onboarding chat loading state to
say what the assistant is doing so that long-running tool execution feels
transparent instead of stuck.

**Why P1**: Website reading and final onboarding can take longer than a normal
assistant response, and the user needs clear feedback while waiting.

**Acceptance Criteria**:

1. WHEN the assistant is generating a normal text response THEN the chat SHALL
   keep showing the generic typing/loading state.
2. WHEN the assistant is executing `readWebsiteUrl` THEN the chat SHALL show a
   contextual loading label such as `Pesquisando na web...`.
3. WHEN the assistant is executing `finishOnboarding` THEN the chat SHALL show a
   contextual loading label such as `Finalizando o onboarding...`.
4. WHEN tool execution finishes or fails THEN the contextual loading state SHALL
   clear and the conversation SHALL continue normally.
5. WHEN the backend cannot expose a specific activity THEN the UI SHALL fall
   back to the generic assistant typing state.

**Independent Test**: Trigger website URL reading and onboarding finalization in
the onboarding chat; the loading bubble changes to the tool-specific label while
the tool is running and clears after the assistant reply arrives.

---

### P2: Process Several Explicit URLs In One Message

**User Story**: As a business owner, I want to provide multiple relevant pages
such as services, pricing, and contact pages so that the assistant gets a fuller
company profile.

**Why P2**: Many businesses spread important information across several pages,
but this can build on the single-URL MVP.

**Acceptance Criteria**:

1. WHEN an owner provides multiple explicit URLs in a single onboarding message
   THEN the system SHALL detect and process them within per-message and
   per-company URL-reading limits.
2. WHEN multiple summaries overlap THEN the system SHALL merge them into a
   coherent company knowledge base without repeating the same facts.
3. WHEN some URLs fail and others succeed THEN the assistant SHALL report the
   partial result and continue onboarding.

**Independent Test**: Submit one onboarding message containing three public pages
from the same business website; the final company profile includes a merged,
non-duplicated summary.

---

### P3: Suggest Missing Website Pages

**User Story**: As a business owner, I want the assistant to suggest useful
website pages to share so that I know what additional information may help.

**Why P3**: Helpful, but not required to unlock the core workflow.

**Acceptance Criteria**:

1. WHEN the first ingested page lacks core business facts THEN the assistant
   SHALL suggest specific page types to share, such as services, pricing,
   contact, FAQ, or policy pages.

---

## Edge Cases

- WHEN a URL is malformed THEN the assistant SHALL ask the owner to resend a
  valid full URL.
- WHEN DNS lookup fails THEN the assistant SHALL continue onboarding and ask for
  manual details.
- WHEN the page is mostly navigation, boilerplate, or empty text THEN the system
  SHALL store no business facts and tell the assistant that little useful
  information was found.
- WHEN fetched content conflicts with explicit owner statements THEN owner
  statements SHALL take precedence.
- WHEN website content contains prompt-injection instructions THEN the system
  SHALL treat them as untrusted source text and not as instructions.
- WHEN the website is in Portuguese or English THEN the system SHALL summarize
  facts in Portuguese for the onboarding conversation.

---

## Success Criteria

- [ ] A business owner can paste a valid public URL during onboarding and see the
      assistant use information from it in the next response.
- [ ] Unsafe URL attempts are rejected before outbound fetch.
- [ ] Website-derived summaries appear in the tool/conversation history with
      source URL and timestamp.
- [ ] Final company knowledge base includes relevant website facts while
      preserving owner corrections.
- [ ] Unit tests cover URL validation, extraction, summarization, tool result
      formatting, and onboarding tool behavior.
