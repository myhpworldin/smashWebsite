# Content management guide

How to add, edit and publish content on smash.international without a developer editing code. This is written for whoever manages the website's content day to day, not just engineers — the examples are copy-paste commands, not code to read.

There is no visual admin screen yet (Stage 4, Phase 2 built the content-management *system*, deliberately without a UI — see "Why there's no screen yet" at the end). Every action below is one command, run from a terminal or a tool like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/).

## 1. Getting access

There are two levels of access (Stage 5, Phase 1):

| Role | Token | Can do |
|---|---|---|
| **Administrator** | `ADMIN_API_TOKEN` | Everything: create, edit, publish, unpublish, and manage Site Settings. |
| **Content Editor** | `CMS_EDITOR_API_TOKEN` (optional — only exists if someone set one up) | Create and edit any content type, and preview drafts. Cannot publish/unpublish anything (any request that sets `"status": "published"` is refused), and cannot touch Site Settings at all. |

Ask whoever manages the server for the token matching your role. Every command below needs one in the `Authorization` header. Treat it like a password — anyone with the Administrator token can publish anything live; anyone with the Editor token can still change what's on a draft. Never share either outside the team, paste it into a public chat, or commit it to a file that gets shared.

If only `ADMIN_API_TOKEN` is configured (the default, unchanged from before this phase), there is just the one Administrator role — nothing below changes for you.

## 2. The basic shape of every request

Every content type (Services, Case Studies, Insights, Team, Testimonials, Clients, Careers) works the same way:

| Action | Command shape |
|---|---|
| See everything (including unfinished drafts) | `GET /api/admin/<type>` |
| See one item | `GET /api/admin/<type>/<its-id>` |
| Create something new | `POST /api/admin/<type>` with the content as JSON |
| Change something existing | `PATCH /api/admin/<type>/<its-id>` with only the fields you're changing |

`<type>` is one of: `services`, `work` (Case Studies), `insights`, `team`, `testimonials`, `clients`, `careers`. The Home page and site-wide settings (logo, contact details, social links) are singletons — `/api/admin/home` and `/api/admin/site-settings` — with no list, just `GET` and `PATCH`.

Every request needs this header:
```
Authorization: Bearer <the admin token>
```

Example — see every service, including drafts:
```bash
curl -H "Authorization: Bearer <TOKEN>" https://smash.international/api/admin/services
```

Example — create a new service (starts as a draft automatically):
```bash
curl -X POST https://smash.international/api/admin/services \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Performance Marketing",
    "slug": "performance-marketing",
    "shortDescription": "One or two sentences shown on cards and in search results.",
    "description": "The full page description."
  }'
```

The response includes an `"id"` field (a long string of letters and numbers) — save it. You'll use it to edit or publish that item later.

Example — edit it later (only send the fields that changed):
```bash
curl -X PATCH https://smash.international/api/admin/services/<the-id> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "shortDescription": "An updated one-line description." }'
```

If something is wrong with what you sent, you get back a clear message naming the exact field and the problem — nothing is ever silently accepted or silently dropped.

A Service's `"faqs"` list (Stage 5, Phase 9) rejects two entries with the same question (case doesn't matter) — that's almost always a copy-paste mistake, not two genuinely different questions. Rename or remove one.

## 3. Drafts and publishing

Everything you create starts as a **draft**: saved, but invisible to website visitors and search engines. Nobody outside the team can see it or find it.

To publish something, `PATCH` it with:
```json
{ "status": "published" }
```

To take something back down (without deleting it), `PATCH` it with:
```json
{ "status": "draft" }
```

**The system checks your work before publishing.** If required information is missing — for example, a Career posting with no description, or a Case Study with no real result and no source for that result — publishing is refused and you get told exactly what's missing. Nothing incomplete or broken can go live by accident.

Once something is published (or unpublished, or edited), **the website page updates immediately** — the very next visitor to load it sees the change, with no waiting period. Verified live (Stage 5, Phase 4). The sitemap updates the same way. Nobody needs to touch code or tell a developer.

## 4. Previewing before you publish

Want to see exactly how a draft will look before making it public? Every Service, Case Study, Insight and Career has a preview link:

```
https://smash.international/preview/<type>/<its-slug>?token=<TOKEN>
```

(`<type>` here is `services`, `work`, `insights` or `careers` — matching the real website's own web addresses.)

This shows the real page, built the same way the live site builds it — just with a yellow "Preview" banner at the top so nobody mistakes it for the real thing. A preview link only works with the correct token; without it, the page behaves exactly like it doesn't exist (nobody can tell there's a draft there at all). Preview pages are also hidden from Google and every other search engine.

Only share a preview link with people who should be able to see the token in the address bar — treat the link itself as sensitive.

## 5. Web addresses (slugs)

Every Service, Case Study, Insight and Career has a **slug** — the part of its web address after the section name, like `performance-marketing` in `/services/performance-marketing`. This is separate from the title so it stays stable even if you reword the title later.

- Slugs are lowercase words separated by hyphens: `performance-marketing`, not `Performance_Marketing` or `performance marketing`.
- **Changing the title never changes the slug.** They're independent.
- **Once something is published, avoid changing its slug.** If you must (e.g. a genuine renaming), the old address automatically redirects visitors to the new one — but it's still better to get it right the first time, since every link, bookmark and search result pointed at the old address takes time to catch up.
- Two items of the same type can never share a slug — the system will refuse and tell you.
- They also can't have slugs that are obviously the same topic reworded, like `performance-marketing` and `performance-marketing-services`, or `acme-corp` and `acme-corps` (Stage 5, Phase 2) — the system refuses this too, since publishing both would just split one topic's search visibility across two competing pages. If you get this error and the two pages are genuinely different, pick a slug that says so more clearly.

## 6. SEO fields

Optionally, every content type accepts an `"seo"` object to control exactly how it appears in search results and social shares:

```json
"seo": {
  "metaTitle": "A specific, accurate title for search results",
  "metaDescription": "A one- or two-sentence accurate summary",
  "ogImage": "https://smash.international/media/your-image.jpg"
}
```

If you leave `"seo"` out entirely, the system builds sensible defaults from the title and description you already wrote — you never end up with a blank or broken search listing.

`seo.canonicalUrl` is a manual override for "this page's real address is actually somewhere else" — a genuinely rare case. Leave it out; the system derives the correct one from the page's own slug automatically. If you do set it, and it happens to point at the same address another already-published page uses (of any type — a Service, Case Study, Insight or Career), publishing is refused (Stage 5, Phase 3) — two pages can never claim the same canonical address, since that just splits one topic's search visibility across two competing pages.

**Do not** try to repeat a keyword many times across the title, description and content to "help" search rankings — modern search engines penalize that, and it makes the writing worse for actual readers. Write it naturally, for the person reading it.

## 7. Connecting content together (relationships)

Some content types reference each other — a Case Study can list which Services it relates to; an Insight can link to related Services and Case Studies. These are set by including the other item's **id** (not its slug or title):

```json
"relatedServiceIds": ["43ddf9cb-04fd-44ed-b484-c3cb8d8a1425"]
```

If you reference an id that doesn't exist (a typo, or something that was deleted), the request is refused with a clear error — you can never end up with a link on the live site pointing at nothing.

## 8. Images

Attach an image to anything that supports one by providing its already-uploaded web address, a description of what's in it, and its size:

```json
"featuredImage": {
  "url": "https://smash.international/media/your-image.jpg",
  "alt": "A plain description of what the image actually shows",
  "width": 1200,
  "height": 630
}
```

**Alt text must describe the image itself** — not a marketing phrase, not a repeated keyword. Someone using a screen reader hears exactly what you type there.

Uploading new image files isn't part of this system yet — get a real, already-hosted image URL first (from whoever manages media/CDN), then reference it as shown above.

## 9. Team members, testimonials and clients

These work exactly like Services (create as a draft, `PATCH` to publish), but have no slug — they're only ever shown as part of another page (the About page's team list, a testimonial on Home, etc.), never as their own standalone page. They also support `"displayOrder"` (a number) if you want to control which one shows first — lower numbers come first.

**Never invent a testimonial, quote, client relationship or result.** Every testimonial must be a real quote from a real client who agreed to it. Every metric on a Case Study needs a `"source"` noting how it was verified — the system will refuse to publish a Case Study with a number that has no source.

## 10. Reading contact form submissions

Every visitor who submits the Contact page's form (`/contact`) gets saved. As an **Administrator** (not a Content Editor — this is visitor personal data, not website content):

```bash
curl -H "Authorization: Bearer <ADMIN TOKEN>" https://smash.international/api/admin/enquiries
```

See one specific submission by its id (from the list above):
```bash
curl -H "Authorization: Bearer <ADMIN TOKEN>" https://smash.international/api/admin/enquiries/<the-id>
```

That's the whole feature — there's no "mark as handled," no assignment, no reply-from-here button. It's a plain, read-only list of what people have written in. See §11 below for why.

## 11. What this system deliberately does not do

- **No individual accounts.** There are two shared tokens (Administrator, Content Editor — §1), not per-person logins. If you need to know *who specifically* changed something, coordinate outside the system (e.g. in your team chat) for now — the system can tell you *whether* the change came from an Administrator or an Editor token, but not which team member typed it.
- **No placeholder text on publish.** Publishing is refused if any field still contains literal "Lorem ipsum" filler text — a small safety net, not a full content-quality check. It doesn't flag this project's own `[SAMPLE]`-labelled seed content used for development, only real Lorem Ipsum filler.
- **No CRM.** This manages the content people *see* — services, case studies, articles, job postings, team bios. It has nothing to do with leads, enquiries as a pipeline, or sales — the contact form (`/contact`) just saves a message, and you can read it back (§10), but nobody is assigned or tracked here.
- **No permanent deletion.** "Unpublish" (set `"status": "draft"`) is the way to take something down. There's no API to permanently erase a record — ask whoever manages the database directly if that's genuinely needed.
- **No content-approval workflow** (e.g. "submitted for review" as a separate state from draft/published) — it's just Draft and Published.

## Why there's no screen yet

Building a visual admin screen means designing and building an entire second application (forms, an image picker, a rich-text editor, navigation) on top of everything above — a substantial project in its own right, not something to add speculatively inside an integration phase. Every button such a screen would need already exists as one of the commands in this guide; a future phase can build the screen as a thin layer on top without changing anything documented here. See `API.md` for the exact technical contract those screens (or any other tool) would call.
