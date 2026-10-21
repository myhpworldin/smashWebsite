import { beforeEach, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is not used here

import { createTestDb } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts } from "@/server/db/schema";
import { createRecord } from "@/server/modules/client-accounts/client-records.service";
import { attentionTotal, loadClientCards, rollLeadStatuses, sortCards, type ClientCard } from "@/server/modules/client-accounts/client-portfolio.service";

const ADMIN = "admin@smash.test";
let db: Db;
let A: string;
let B: string;

const lead = (accountId: string, name: string, receivedAt: string, status?: string) => createRecord(db, "leads", accountId, { name, source: "Meta Ads", receivedAt, ...(status ? { status } : {}) }, ADMIN);

beforeEach(async () => {
  ({ db } = await createTestDb());
  const mk = async (email: string, companyName: string) => (await insertRow(db, clientAccounts, { email, companyName, contactName: "Pat", passwordHash: "x", services: [] }, "Account")).id;
  A = await mk("a@x.com", "Alpha Co");
  B = await mk("b@x.com", "Bravo Co");
});

describe("rollLeadStatuses", () => {
  it("gives every status a number and ignores unknown ones", () => {
    expect(rollLeadStatuses([{ status: "NEW", count: 2 }, { status: "CONVERTED", count: 1 }, { status: "PROPOSAL", count: 9 }])).toEqual({ NEW: 2, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 1, LOST: 0 });
  });
});

describe("loadClientCards", () => {
  it("keeps each client's leads to that client — never combined", async () => {
    await lead(A, "A one", "2026-10-01");
    await lead(A, "A two", "2026-10-02", "CONVERTED");
    await lead(B, "B one", "2026-10-03");
    await lead(B, "B two", "2026-10-04");
    await lead(B, "B three", "2026-10-05", "LOST");

    const cards = await loadClientCards(db, new Date("2026-10-20T06:00:00Z"));
    const a = cards.find((c) => c.account.id === A)!.data!;
    const b = cards.find((c) => c.account.id === B)!.data!;

    expect(a.leadLogCount).toBe(2);
    expect(a.leadsByStatus).toMatchObject({ NEW: 1, CONVERTED: 1, LOST: 0 });
    expect(a.recentLeads.map((l) => l.name)).toEqual(["A two", "A one"]);
    expect(b.leadLogCount).toBe(3);
    expect(b.leadsByStatus).toMatchObject({ NEW: 2, CONVERTED: 0, LOST: 1 });
    expect(b.recentLeads.map((l) => l.name)).toEqual(["B three", "B two", "B one"]);
    expect(a.overview.totalLeads).toBe(2);
    expect(b.overview.totalLeads).toBe(3);
  });

  it("returns a card for a client with no records at all", async () => {
    const cards = await loadClientCards(db);
    expect(cards).toHaveLength(2);
    for (const c of cards) expect(c.data).toMatchObject({ leadLogCount: 0, recentLeads: [] });
  });
});

describe("sortCards", () => {
  const card = (name: string, isActive: boolean, tickets: number): ClientCard => ({
    account: { companyName: name, isActive } as ClientCard["account"],
    data: { attention: { creatives: 0, tickets, invoices: 0, daily: 0 } } as ClientCard["data"],
  });
  it("puts clients with open items first, disabled ones last, then A–Z", () => {
    const sorted = sortCards([card("Zed", true, 0), card("Alpha", true, 0), card("Mid", true, 3), card("Off", false, 5)]);
    expect(sorted.map((c) => c.account.companyName)).toEqual(["Mid", "Alpha", "Zed", "Off"]);
    expect(attentionTotal(sorted[0].data!.attention)).toBe(3);
  });
});
