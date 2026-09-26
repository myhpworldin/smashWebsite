import { Asset, FillImage, SectionHeading, WRAP, type HomeSection } from "./shared";

type Person = HomeSection<"team">["items"][number];

function PersonCard({ person }: { person: Person }) {
  return (
    <article className="flex w-full max-w-[290px] flex-col gap-4">
      <div className="relative h-[298px] w-full overflow-hidden rounded-2xl">
        {person.photo ? <FillImage media={person.photo} sizes="290px" className="object-cover" /> : <div aria-hidden="true" className="size-full bg-black/5" />}
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-inter text-2xl font-normal leading-10 text-black">{person.name}</h4>
          <p className="font-inter text-sm font-medium leading-6 text-bright-blue">{person.role}</p>
        </div>
        {/* TODO: no profile URLs exist yet, so this is a placeholder tile, not a link. */}
        <span aria-hidden="true" className="grid size-[52px] shrink-0 place-items-center rounded-[15px] border border-black/20 bg-white/70">
          <Asset name="linkedin.svg" width={22} height={22} />
        </span>
      </div>
    </article>
  );
}

function Row({ label, people }: { label: string | null; people: readonly Person[] }) {
  return (
    <div className={`grid gap-6 lg:grid-cols-[390px_1fr] lg:gap-x-0 lg:items-start`}>
      {label ? <h3 className="font-inter text-3xl font-medium leading-[47.6px] text-black/60">{label}</h3> : <span aria-hidden="true" />}
      <div className="grid gap-[30px] sm:grid-cols-2 lg:flex">
        {people.map((p) => (
          <PersonCard key={`${p.order}-${p.name}`} person={p} />
        ))}
      </div>
    </div>
  );
}

/** "Meet the Team Behind the Work": the referenced members, one row per group label (in first-appearance order). */
export function Team({ data, className = "" }: { data: HomeSection<"team">; className?: string }) {
  const groups = new Map<string | null, Person[]>();
  for (const person of data.items) groups.set(person.group, [...(groups.get(person.group) ?? []), person]);
  return (
    <section aria-labelledby="team-heading" className={`bg-linear-to-b from-neutral-100/50 to-neutral-400/10 ${className}`}>
      <div className={`${WRAP} flex flex-col gap-[50px] py-16 lg:pb-[150px] lg:pt-[100px]`}>
        <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="team-heading" className="max-w-[494px]" />
        {[...groups].map(([label, people]) => (
          <Row key={label ?? ""} label={label} people={people} />
        ))}
      </div>
    </section>
  );
}
