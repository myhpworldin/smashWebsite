import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requirePreviewAccess } from "@/server/api/preview";
import { getPublishedCareerBySlug } from "@/server/modules/careers/careers.service";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import styles from "@/components/sections/CaseStudyHeader.module.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

/** Draft preview of `/careers/[slug]` — see `preview/services/[slug]/page.tsx` for the mechanism. */
export default async function CareerPreviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);
  requirePreviewAccess(token);

  const career = await getPublishedCareerBySlug(getDb(), slug, { includeDrafts: true });

  return (
    <>
      <PreviewBanner />
      <Container>
        <div className={styles.header}>
          {career.location || career.employmentType ? (
            <div className={styles.meta}>
              {career.location ? <span>{career.location}</span> : null}
              {career.employmentType ? <span>{career.employmentType}</span> : null}
            </div>
          ) : null}
          <h1 className={styles.heading}>{career.title}</h1>
          <p className={styles.summary}>{career.summary}</p>
        </div>
      </Container>
      {career.description ? (
        <Section ariaLabelledBy="role-description-heading">
          <Container>
            <h2 id="role-description-heading">About the Role</h2>
            <p>{career.description}</p>
          </Container>
        </Section>
      ) : null}
      {career.responsibilities.length ? (
        <Section ariaLabelledBy="role-responsibilities-heading">
          <Container>
            <h2 id="role-responsibilities-heading">Responsibilities</h2>
            <ul>{career.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </Container>
        </Section>
      ) : null}
      {career.requirements.length ? (
        <Section ariaLabelledBy="role-requirements-heading">
          <Container>
            <h2 id="role-requirements-heading">Requirements</h2>
            <ul>{career.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
