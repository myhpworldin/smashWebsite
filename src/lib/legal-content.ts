import { ROUTES } from "@/lib/routes";

/**
 * Copy for the three Legal pages (Terms & Conditions, Privacy Policy, Cookie Policy), written as plain data so the
 * pages stay layout-only. The wording follows the structure standard for an agency website of this kind and describes
 * only what this site actually does: one contact form (`POST /api/leads`), optional Google / Meta measurement tags
 * (`Analytics.tsx`, off unless an id is configured), a staff-only admin login cookie, and no public accounts, payments,
 * comments or file uploads. If any of those change, the matching section must change with them.
 *
 * Text is plain with a tiny inline syntax, rendered by `LegalDocument`: `**bold**` and `[label](href)`.
 * Company and contact details come from Site Settings (`LegalContext`) rather than being hardcoded.
 *
 * This is a well-formed template, not legal advice: the entity name, registered address, grievance contact, retention
 * periods and governing-law/venue clause are the items a lawyer should confirm before the pages are treated as final.
 */

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; caption: string; head: string[]; rows: string[][] };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  slug: "terms" | "privacy" | "cookies";
  /** Short label used in the cross-links ("Also read") and the page's eyebrow. */
  label: string;
  path: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

/** Real values from Site Settings; anything missing falls back to the contact page. */
export type LegalContext = { company: string; email: string | null; phone: string | null; address: string | null };

const p = (text: string): LegalBlock => ({ type: "p", text });
const h3 = (text: string): LegalBlock => ({ type: "h3", text });
const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });

/** "write to us at hello@…" when an address is configured, otherwise a link to the contact page. */
const reach = (c: LegalContext) => (c.email ? `at [${c.email}](mailto:${c.email}) or through our [contact page](${ROUTES.CONTACT})` : `through our [contact page](${ROUTES.CONTACT})`);

function contactSection(c: LegalContext, lead: string): LegalSection {
  const details = [c.email ? `Email: [${c.email}](mailto:${c.email})` : null, c.phone ? `Phone: ${c.phone}` : null, c.address ? `Address: ${c.address}` : null].filter((x): x is string => !!x);
  return {
    id: "contact",
    title: "Contact us",
    blocks: [p(lead), ...(details.length ? [ul(...details)] : []), p(`You can also use the form on our [contact page](${ROUTES.CONTACT}). We aim to reply to every message promptly.`)],
  };
}

export function termsDoc(c: LegalContext): LegalDoc {
  const co = c.company;
  return {
    slug: "terms",
    label: "Terms & Conditions",
    path: ROUTES.TERMS,
    title: "Terms & Conditions",
    intro: `These Terms & Conditions set out the rules for using the ${co} website. Please read them before you use it.`,
    sections: [
      {
        id: "acceptance",
        title: "Acceptance of these terms",
        blocks: [
          p(`These Terms & Conditions (the “Terms”) govern your access to and use of this website and its content (the “Site”), which is operated by ${co} (“${co}”, “we”, “us” or “our”). By accessing or using the Site you confirm that you have read, understood and agree to be bound by these Terms and by our [Privacy Policy](${ROUTES.PRIVACY_POLICY}) and [Cookie Policy](${ROUTES.COOKIE_POLICY}).`),
          p("If you do not agree, please do not use the Site. If you are using the Site on behalf of a business, you confirm that you are authorised to accept these Terms on its behalf."),
        ],
      },
      {
        id: "about-site",
        title: "About the Site and our services",
        blocks: [
          p(`The Site introduces ${co} and the growth, marketing, creative and technology services we offer, and lets you contact us about them. Information on the Site, including service descriptions, case studies and insights, is provided for general information only. It is not a binding offer, a quotation or professional advice for your specific situation.`),
          p("Any engagement with us for paid services is governed by a separate written proposal, statement of work or services agreement. If those documents conflict with these Terms, they prevail for the services they cover. Nothing on the Site creates a client relationship until such an agreement is in place."),
        ],
      },
      {
        id: "using-site",
        title: "Using the Site",
        blocks: [
          p("You may use the Site for lawful business and personal purposes only. We may change, suspend or withdraw any part of the Site at any time, without notice, and we do not promise that it will always be available or free from errors."),
          p("You are responsible for your own equipment and internet connection and for the accuracy of anything you submit to us."),
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        blocks: [
          p("When using the Site you must not:"),
          ul(
            "break any applicable law or regulation, or encourage anyone else to;",
            "submit false, misleading or someone else's personal information, or impersonate any person or business;",
            "send spam, malware or any content that is unlawful, defamatory, abusive or infringes another person's rights;",
            "attempt to gain unauthorised access to the Site, its servers, databases or the admin areas, or probe, scan or test their security;",
            "interfere with or disrupt the Site, including by overloading it, or by using bots, scrapers or other automated means to extract content or submit forms in bulk;",
            "copy, reverse-engineer or exploit the Site's code or design except as the law permits.",
          ),
        ],
      },
      {
        id: "enquiries",
        title: "Enquiries and information you submit",
        blocks: [
          p(`When you send an enquiry through the Site, you give us the details you choose to share, such as your name, company, contact details, location, budget range and goals. You confirm that the information is accurate and that you are entitled to share it. We use it as described in our [Privacy Policy](${ROUTES.PRIVACY_POLICY}).`),
          p("Submitting an enquiry does not oblige either of us to enter into an agreement. Response times we mention are targets, not guarantees."),
        ],
      },
      {
        id: "intellectual-property",
        title: "Intellectual property",
        blocks: [
          p(`The Site and everything on it, including text, graphics, logos, icons, images, video, animations, layout, software and the “SMASH” name and marks, belongs to ${co} or its licensors and is protected by copyright, trade mark and other intellectual property laws.`),
          p("You may view the Site and make a single copy of a page for your own personal or internal business reference. You may not reproduce, republish, distribute, modify or create derivative works from any part of it, or use our name or marks, without our prior written permission."),
          p("Client names, logos and work shown in case studies belong to their respective owners and appear with permission or for illustration only."),
        ],
      },
      {
        id: "feedback",
        title: "Feedback",
        blocks: [p("If you send us ideas, suggestions or feedback about the Site or our services, you agree that we may use them freely without obligation or payment to you. This does not apply to confidential information you share as part of an engagement we have agreed in writing.")],
      },
      {
        id: "third-parties",
        title: "Third-party links and services",
        blocks: [
          p("The Site may link to third-party websites and services, such as social networks and WhatsApp, or load content from them. We do not control and are not responsible for their content, availability, security or privacy practices. A link is not an endorsement. Their own terms and policies apply when you use them."),
        ],
      },
      {
        id: "disclaimer",
        title: "No guarantees",
        blocks: [
          p("The Site and its content are provided “as is” and “as available”. To the fullest extent permitted by law, we give no warranties of any kind, express or implied, including about accuracy, completeness, fitness for a particular purpose or uninterrupted, error-free or virus-free operation."),
          p("Case studies, statistics and results shown on the Site describe past work for particular clients. Marketing outcomes depend on many factors outside anyone's control, so they are examples only and not a promise or forecast of results for you."),
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        blocks: [
          p(`To the fullest extent permitted by law, ${co}, its directors, employees and partners are not liable for any indirect, incidental, special or consequential loss, or for any loss of profit, revenue, data, goodwill or business opportunity, arising from your use of, or inability to use, the Site or from reliance on its content. Where liability cannot be excluded, our total liability for any claim connected with the Site is limited to the maximum extent the law allows.`),
          p("Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, including liability for fraud or fraudulent misrepresentation. Liability for paid services is governed by the agreement for those services, not by this section."),
        ],
      },
      {
        id: "indemnity",
        title: "Indemnity",
        blocks: [p(`You agree to indemnify and hold ${co} harmless from claims, losses and reasonable costs (including legal fees) arising from your breach of these Terms or your misuse of the Site.`)],
      },
      {
        id: "privacy-cookies",
        title: "Privacy and cookies",
        blocks: [p(`How we handle personal data is explained in our [Privacy Policy](${ROUTES.PRIVACY_POLICY}), and how the Site uses cookies and similar technologies in our [Cookie Policy](${ROUTES.COOKIE_POLICY}). Both form part of these Terms.`)],
      },
      {
        id: "suspension",
        title: "Suspension and termination",
        blocks: [p("We may restrict or end your access to the Site at any time, without notice, if we reasonably believe you have broken these Terms or are putting the Site or other people at risk. Sections that by their nature should continue to apply, including intellectual property, disclaimers, liability, indemnity and governing law, survive any termination.")],
      },
      {
        id: "changes",
        title: "Changes to these terms",
        blocks: [p("We may update these Terms from time to time. The updated Terms apply from the moment they are published, and continuing to use the Site afterwards means you accept them. For material changes we will take reasonable steps to make them visible on the Site.")],
      },
      {
        id: "governing-law",
        title: "Governing law and disputes",
        blocks: [
          p("These Terms and any dispute connected with the Site are governed by the laws of India. We encourage you to contact us first so we can try to resolve any concern informally and in good faith."),
          p("If a dispute cannot be resolved that way, the courts at Kochi, Kerala, India have exclusive jurisdiction, subject to any mandatory rights you have under the law where you live."),
        ],
      },
      {
        id: "general",
        title: "General",
        blocks: [
          ul(
            "**Entire agreement:** these Terms, with the policies they refer to, are the whole agreement between you and us about the Site.",
            "**Severability:** if any provision is found unenforceable, the rest remains in effect.",
            "**No waiver:** a delay or failure to enforce a right is not a waiver of it.",
            "**Assignment:** you may not transfer your rights under these Terms. We may transfer ours as part of a reorganisation or sale of the business.",
            "**Electronic communications:** you agree that we may communicate with you electronically, and that such communications satisfy any legal requirement to be in writing.",
          ),
        ],
      },
      contactSection(c, `If you have a question about these Terms, please reach out ${reach(c)}.`),
    ],
  };
}

export function privacyDoc(c: LegalContext): LegalDoc {
  const co = c.company;
  return {
    slug: "privacy",
    label: "Privacy Policy",
    path: ROUTES.PRIVACY_POLICY,
    title: "Privacy Policy",
    intro: `Your privacy matters to us. This policy explains what personal information ${co} collects through this website, why we collect it, who we share it with, and the choices and rights you have.`,
    sections: [
      {
        id: "who-we-are",
        title: "Who we are and scope",
        blocks: [
          p(`This Privacy Policy applies to personal data collected through this website, operated by ${co} (“${co}”, “we”, “us” or “our”). For this data, ${co} is the data controller (called the “data fiduciary” under India's Digital Personal Data Protection Act, 2023, the “DPDP Act”).`),
          p(`It does not cover personal data we handle for clients while delivering our services. That is processed under the agreement we have with each client. It also does not cover third-party websites you reach through links from the Site. Our [Terms & Conditions](${ROUTES.TERMS}) apply alongside this policy.`),
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        blocks: [
          h3("Information you give us"),
          p("When you submit the strategy request form on our contact page, you can give us:"),
          ul(
            "your full name, phone number and location (required);",
            "your company name, website or Instagram link and work email address (optional);",
            "the service you are interested in, your approximate monthly marketing budget and your primary goal (optional);",
            "any additional context you write in the message box (optional).",
          ),
          p("If you email, call or message us on WhatsApp, we also receive the contact details and content of that conversation, and we may keep a record of it. Please do not send us sensitive personal data such as health information, government ID numbers or financial account details. We do not need it."),
          h3("Information collected automatically"),
          p("When you visit the Site, certain technical information is processed automatically:"),
          ul(
            "your IP address, which our servers use to protect the Site (for example, to limit repeated form submissions) and which is not stored with your enquiry;",
            "basic request and error information, such as the page requested, response status and a request reference, recorded in our server logs for security and troubleshooting. These logs do not include the contents of forms you submit;",
            `if analytics and advertising tags are enabled on the Site: the pages you view, links you click (for example, phone, email, WhatsApp and call-to-action buttons), whether you start or submit a form (never what you typed into it), approximate location, device, browser and operating system, referring website, and online identifiers set by cookies. See the [Cookie Policy](${ROUTES.COOKIE_POLICY}).`,
          ),
          h3("Information from other sources"),
          p("If you reach us through an advertisement, a social media platform or a business referral, we may receive limited information from that source, such as the campaign that brought you here."),
        ],
      },
      {
        id: "how-we-use",
        title: "How we use your information",
        blocks: [
          p("We use personal data only for purposes that are specific and lawful, namely to:"),
          ul(
            "respond to your enquiry, understand your goals and prepare a proposal or strategy call;",
            "manage our relationship with you and our sales pipeline in our internal customer relationship (CRM) system, including assigning, tracking and following up on your enquiry;",
            "operate, secure and improve the Site, and prevent spam, fraud and abuse;",
            "understand how the Site and our campaigns perform, so we can improve content and measure marketing results (where analytics are enabled);",
            "meet our legal, tax, accounting and regulatory obligations and establish, exercise or defend legal claims;",
            "contact you about our services where you have asked us to or where the law allows. You can opt out at any time.",
          ),
          p("We do not sell your personal data, and we do not use it for automated decisions that have legal or similarly significant effects on you."),
        ],
      },
      {
        id: "legal-basis",
        title: "Legal basis for processing",
        blocks: [
          p("Under the DPDP Act and India's Information Technology Act, 2000 and its rules, we process your personal data on the basis of your consent, which you give when you submit a form or contact us, or for certain legitimate uses the law recognises, such as responding to an enquiry you initiated and complying with legal obligations. You can withdraw consent at any time (see “Your rights and choices”)."),
          p("If you are in the European Economic Area or the United Kingdom, we rely on the following bases under the GDPR / UK GDPR:"),
          ul(
            "**contract steps** at your request, to respond to your enquiry and prepare a proposal;",
            "**legitimate interests**, to run, secure and improve our business and Site and to promote our services, balanced against your rights;",
            "**consent**, for non-essential cookies and similar technologies and for marketing messages where consent is required;",
            "**legal obligation**, where the law requires us to keep or disclose information.",
          ),
        ],
      },
      {
        id: "cookies",
        title: "Cookies and analytics",
        blocks: [
          p(`The Site may use cookies and similar technologies, including measurement and advertising tags from Google and Meta where they are enabled. The [Cookie Policy](${ROUTES.COOKIE_POLICY}) lists what is used, why, for how long, and how to control it.`),
        ],
      },
      {
        id: "sharing",
        title: "Who we share information with",
        blocks: [
          p("We share personal data only as needed and never sell it. Recipients are:"),
          ul(
            "**Our team**, limited to people who need the information to respond to you and do their work, under confidentiality duties;",
            "**Service providers (processors)** that help us run the Site and our business, such as cloud hosting, database and security providers, media and video delivery (for example Cloudinary), email and communication tools, and, where enabled, analytics and advertising platforms (Google Analytics, Google Tag Manager, Google Ads and Meta). They may use the data only on our instructions and to provide their service, except that Google and Meta act under their own terms for the advertising and measurement features;",
            "**Professional advisers and authorities**, such as lawyers, auditors, regulators and law-enforcement bodies, where we are required by law or need to protect our rights, safety or property;",
            "**A successor business**, if we merge with, are acquired by or sell part of our business, in which case the privacy commitments in this policy continue to apply to your data unless you are told otherwise.",
          ),
        ],
      },
      {
        id: "transfers",
        title: "International transfers",
        blocks: [
          p("Some of our providers may store or process data outside India. Where your data is transferred internationally, we take steps so it stays protected, such as choosing providers with appropriate security and contractual commitments, and, where the GDPR / UK GDPR applies, using recognised transfer mechanisms like standard contractual clauses. The DPDP Act permits transfers except to countries the Government of India restricts by notification."),
        ],
      },
      {
        id: "retention",
        title: "How long we keep information",
        blocks: [
          p("We keep personal data only for as long as it is needed for the purposes described above, and then delete or anonymise it."),
          ul(
            "**Enquiries and CRM records** are kept while we are actively in touch with you or reasonably expect to be, and then for as long as needed to meet legal, tax and accounting obligations or resolve disputes;",
            "**Server logs** are kept only as long as needed for security and troubleshooting;",
            "**Analytics data** is kept according to the retention settings of the analytics provider, and is aggregated or anonymised where possible.",
          ),
          p(`You can ask us to delete your data sooner (see “Your rights and choices”). We may need to keep some information where the law requires it.`),
        ],
      },
      {
        id: "security",
        title: "How we protect information",
        blocks: [
          p("We use reasonable technical and organisational safeguards appropriate to the risk, in line with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 and the DPDP Act. These include encrypted connections (HTTPS), validation and rate limiting of form submissions, restricted and authenticated staff access to our CRM, signed login sessions, and redaction of sensitive values from our logs."),
          p(`No method of transmission or storage is completely secure, so we cannot guarantee absolute security. If you believe your information has been compromised, please contact us ${reach(c)} straight away. If a personal data breach affects you, we will notify you and the relevant authority as the law requires.`),
        ],
      },
      {
        id: "your-rights",
        title: "Your rights and choices",
        blocks: [
          p("Depending on where you live, you have rights over your personal data. Under the DPDP Act you can:"),
          ul(
            "ask for a summary of the personal data we process about you and who we have shared it with;",
            "ask us to correct inaccurate or incomplete data, or to complete or update it;",
            "ask us to erase your data when it is no longer needed for the purpose it was collected for, unless the law requires us to keep it;",
            "withdraw your consent at any time. This does not affect processing done before you withdrew it;",
            "use our grievance process below and, if unresolved, complain to the Data Protection Board of India;",
            "nominate another person to exercise your rights if you die or become unable to.",
          ),
          p("If the GDPR / UK GDPR applies to you, you also have the right to data portability, to restrict or object to processing (including processing based on legitimate interests and any direct marketing), and to complain to your local data protection authority. Residents of some other regions have similar rights under local law. We do not sell or share personal data for cross-context behavioural advertising as those terms are used in some US state laws, other than the advertising and measurement tags described in the Cookie Policy where enabled."),
          p(`To exercise any right, contact us ${reach(c)}. We may need to verify your identity first, and we will respond within the time the law requires. To stop marketing messages, use the opt-out in the message or tell us directly.`),
        ],
      },
      {
        id: "children",
        title: "Children's privacy",
        blocks: [p("The Site is intended for businesses and adults, and is not directed at children. We do not knowingly collect personal data from anyone under 18 (the age of majority under the DPDP Act) without verifiable parental consent. If you believe a child has given us personal data, please contact us and we will delete it.")],
      },
      {
        id: "third-party-sites",
        title: "Links to other websites",
        blocks: [p("The Site contains links to other websites and services (such as LinkedIn, Instagram, Facebook, X and WhatsApp). We are not responsible for their content or privacy practices. We encourage you to read their privacy policies before sharing any information.")],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        blocks: [p("We may update this policy as our practices or the law change. If we make a material change, we will make it clearly visible on the Site, and where the law requires we will ask for your consent again.")],
      },
      contactSection(c, `Questions, requests or complaints about your personal data can be sent to our privacy contact (also our grievance officer for the purposes of the DPDP Act and the IT Act) ${reach(c)}. We will acknowledge your request and respond within the time the law requires.`),
    ],
  };
}

export function cookieDoc(c: LegalContext): LegalDoc {
  const co = c.company;
  return {
    slug: "cookies",
    label: "Cookie Policy",
    path: ROUTES.COOKIE_POLICY,
    title: "Cookie Policy",
    intro: `This policy explains what cookies and similar technologies the ${co} website uses, why, and how you can control them.`,
    sections: [
      {
        id: "what-are-cookies",
        title: "What are cookies?",
        blocks: [
          p("Cookies are small text files that a website places on your device when you visit it. They let the site recognise your device, remember choices and, in some cases, understand how the site is used. “First-party” cookies are set by the site you are visiting, and “third-party” cookies by another company whose service the site uses."),
          p("Similar technologies include pixels (tiny images or scripts that report that a page was viewed or an action was taken), local storage and software development kits. In this policy, “cookies” includes these."),
        ],
      },
      {
        id: "how-we-use",
        title: "How we use cookies",
        blocks: [
          p("We keep our use of cookies to a minimum. The public pages of this website do not require you to sign in, do not take payments and do not set cookies for preferences or personalisation, and we do not load third-party fonts or social-media widgets that track you."),
          p("The cookies that may be present fall into the groups below. Strictly necessary cookies are always used where needed. Analytics and advertising cookies are set only when we have switched on the relevant Google or Meta tools, so at any given time some of those listed below may not be active on the Site."),
        ],
      },
      {
        id: "categories",
        title: "Types of cookies",
        blocks: [
          {
            type: "table",
            caption: "Categories of cookies and similar technologies",
            head: ["Category", "What it does", "Used on this Site"],
            rows: [
              ["Strictly necessary", "Needed for the Site or a requested feature to work and for security. It cannot be switched off in our systems.", "A signed login cookie for our staff-only admin area. It is not set for ordinary visitors."],
              ["Analytics and performance", "Helps us understand how visitors use the Site (which pages are viewed, which buttons are clicked) so we can improve it. Information is aggregated.", "Google Analytics 4 and Google Tag Manager, when enabled."],
              ["Advertising and measurement", "Measures how our ads and campaigns perform, such as whether a visit led to an enquiry, and helps show relevant ads on other sites.", "Google Ads conversion tracking and the Meta Pixel, when enabled."],
            ],
          },
        ],
      },
      {
        id: "cookie-list",
        title: "Cookies you may see",
        blocks: [
          p("The table lists the specific cookies involved. Durations are those published by the providers, can change, and may be shortened by your browser."),
          {
            type: "table",
            caption: "Cookies that may be set when visiting this Site",
            head: ["Cookie", "Set by", "Purpose", "Duration", "Category"],
            rows: [
              ["smash_admin_session", `${co} (first-party)`, "Keeps a staff member signed in to the admin area. Secure, HTTP-only and never shared. It is not set for visitors.", "8 hours", "Strictly necessary"],
              ["_ga", "Google (first-party)", "Distinguishes unique visitors to compile Site usage statistics.", "2 years", "Analytics"],
              ["_ga_<container-id>", "Google (first-party)", "Maintains session state for Google Analytics 4.", "2 years", "Analytics"],
              ["_gcl_au / _gcl_aw", "Google (first-party)", "Stores information about the ad click that led to a visit, to measure conversions from Google Ads.", "Up to 90 days", "Advertising"],
              ["_fbp / _fbc", "Meta (first-party)", "Identifies browsers and ad clicks so Meta can measure the effect of our ads.", "Up to 90 days", "Advertising"],
            ],
          },
          p("Google's and Meta's advertising and measurement services may also set or read cookies on their own domains (such as google.com, doubleclick.net or facebook.com). We do not control these. See their policies for details."),
        ],
      },
      {
        id: "third-party",
        title: "Third-party services",
        blocks: [
          p(`Where enabled, Google LLC and Meta Platforms, Inc. (and their affiliates) receive information about your visit, such as the page, device, approximate location and the events described in our [Privacy Policy](${ROUTES.PRIVACY_POLICY}), through their own tags. They act under their own terms. See [Google's privacy policy](https://policies.google.com/privacy) and [Meta's privacy policy](https://www.facebook.com/privacy/policy/). We never send the content you type into our forms to these tools.`),
          p("The Site may also load images and video from content-delivery providers (for example Cloudinary), which receive standard request data such as your IP address in order to deliver the file. If you follow a link or button to WhatsApp or a social network, that service's own cookies and policies apply."),
        ],
      },
      {
        id: "managing",
        title: "How to manage cookies",
        blocks: [
          p("You can accept, block or delete cookies in several ways:"),
          ul(
            "**Browser settings:** every major browser lets you view, block or delete cookies, and block third-party cookies. The steps differ by browser, so check its help pages. Blocking all cookies may stop some parts of a website working;",
            "**Google Analytics:** install the [Google Analytics opt-out browser add-on](https://tools.google.com/dlpage/gaoptout) and review [Google's ad settings](https://adssettings.google.com);",
            "**Meta:** adjust ad preferences in your [Meta account settings](https://www.facebook.com/adpreferences);",
            "**Industry opt-outs:** [Your Online Choices](https://www.youronlinechoices.com) (Europe) and the [Digital Advertising Alliance](https://optout.aboutads.info) (US) let you opt out of interest-based advertising from participating companies;",
            "**Browser signals:** where supported, privacy features such as Global Privacy Control and private browsing limit tracking across sites.",
          ),
          p("Deleting cookies removes existing ones but they may be set again on your next visit if the relevant tools are enabled. Opting out of interest-based advertising does not stop all ads, only those tailored to you."),
        ],
      },
      {
        id: "similar-technologies",
        title: "Local storage and similar technologies",
        blocks: [p("The public pages of this Site do not use browser local storage or session storage to track you. Some of the measurement tools above rely on small scripts and pixels that report page views and events (such as clicks on phone, email and WhatsApp links or a form being submitted) without storing anything extra on your device. The staff-only admin area stores a display preference (whether the sidebar is collapsed) in local storage. It is never read from or sent about the public site.")],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        blocks: [p(`We may update this policy when we add, remove or change the tools we use, or when the law changes. Please also read our [Privacy Policy](${ROUTES.PRIVACY_POLICY}) for how we handle personal data more generally.`)],
      },
      contactSection(c, `If you have questions about how we use cookies, please contact us ${reach(c)}.`),
    ],
  };
}

export const LEGAL_LINKS = [
  { path: ROUTES.TERMS, label: "Terms & Conditions" },
  { path: ROUTES.PRIVACY_POLICY, label: "Privacy Policy" },
  { path: ROUTES.COOKIE_POLICY, label: "Cookie Policy" },
] as const;
