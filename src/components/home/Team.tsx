import { Asset, FillImage, SectionHeading, WRAP, type HomeSection } from "./shared";

type Person = HomeSection<"team">["items"][number];

function PersonCard({ person }: { person: Person }) {
  return (
    <article className="flex w-[290px] max-w-full shrink-0 flex-col gap-4">
      <div className="relative h-[298px] w-full overflow-hidden rounded-2xl border border-black/10">
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

/**
 * A group's heading centered above its own row of cards (Figma "Meet the Team Behind the Work" v2, node 136:20):
 * unlike the single-row layout this replaces, cards wrap onto a new line below `lg` or whenever a group has more
 * people than fit one row, instead of shrinking to invisibility or overflowing off-screen.
 */
function Row({ label, people }: { label: string | null; people: readonly Person[] }) {
  return (
    <div className="flex flex-col items-center gap-10">
      {label ? <h3 className="font-inter text-3xl font-medium leading-[47.6px] text-black/60">{label}</h3> : null}
      <div className="flex flex-wrap justify-center gap-x-[30px] gap-y-10">
        {people.map((p) => (
          <PersonCard key={`${p.order}-${p.name}`} person={p} />
        ))}
      </div>
    </div>
  );
}

/** "Meet the Team Behind the Work": the referenced members, one centered row per group label (in first-appearance order). */
export function Team({ data, className = "" }: { data: HomeSection<"team">; className?: string }) {
  const groups = new Map<string | null, Person[]>();
  for (const person of data.items) groups.set(person.group, [...(groups.get(person.group) ?? []), person]);
  return (
    <section aria-labelledby="team-heading" className={`bg-linear-to-b from-neutral-100/50 to-neutral-400/10 ${className}`}>
      <div className={`${WRAP} flex flex-col items-center gap-[50px] py-16 lg:pb-[150px] lg:pt-[100px]`}>
        <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="team-heading" align="center" className="max-w-[643px]" />
        {[...groups].map(([label, people]) => (
          <Row key={label ?? ""} label={label} people={people} />
        ))}
      </div>
    </section>
  );
}
