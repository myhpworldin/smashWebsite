import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { careerMetadata } from "@/server/seo/next-metadata";
import { getCareer } from "@/server/seo/request-cache";
import { careerSchemas } from "@/server/seo/page-jsonld";
import { buildBreadcrumbs } from "@/server/seo/breadcrumbs";
import { ROUTES } from "@/lib/routes";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "@/components/sections/CaseStudyHeader.module.css";

// Resolves published content by slug only.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return careerMetadata((await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("career", slug);
  const career = await orNotFound(() => getCareer(slug));
  const crumbs = buildBreadcrumbs(ROUTES.CAREER(slug), career.title);

  return (
    <>
      <JsonLd data={await careerSchemas(slug)} />
      <Container><Breadcrumbs crumbs={crumbs} /></Container>
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
      {/*
       * There is no application/ATS backend (out of scope — CRM is paused, and no
       * such model exists), so "Apply" honestly routes to the one real public
       * enquiry channel (/contact) rather than a fabricated application flow.
       */}
      <Section spacing="tight">
        <Container><Button href={ROUTES.CONTACT}>Apply — Contact Us</Button></Container>
      </Section>
    </>
  );
}
