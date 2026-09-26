/** How a role is worked — shared by the CMS validation and the Careers page badge so the two cannot drift. */
export const CAREER_WORK_MODES = ["on-site", "hybrid", "remote"] as const;
export type CareerWorkMode = (typeof CAREER_WORK_MODES)[number];

export const CAREER_WORK_MODE_LABEL: Record<CareerWorkMode, string> = { "on-site": "On-Site", hybrid: "Hybrid", remote: "Remote" };
