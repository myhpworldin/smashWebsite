"use client";

import { Check } from "lucide-react";
import { clientServiceKey, type ClientService } from "@/lib/client-options";
import type { ServiceOptionGroup } from "@/server/modules/client-accounts/client-accounts.service";
import styles from "./ServicePicker.module.css";

/**
 * The services SMASH provides, grouped as on the Services page, as tick-chips: pick every offering the client chose. A group's
 * "Select all" toggles its offerings. Anything the client already holds that the catalogue no longer lists stays visible (and
 * ticked) in its own group, so editing never drops it by accident. Controlled: `value` is the list, `onChange` gets the new one.
 */
export function ServicePicker({ groups, value, onChange, invalid }: { groups: ServiceOptionGroup[]; value: ClientService[]; onChange: (next: ClientService[]) => void; invalid?: boolean }) {
  const chosen = new Set(value.map(clientServiceKey));
  const listed = new Set(groups.flatMap((g) => g.titles.map((title) => clientServiceKey({ categorySlug: g.slug, title }))));
  const retired = value.filter((s) => !listed.has(clientServiceKey(s)));

  const toggle = (service: ClientService) => {
    const key = clientServiceKey(service);
    onChange(chosen.has(key) ? value.filter((s) => clientServiceKey(s) !== key) : [...value, service]);
  };
  const toggleGroup = (group: ServiceOptionGroup) => {
    const all = group.titles.map((title) => ({ categorySlug: group.slug, categoryName: group.name, title }));
    const allOn = all.every((s) => chosen.has(clientServiceKey(s)));
    const without = value.filter((s) => s.categorySlug !== group.slug || !group.titles.includes(s.title));
    onChange(allOn ? without : [...without, ...all]);
  };

  return (
    <div className={styles.picker} aria-invalid={invalid || undefined}>
      {groups.length === 0 ? <p className={styles.summary}>No published services were found. Publish the Services content first.</p> : null}
      {groups.map((group) => {
        const allOn = group.titles.every((title) => chosen.has(clientServiceKey({ categorySlug: group.slug, title })));
        return (
          <fieldset key={group.slug} className={styles.group}>
            <div className={styles.legendRow}>
              <legend className={styles.legend}>{group.name}</legend>
              <button type="button" className={styles.toggleAll} onClick={() => toggleGroup(group)}>{allOn ? "Clear all" : "Select all"}</button>
            </div>
            <div className={styles.chips}>
              {group.titles.map((title) => {
                const service = { categorySlug: group.slug, categoryName: group.name, title };
                return (
                  <label key={title} className={styles.chip}>
                    <input type="checkbox" checked={chosen.has(clientServiceKey(service))} onChange={() => toggle(service)} />
                    <span><Check className={styles.tick} strokeWidth={3} aria-hidden="true" />{title}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      {retired.length ? (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>No longer offered</legend>
          <div className={styles.chips}>
            {retired.map((s) => (
              <label key={clientServiceKey(s)} className={styles.chip}>
                <input type="checkbox" checked onChange={() => toggle(s)} />
                <span className={styles.retired}><Check className={styles.tick} strokeWidth={3} aria-hidden="true" />{s.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p className={styles.summary} aria-live="polite">{value.length === 0 ? "No services chosen yet." : `${value.length} ${value.length === 1 ? "service" : "services"} chosen.`}</p>
    </div>
  );
}
