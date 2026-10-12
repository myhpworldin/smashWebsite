import type { CareerWorkMode } from "@/lib/career-options";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, type LeadPriority, type LeadSource, type LeadStatus } from "@/lib/lead-options";
import type {
  Cta,
  Media,
  Metric,
  Seo,
  TitledItem,
} from "@/server/validation/common";
import type {
  FaqItem,
  HeroContent,
  HomeBannerCta,
  HomeCtaSection,
  HomeGrowthEngine,
  HomeIndustries,
  HomeMetricSection,
  HomeOurStory,
  HomeSectionIntro,
  HomeStory,
  HomeTechnology,
  HomeWhySmash,
  SiteContact,
  SocialLink,
  Tool,
  TitledCopy,
} from "@/server/validation/content";

/**
 * MongoDB collections. Every document's `_id` is the record's id (a UUID
 * string, or `"default"` for the two singletons); `toRow()` in `helpers.ts`
 * exposes it as `id`. Page-specific copy is embedded; reusable content is
 * referenced by id, and the many-to-many links live in their own small
 * collections (`replaceLinks`), never copied.
 *
 * The constants below double as collection names and as the table
 * identifiers every service passes to the helpers.
 */
export const clients = "clients" as const;
export const teamMembers = "team_members" as const;
export const testimonials = "testimonials" as const;
export const careers = "careers" as const;
export const services = "services" as const;
export const caseStudies = "case_studies" as const;
export const insights = "insights" as const;
export const siteSettings = "site_settings" as const;
export const enquiries = "enquiries" as const;
export const leads = "leads" as const;
/** One row per lead event (created, status change, assignment, note, ...) — a separate collection, not an embedded array, so a long-lived lead's history can grow without bound (unlike `enquiries.submissions`, which is capped because an enquiry is an immutable log entry, not a record that accumulates CRM activity for months). */
export const leadActivity = "lead_activity" as const;
/** CRM administrator accounts (CRM Phase 2). Distinct from `admin-auth.ts`'s two shared bearer tokens (the pre-existing CMS content API's "administrator"/"editor" roles): those have no per-user identity at all, so they cannot represent "who is logged into the CRM" and were not extended. */
export const adminUsers = "admin_users" as const;
export const homePage = "home_page" as const;
export const redirects = "redirects" as const;
export const serviceCaseStudies = "service_case_studies" as const;
export const insightServices = "insight_services" as const;
export const insightCaseStudies = "insight_case_studies" as const;
export const homeServices = "home_services" as const;
export const homeCaseStudies = "home_case_studies" as const;
export const homeTestimonials = "home_testimonials" as const;
export const homeInsights = "home_insights" as const;
export const homeTeam = "home_team" as const;

export const SINGLETON_ID = "default";

export type ContentStatus = "draft" | "published";
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";
/** The only CRM admin role today ("minimum appropriate role mechanism" — CRM Phase 2 brief). A plain union, not a shared constants file like `lead-options.ts`'s, because nothing outside this schema needs to enumerate it yet; add one the moment a second role does. */
export type AdminUserRole = "administrator";

type Timestamps = { createdAt: Date; updatedAt: Date };
type Workflow = { status: ContentStatus };
type Publishable = Workflow & { publishedAt: Date | null };

export type EnquirySubmission = { message: string | null; serviceOfInterest: string | null; monthlyBudget: string | null; primaryGoal: string | null; submittedAt: Date };

/** The shape of a row as the services see it (`id` = the document's `_id`; absent optional columns read as `null`). */
export interface Rows {
  clients: { id: string; name: string; description: string | null; website: string | null; industry: string | null; logo: Media | null; displayOrder: number } & Workflow & Timestamps;
  team_members: { id: string; name: string; role: string; group: string | null; shortBio: string | null; photo: Media | null; displayOrder: number } & Workflow & Timestamps;
  testimonials: { id: string; quote: string; personName: string; personRole: string | null; companyName: string | null; clientId: string | null; serviceId: string | null; photo: Media | null; displayOrder: number } & Workflow & Timestamps;
  careers: {
    id: string; title: string; slug: string; summary: string; description: string | null; requirements: string[]; responsibilities: string[];
    location: string | null; department: string | null; workMode: CareerWorkMode | null; employmentType: EmploymentType | null; seo: Seo | null;
  } & Publishable & Timestamps;
  services: {
    id: string; name: string; slug: string; shortDescription: string; description: string | null; hero: HeroContent | null; problem: TitledCopy | null; solution: TitledCopy | null;
    deliverables: (TitledItem & { shortTitle?: string })[]; process: TitledItem[]; tools: Tool[]; faqs: FaqItem[]; cta: Cta | null; seo: Seo | null; displayOrder: number;
  } & Publishable & Timestamps;
  case_studies: {
    id: string; title: string; slug: string; summary: string; clientId: string | null; industry: string | null; challenge: string | null; strategy: string | null; execution: string | null;
    results: Metric[]; heroImage: Media | null; media: Media[]; testimonialId: string | null; seo: Seo | null;
  } & Publishable & Timestamps;
  insights: {
    id: string; title: string; slug: string; excerpt: string; content: string; authorId: string | null; featuredImage: Media | null; category: string | null; tags: string[]; seo: Seo | null;
  } & Publishable & Timestamps;
  site_settings: {
    id: string; siteName: string; siteDescription: string | null; logo: Media | null; favicon: Media | null; socialLinks: SocialLink[]; contact: SiteContact | null;
    defaultCta: Cta | null; defaultSeo: Seo | null; defaultOgImage: Media | null; updatedAt: Date;
  };
  /** One record per phone number: identity fields and the `*` latest-enquiry fields hold the most recent values; `submissions` keeps every enquiry (newest last). */
  enquiries: {
    id: string; name: string; phone: string; phoneKey: string; location: string | null; email: string | null; companyName: string | null; website: string | null;
    message: string | null; serviceOfInterest: string | null; monthlyBudget: string | null; primaryGoal: string | null;
    submissionCount: number; submissions: EnquirySubmission[]; createdAt: Date; updatedAt: Date;
  };
  /**
   * One row per contact-form submission (unlike `enquiries`, which merges repeat submissions from the
   * same phone into one document) — a CRM lead is a pipeline record that gets its own status/priority/
   * assignment over time, so each submission must stay independently trackable. `phoneKey`/`email` are
   * stored for future duplicate-lookup (Phase 4+), deliberately not unique — a returning visitor is a
   * legitimate second lead, not an overwrite. `primaryService` stores the matching service's stable
   * `slug` (from the `services` collection), not its display name.
   */
  leads: {
    id: string; fullName: string; companyName: string | null; websiteOrInstagram: string | null; phone: string; phoneKey: string | null; email: string | null; location: string;
    primaryService: string | null; monthlyMarketingBudget: string | null; primaryGoal: string | null; additionalContext: string | null;
    status: LeadStatus; priority: LeadPriority; source: LeadSource; assignedTo: string | null; createdAt: Date; updatedAt: Date;
  };
  /** An append-only timeline/audit entry for one lead (`leadId`). `type` is deliberately an open string, not a DB-enforced enum: the set of admin actions (status change, assignment, note, ...) is expected to grow, and this collection doubles as both the future activity timeline and the audit trail (who/what/when/before/after) rather than building two parallel systems. */
  lead_activity: { id: string; leadId: string; type: string; message: string | null; previousValue: unknown; newValue: unknown; actor: string | null; createdAt: Date };
  /** `passwordHash` is `<salt-hex>:<hash-hex>` (`server/lib/password.ts`) — never a plaintext password, and every service function that returns this row to a caller outside this module strips it (`toPublic` in `admin-users.service.ts`). */
  admin_users: { id: string; email: string; passwordHash: string; role: AdminUserRole; isActive: boolean; createdAt: Date; updatedAt: Date };
  home_page: {
    id: string; hero: HeroContent | null; businessProof: HomeMetricSection | null; story: HomeStory | null; servicesSection: HomeSectionIntro | null; growthEngine: HomeGrowthEngine | null;
    selectedWorkSection: HomeSectionIntro | null; results: HomeMetricSection | null; whySmash: HomeWhySmash | null; testimonialsSection: HomeSectionIntro | null;
    technology: HomeTechnology | null; insightsSection: HomeSectionIntro | null; cta: HomeCtaSection | null;
    bannerCta: HomeBannerCta | null; industries: HomeIndustries | null; ourStory: HomeOurStory | null; teamSection: HomeSectionIntro | null; seo: Seo | null;
  } & Publishable & Timestamps;
  redirects: { id: string; fromPath: string; toPath: string; statusCode: number; createdAt: Date };
}

export type CollectionName = keyof Rows;
export type RowOf<N extends CollectionName> = Rows[N];
/** Fields a caller may supply on insert: everything except the generated `id`. */
export type InsertOf<N extends CollectionName> = Partial<Omit<Rows[N], "id">>;

const stamps = () => ({ createdAt: new Date(), updatedAt: new Date() });

/** Per-collection column defaults (applied on insert) and nullable columns (read as `null` when unset) — what the SQL schema's DEFAULT/NULL declarations used to provide. */
export const SPEC: Record<CollectionName, { defaults: () => Record<string, unknown>; nullable: readonly string[] }> = {
  clients: { defaults: () => ({ displayOrder: 0, status: "draft", ...stamps() }), nullable: ["description", "website", "industry", "logo"] },
  team_members: { defaults: () => ({ displayOrder: 0, status: "draft", ...stamps() }), nullable: ["group", "shortBio", "photo"] },
  testimonials: { defaults: () => ({ displayOrder: 0, status: "draft", ...stamps() }), nullable: ["personRole", "companyName", "clientId", "serviceId", "photo"] },
  careers: {
    defaults: () => ({ requirements: [], responsibilities: [], status: "draft", ...stamps() }),
    nullable: ["description", "location", "department", "workMode", "employmentType", "seo", "publishedAt"],
  },
  services: {
    defaults: () => ({ deliverables: [], process: [], tools: [], faqs: [], displayOrder: 0, status: "draft", ...stamps() }),
    nullable: ["description", "hero", "problem", "solution", "cta", "seo", "publishedAt"],
  },
  case_studies: {
    defaults: () => ({ results: [], media: [], status: "draft", ...stamps() }),
    nullable: ["clientId", "industry", "challenge", "strategy", "execution", "heroImage", "testimonialId", "seo", "publishedAt"],
  },
  insights: { defaults: () => ({ tags: [], status: "draft", ...stamps() }), nullable: ["authorId", "featuredImage", "category", "seo", "publishedAt"] },
  site_settings: {
    defaults: () => ({ socialLinks: [], updatedAt: new Date() }),
    nullable: ["siteDescription", "logo", "favicon", "contact", "defaultCta", "defaultSeo", "defaultOgImage"],
  },
  enquiries: { defaults: () => ({ submissionCount: 0, submissions: [], createdAt: new Date(), updatedAt: new Date() }), nullable: ["location", "email", "companyName", "website", "message", "serviceOfInterest", "monthlyBudget", "primaryGoal"] },
  leads: {
    defaults: () => ({ status: "NEW" as LeadStatus, priority: "MEDIUM" as LeadPriority, source: "WEBSITE_CONTACT" as LeadSource, ...stamps() }),
    nullable: ["companyName", "websiteOrInstagram", "phoneKey", "email", "primaryService", "monthlyMarketingBudget", "primaryGoal", "additionalContext", "assignedTo"],
  },
  lead_activity: { defaults: () => ({ createdAt: new Date() }), nullable: ["message", "previousValue", "newValue", "actor"] },
  admin_users: { defaults: () => ({ role: "administrator" as AdminUserRole, isActive: true, ...stamps() }), nullable: [] },
  home_page: {
    defaults: () => ({ status: "draft", ...stamps() }),
    nullable: [
      "hero", "businessProof", "story", "servicesSection", "growthEngine", "selectedWorkSection", "results", "whySmash",
      "testimonialsSection", "technology", "insightsSection", "cta", "bannerCta", "industries", "ourStory", "teamSection", "seo", "publishedAt",
    ],
  },
  redirects: { defaults: () => ({ statusCode: 301, createdAt: new Date() }), nullable: [] },
};

/** Indexes and uniqueness the SQL migrations declared (unique slugs and redirect sources, the read-path sort keys, and each link collection's pair). */
type IndexSpec = { collection: string; keys: Record<string, 1 | -1>; unique?: boolean; name: string; partial?: Record<string, unknown> };
export const INDEXES: IndexSpec[] = [
  { collection: clients, keys: { status: 1, displayOrder: 1 }, name: "clients_status_order_idx" },
  { collection: teamMembers, keys: { status: 1, displayOrder: 1 }, name: "team_members_status_order_idx" },
  { collection: testimonials, keys: { status: 1, displayOrder: 1 }, name: "testimonials_status_order_idx" },
  { collection: testimonials, keys: { clientId: 1 }, name: "testimonials_client_idx" },
  { collection: testimonials, keys: { serviceId: 1 }, name: "testimonials_service_idx" },
  { collection: careers, keys: { slug: 1 }, unique: true, name: "careers_slug_uidx" },
  { collection: careers, keys: { status: 1, publishedAt: -1 }, name: "careers_status_published_idx" },
  { collection: services, keys: { slug: 1 }, unique: true, name: "services_slug_uidx" },
  { collection: services, keys: { status: 1, displayOrder: 1 }, name: "services_status_order_idx" },
  { collection: caseStudies, keys: { slug: 1 }, unique: true, name: "case_studies_slug_uidx" },
  { collection: caseStudies, keys: { status: 1, publishedAt: -1 }, name: "case_studies_status_published_idx" },
  { collection: caseStudies, keys: { clientId: 1 }, name: "case_studies_client_idx" },
  { collection: insights, keys: { slug: 1 }, unique: true, name: "insights_slug_uidx" },
  { collection: insights, keys: { status: 1, publishedAt: -1 }, name: "insights_status_published_idx" },
  { collection: insights, keys: { category: 1 }, name: "insights_category_idx" },
  /** `GET /api/insights?category=X` filters status+category together; the two single-field indexes above each cover one half, so Mongo can only use one per query — this compound index lets it use both at once once the collection is large enough to matter. */
  { collection: insights, keys: { status: 1, category: 1, publishedAt: -1 }, name: "insights_status_category_published_idx" },
  { collection: enquiries, keys: { createdAt: -1 }, name: "enquiries_created_at_idx" },
  /** One record per phone number; partial so enquiries stored before the number became required (no `phoneKey`) are unaffected. */
  { collection: enquiries, keys: { phoneKey: 1 }, unique: true, partial: { phoneKey: { $type: "string" } }, name: "enquiries_phone_key_uidx" },
  { collection: leads, keys: { createdAt: -1 }, name: "leads_created_at_idx" },
  { collection: leads, keys: { status: 1, createdAt: -1 }, name: "leads_status_created_idx" },
  { collection: leads, keys: { priority: 1 }, name: "leads_priority_idx" },
  { collection: leads, keys: { source: 1 }, name: "leads_source_idx" },
  { collection: leads, keys: { primaryService: 1 }, name: "leads_primary_service_idx" },
  { collection: leads, keys: { assignedTo: 1 }, name: "leads_assigned_to_idx" },
  /** Lookup only, not unique — a returning visitor is a legitimate second lead (Phase 1 brief: "do not create an overly restrictive unique constraint"). Partial so leads with no phone (none exist yet; the field is currently always sent) don't bloat the index. */
  { collection: leads, keys: { phoneKey: 1 }, partial: { phoneKey: { $type: "string" } }, name: "leads_phone_key_idx" },
  { collection: leads, keys: { email: 1 }, partial: { email: { $type: "string" } }, name: "leads_email_idx" },
  { collection: leadActivity, keys: { leadId: 1, createdAt: 1 }, name: "lead_activity_timeline_idx" },
  /** There must not be two active admin identities with the same email (CRM Phase 2 brief, Step 21). */
  { collection: adminUsers, keys: { email: 1 }, unique: true, name: "admin_users_email_uidx" },
  { collection: redirects, keys: { fromPath: 1 }, unique: true, name: "redirects_from_path_uidx" },
  { collection: redirects, keys: { toPath: 1 }, name: "redirects_to_path_idx" },
  { collection: serviceCaseStudies, keys: { serviceId: 1, caseStudyId: 1 }, unique: true, name: "service_case_studies_pk" },
  { collection: serviceCaseStudies, keys: { caseStudyId: 1 }, name: "service_case_studies_case_idx" },
  { collection: insightServices, keys: { insightId: 1, serviceId: 1 }, unique: true, name: "insight_services_pk" },
  { collection: insightServices, keys: { serviceId: 1 }, name: "insight_services_service_idx" },
  { collection: insightCaseStudies, keys: { insightId: 1, caseStudyId: 1 }, unique: true, name: "insight_case_studies_pk" },
  { collection: insightCaseStudies, keys: { caseStudyId: 1 }, name: "insight_case_studies_case_idx" },
  ...[homeServices, homeCaseStudies, homeTestimonials, homeInsights, homeTeam].flatMap((c): IndexSpec[] => [
    { collection: c, keys: { homeId: 1, refId: 1 }, unique: true, name: `${c}_pk` },
    { collection: c, keys: { homeId: 1, position: 1 }, name: `${c}_position_idx` },
  ]),
];

const SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
const publishedNeedsDate = { $or: [{ status: { $ne: "published" } }, { publishedAt: { $type: "date" } }] };
const slugFormat = { $jsonSchema: { properties: { slug: { bsonType: "string", pattern: SLUG_PATTERN } } } };
/** Defense in depth: the same controlled-value check `leads.schema.ts` makes with Zod, enforced again at the database so a write that bypasses the service layer can't store an unsupported status/priority/source. */
const leadEnums = {
  $jsonSchema: {
    properties: {
      status: { enum: [...LEAD_STATUSES] },
      priority: { enum: [...LEAD_PRIORITIES] },
      source: { enum: [...LEAD_SOURCES] },
    },
  },
};

/**
 * Collection validators — the SQL CHECK constraints, kept at the database so
 * they hold even for writes that bypass the services: slug format, "published
 * requires a publication date", the two singletons' fixed `_id`, and the
 * redirect rules. (There are no foreign keys; the services check references with `assertExist`.)
 */
export const VALIDATORS: Record<string, Record<string, unknown>> = {
  [careers]: { $and: [slugFormat, publishedNeedsDate] },
  [services]: { $and: [slugFormat, publishedNeedsDate] },
  [caseStudies]: { $and: [slugFormat, publishedNeedsDate] },
  [insights]: { $and: [slugFormat, publishedNeedsDate] },
  [leads]: leadEnums,
  [adminUsers]: { $jsonSchema: { properties: { role: { enum: ["administrator"] }, isActive: { bsonType: "bool" }, passwordHash: { bsonType: "string" } } } },
  [siteSettings]: { _id: SINGLETON_ID },
  [homePage]: { $and: [{ _id: SINGLETON_ID }, publishedNeedsDate] },
  [redirects]: { $and: [{ statusCode: { $in: [301, 308] } }, { $expr: { $ne: ["$fromPath", "$toPath"] } }] },
};
