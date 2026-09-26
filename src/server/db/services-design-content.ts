/**
 * The approved Figma "Services" page catalogue: four service groups (eyebrow + name) and, for each, the
 * offerings shown as cards. A card is a service `deliverable`; `shortTitle` is the card's own title where the
 * design words it differently from the Home page's list (which keeps using `title`). Icons are the design's,
 * kept in public/media/figma.
 */
type Card = { title: string; shortTitle?: string; description: string; icon: string };
type Group = { name: string; slug: string; eyebrow: string; cards: Card[] };

export const SERVICE_CATALOGUE: Group[] = [
  {
    name: "Growth", slug: "growth", eyebrow: "Performance Marketing",
    cards: [
      { title: "Meta Ads", description: "Precision-targeted campaigns across Facebook & Instagram.", icon: "share-2" },
      { title: "Google Ads & Search Engine Precision", shortTitle: "Google Ads", description: "Search, display & shopping campaigns for maximum ROAS.", icon: "search" },
      { title: "Lead Generation", description: "Multi-channel funnels to fill your pipeline.", icon: "funnel-plus" },
      { title: "Remarketing", description: "Re-engage warm audiences across platforms.", icon: "refresh-cw" },
      { title: "Conversion Optimisation", description: "Data-driven testing to boost conversions.", icon: "trending-up" },
    ],
  },
  {
    name: "Social & Creative", slug: "social-and-creative", eyebrow: "Creative & Production",
    cards: [
      { title: "Social Media Management", description: "Strategy, content, scheduling & community management.", icon: "message-square" },
      { title: "Campaign Concepts", description: "Big-idea campaigns for launches and brand stories.", icon: "lightbulb-off" },
      { title: "Daily Creatives", description: "Fresh, on-brand designs delivered every day.", icon: "palette" },
      { title: "Video Advertising", shortTitle: "Video Ads", description: "Performance video content that demands attention.", icon: "video-off" },
      { title: "AI Video", shortTitle: "AI Videos", description: "AI-powered video production — fast and scalable.", icon: "cpu" },
    ],
  },
  {
    name: "Technology", slug: "technology", eyebrow: "Digital Infrastructure",
    cards: [
      { title: "High-Converting Websites", shortTitle: "Websites", description: "High-converting websites built for speed and performance.", icon: "laptop-minimal" },
      { title: "Landing Pages", description: "Conversion-optimised pages for campaigns and leads.", icon: "target" },
      { title: "CRM", description: "Custom CRM solutions to organise and convert leads.", icon: "database" },
      { title: "Automation", description: "Workflow automation that scales operations.", icon: "settings-2" },
      { title: "Integrations", description: "Seamless connections between all your tools.", icon: "layers-3" },
    ],
  },
  {
    name: "Customer Engagement", slug: "customer-engagement", eyebrow: "Customer Lifecycle",
    cards: [
      { title: "WhatsApp Marketing", description: "Broadcast campaigns and conversational commerce.", icon: "message-circle" },
      { title: "Lead Management System", shortTitle: "Lead Management", description: "Centralised tracking from inquiry to conversion.", icon: "user-check" },
      { title: "Call Centre Support", description: "Professional calling for sales and service.", icon: "phone-call" },
      { title: "Conversion Follow-up", description: "Systematic follow-up to close more deals.", icon: "mail-plus" },
    ],
  },
];

/** The service fields the catalogue defines, in the shape the services API stores. */
export const catalogueFields = (group: Group, index: number) => ({
  hero: { heading: group.name, label: group.eyebrow, ctas: [] },
  displayOrder: index,
  deliverables: group.cards.map((c) => ({
    title: c.title,
    ...(c.shortTitle ? { shortTitle: c.shortTitle } : {}),
    description: c.description,
    icon: { url: `/media/figma/svc-${c.icon}.svg`, alt: "", decorative: true, width: 28, height: 28 },
  })),
});
