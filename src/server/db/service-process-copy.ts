/**
 * The copy of the "Useful outputs at every stage" band (the dark process timeline) on each service offering page,
 * by offering slug: three stage titles, and where the section sentence was a shared template, its own sentence.
 * Stage descriptions are only listed where they are replaced; any other stage keeps the description already stored.
 *
 * Each title and sentence names what that service actually produces, so no two pages read alike and none is the
 * service's name with a word added. `scripts/update-service-process-copy.ts` writes this into the database;
 * `src/lib/service-copy-audit.ts` (npm run db:audit-process-copy) checks the result.
 */
export type ProcessCopy = { description?: string; stages: { title: string; description?: string }[] };

export const PROCESS_COPY: Record<string, ProcessCopy> = {
  "meta-ads": { stages: [{ title: "Account & audience plan" }, { title: "Campaign build & launch" }, { title: "Testing & performance reviews" }] },
  "google-ads": {
    description: "Deliverables reflect how your account is structured today and the mix of Search, Performance Max, display and YouTube it needs.",
    stages: [{ title: "Account & search strategy" }, { title: "Campaign & asset build" }, { title: "Search insight & optimisation" }],
  },
  "lead-generation": {
    description: "Deliverables follow your offer, the channels that feed it and how your team qualifies and follows up each lead.",
    stages: [{ title: "Offer & funnel plan" }, { title: "Campaign & landing build" }, { title: "Lead quality reviews" }],
  },
  remarketing: {
    description: "Deliverables follow your visitor audiences, the windows you re-engage them in and the offers each stage needs.",
    stages: [{ title: "Audience & sequence plan" }, { title: "Audience & creative build" }, { title: "Frequency & fatigue reviews" }],
  },
  "conversion-optimisation": {
    description: "Deliverables follow the pages, forms and journeys with the most room to improve, and the traffic available to test on.",
    stages: [{ title: "Journey & friction audit" }, { title: "Experiment build & testing" }, { title: "Results & roll-out" }],
  },
  "social-media-management": { stages: [{ title: "Channel & content strategy" }, { title: "Calendar, publishing & community" }, { title: "Performance & content review" }] },
  "campaign-concepts": { stages: [{ title: "Brief & big idea" }, { title: "Creative platform & executions" }, { title: "Feedback & adaptation" }] },
  "daily-creatives": {
    description: "Deliverables follow the channels you publish on, your brand templates and the volume and formats each one needs.",
    stages: [{ title: "Brief, templates & rhythm" }, { title: "Daily asset production" }, { title: "Creative performance review" }],
  },
  "video-ads": {
    stages: [
      { title: "Concept & Script", description: "A video concept and script built around one clear message; alignment on the campaign objective, audience and call to action; and approval of the script before anything is shot." },
      { title: "Production & Editing", description: "The video produced and edited to the approved script; branding, captions and on-screen text added; and any variations needed for testing." },
      { title: "Adaptation & Delivery", description: "The final video formatted for each platform and placement it will run on; the lengths and aspect ratios each one needs; and files delivered ready to run." },
    ],
  },
  "ai-videos": { stages: [{ title: "Use cases & script" }, { title: "AI production & human review" }, { title: "Versions & workflow refinement" }] },
  "landing-pages": {
    description: "Deliverables follow the campaign each page serves, the action you want visitors to take and the systems it must feed.",
    stages: [{ title: "Goal & message plan" }, { title: "Page design & build" }, { title: "Behaviour & variation testing" }],
  },
  crm: { stages: [{ title: "Process & Requirements Mapping" }, { title: "System Setup & Integration" }, { title: "Optimisation & Reporting" }] },
  automation: { stages: [{ title: "Task & Workflow Mapping" }, { title: "Workflow Design & Build" }, { title: "Monitoring & Optimisation" }] },
  "whatsapp-marketing": { stages: [{ title: "Audience & Campaign Setup" }, { title: "Broadcasts & Reply Routing" }, { title: "Response Review & Refinement" }] },
};
