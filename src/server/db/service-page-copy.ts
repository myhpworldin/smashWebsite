/**
 * Service-specific copy for two sections of every offering page, by offering slug (Phase 7, from the site audit):
 *
 *   importance → "When It Fits": the situations in which a business in India actually needs this service (three use cases).
 *   outcome    → "Who It's For": the kinds of business it suits (four audience cards). The section's highlight sentence and
 *                card icons are kept as stored.
 *
 * Before this, each page had two benefit lists (the capability cards and the outcome cards) that restated each other,
 * on Meta Ads word for word. The capability cards stay the page's one list of what the service covers; Meta Ads also
 * gets its own `capabilities` and `introduction` here, because its cards were benefits rather than inclusions.
 *
 * No figures, results, prices or client names are claimed here except the two verified case studies (CORE and Mobile
 * Garage, Facebook & Instagram lead generation, counts from Meta Ads Manager), which are named only on Lead Generation.
 * `scripts/update-service-page-copy.ts` writes this into the database; `tests/service-page-copy.test.ts` checks it.
 */
export type CopyItem = { title: string; description: string };
export type PageCopy = {
  importance: { heading: string; description: string; takeaways: [string, string, string] };
  outcome: { heading: string; description: string; items: [CopyItem, CopyItem, CopyItem, CopyItem] };
  introduction?: { description: string };
  capabilities?: { heading: string; description: string; items: CopyItem[] };
};

export const IMPORTANCE_EYEBROW = "When It Fits";
export const OUTCOME_EYEBROW = "Who It's For";

/** The offering pages that show the verified case studies as their "Results" (both were Facebook & Instagram lead generation). */
export const CASE_STUDY_OFFERINGS = ["meta-ads", "lead-generation"] as const;
/** The verified case studies, by slug, and the one service category their work belongs to. */
export const VERIFIED_CASE_STUDIES = ["core", "mobile-garage"] as const;
export const CASE_STUDY_CATEGORY = "growth";

const item = (title: string, description: string): CopyItem => ({ title, description });

export const PAGE_COPY: Record<string, PageCopy> = {
  "meta-ads": {
    introduction: {
      description:
        "We plan, build and run Facebook and Instagram campaigns for businesses that sell to people: audience and offer planning, Lead Ads and click-to-WhatsApp ads, creative direction for Feed, Stories and Reels, Meta Pixel and Conversions API tracking, budget pacing and weekly reporting. We work with the creative, landing pages and follow-up you already have, or help put them in place before launch.",
    },
    capabilities: {
      heading: "What a Meta Ads engagement includes",
      description: "Everything needed to take an offer from brief to a running, measured Facebook and Instagram campaign.",
      items: [
        item("Audience & offer planning", "Who to reach in your city, your state or across India, and which offer or message each audience sees first."),
        item("Campaign structure", "Campaigns and ad sets organised by objective (leads, messages, traffic or sales) so each rupee goes where it is meant to."),
        item("Lead Ads & click-to-WhatsApp", "Instant forms and WhatsApp chat ads set up so enquiries arrive with the details your team needs to respond."),
        item("Creative direction", "Briefs for static, carousel and Reels creative, sized and written for each placement."),
        item("Tracking setup", "Meta Pixel and Conversions API events mapped to real enquiries or purchases, and checked before any spend goes live."),
        item("Budget pacing & reporting", "Daily budgets managed in rupees, cost per enquiry tracked, and a weekly review that ends in next actions."),
      ],
    },
    importance: {
      heading: "When Meta Ads is the right channel",
      description:
        "Meta works best when you can show people an offer they were not searching for (a product, a service, an event or a limited-time deal) and reach them where they already spend time on their phones.",
      takeaways: [
        "A showroom or retail chain promoting a seasonal or festive offer to buyers in its city.",
        "A clinic, coaching centre or service business that needs a steady flow of enquiries and bookings.",
        "A launch (a product, a new branch or a project) that has to reach the right people quickly.",
      ],
    },
    outcome: {
      heading: "Built for businesses that sell to people on their phones",
      description: "Meta Ads suits businesses whose customers can be reached by location, interest or life stage, and who respond to a clear offer.",
      items: [
        item("Local & retail businesses", "Showrooms, stores and service centres reaching buyers within a set distance of each outlet."),
        item("Service providers", "Clinics, salons, institutes and repair services that depend on a steady stream of enquiries and appointments."),
        item("Real estate & big-ticket sales", "Builders, dealers and brands with longer decisions, who need enquiries their sales team can qualify."),
        item("D2C & e-commerce brands", "Online brands selling across India that need ads measured on purchases, not clicks."),
      ],
    },
  },
  "google-ads": {
    importance: {
      heading: "When Google Ads is the right channel",
      description:
        "Google Ads earns its place when people already search for what you sell (\"near me\" searches, product comparisons, urgent service needs) and you want to be the answer at that moment.",
      takeaways: [
        "Urgent services such as repairs, clinics or legal and financial help, where people search and call the same day.",
        "Businesses competing on \"near me\" and city-name searches in their local market.",
        "Products and courses that buyers research and compare on Google before they enquire.",
      ],
    },
    outcome: {
      heading: "Built for businesses people already search for",
      description: "Search advertising pays off when there is real demand to capture and a clear action waiting on the other side: a call, a form, a visit or a purchase.",
      items: [
        item("Local service businesses", "Clinics, repair services and professional firms whose customers search with a city name or \"near me\"."),
        item("Education & training", "Colleges, coaching centres and institutes capturing searches during the admission season."),
        item("Real estate & automotive", "Builders and dealers reaching people who search for specific projects, models or locations."),
        item("E-commerce brands", "Online stores using Shopping and Performance Max to show products to people ready to buy."),
      ],
    },
  },
  "lead-generation": {
    importance: {
      heading: "When lead generation is the right focus",
      description:
        "A lead generation programme fits businesses whose sale happens in a conversation (a call, a WhatsApp chat or a visit), so the job of marketing is to start the right ones.",
      takeaways: [
        "A sales team or call centre that needs a predictable number of enquiries each week.",
        "High-value products or services where every sale starts with a phone call.",
        "Offers and admissions with a deadline, such as a festive sale or an intake season.",
      ],
    },
    outcome: {
      heading: "Built for businesses that sell through conversations",
      description: "Lead generation works best where someone on your team is ready to call, message or meet each enquiry quickly.",
      items: [
        item("Retail & service centres", "Stores and service businesses turning offers into enquiries, as in our CORE and Mobile Garage campaigns."),
        item("Coaching centres & institutes", "Institutes and coaching centres filling batches and admission counselling slots."),
        item("Real estate", "Builders and brokers who need enquiries their sales team can qualify and take to site visits."),
        item("Healthcare & professional services", "Clinics, hospitals and consultancies booking consultations and appointments."),
      ],
    },
  },
  remarketing: {
    importance: {
      heading: "When remarketing earns its place",
      description: "Remarketing pays off once people are already visiting your website, watching your videos or messaging you, but many leave before they enquire or buy.",
      takeaways: [
        "An online store whose visitors add to cart but don't check out.",
        "A considered purchase such as a home, a vehicle or a course that people think over for weeks.",
        "A campaign that brings plenty of visitors but too few of them enquire.",
      ],
    },
    outcome: {
      heading: "Built for businesses with interest to recover",
      description: "Remarketing needs an audience to work with: site visitors, video viewers, past enquiries or existing customers.",
      items: [
        item("Online stores", "D2C and e-commerce brands bringing back cart and product-page visitors."),
        item("Considered purchases", "Real estate, automotive and education, where decisions take time and a timely reminder matters."),
        item("Active advertisers", "Businesses already running Meta or Google Ads that want more from the traffic they pay for."),
        item("Repeat-purchase brands", "Retailers and service businesses inviting past customers back for the next visit or order."),
      ],
    },
  },
  "conversion-optimisation": {
    importance: {
      heading: "When conversion optimisation is the next step",
      description: "Optimisation makes sense once a website or landing page gets steady traffic, but too few visitors enquire, book or buy.",
      takeaways: [
        "Ads are delivering clicks, but the cost per enquiry keeps rising.",
        "Visitors open the form or cart and leave before finishing.",
        "Most visitors arrive on mobile, but the page was designed for desktop.",
      ],
    },
    outcome: {
      heading: "Built for sites that already have traffic",
      description: "Testing needs visitors to learn from, so this service suits businesses already spending on ads or seeing regular visits from search.",
      items: [
        item("Paid-traffic advertisers", "Businesses spending on Meta or Google Ads every month who want more enquiries from the same budget."),
        item("E-commerce stores", "Online brands improving product pages, cart and checkout, including the cash-on-delivery and UPI steps."),
        item("Lead-driven businesses", "Institutes, clinics and real estate firms whose forms and enquiry pages lose people halfway."),
        item("Growing websites", "Sites whose traffic has grown faster than their enquiries."),
      ],
    },
  },
  "social-media-management": {
    importance: {
      heading: "When managed social media makes sense",
      description: "Handing over social media makes sense when customers check your pages before they buy, and your team can't keep posting and replying every day.",
      takeaways: [
        "Customers look up your Instagram or Facebook page before they visit or call.",
        "Posting has become irregular because the team is busy running the business.",
        "Questions in comments and DMs go unanswered for days.",
      ],
    },
    outcome: {
      heading: "Built for brands customers check before they buy",
      description: "Social media management suits businesses where an active, current page builds trust, and where enquiries often start in comments or DMs.",
      items: [
        item("Retail & lifestyle brands", "Stores, boutiques and showrooms that use Instagram to show new stock and offers."),
        item("Restaurants & hospitality", "Cafés, restaurants and hotels whose guests discover them through Reels and reviews."),
        item("Clinics & service businesses", "Practices and service providers building trust with helpful, regular posts."),
        item("Schools & institutes", "Educational institutions keeping students and parents informed through the year."),
      ],
    },
  },
  "campaign-concepts": {
    importance: {
      heading: "When you need a campaign concept",
      description: "A concept is the starting point for any push that runs across several channels and weeks, and has to feel like one campaign rather than a series of separate posts.",
      takeaways: [
        "A festive campaign for Onam, Diwali or Christmas that runs across social, video and ads.",
        "The launch of a new store, branch, product or project.",
        "A brand refresh that needs one clear message the whole team can use.",
      ],
    },
    outcome: {
      heading: "Built for launches and seasonal pushes",
      description: "Concept work suits businesses planning a campaign big enough that content, video and advertising all have to pull in the same direction.",
      items: [
        item("Brands planning a launch", "New stores, branches, products or projects that need a memorable introduction."),
        item("Seasonal retailers", "Businesses whose biggest sales weeks fall around festivals and holiday seasons."),
        item("Institutions & admissions", "Colleges and institutes running a focused admission campaign each year."),
        item("Growing brands", "Businesses moving on from one-off posts to campaigns that build recognition."),
      ],
    },
  },
  "daily-creatives": {
    importance: {
      heading: "When a daily creative service helps",
      description: "A recurring creative service fits teams that post and advertise every week and need fresh, on-brand designs without briefing a designer from scratch each time.",
      takeaways: [
        "Offers, prices and stock change often, and every change needs a new post or ad.",
        "Ads run continuously and the creative wears out within weeks.",
        "Several branches or product lines all need consistent, branded content.",
      ],
    },
    outcome: {
      heading: "Built for teams that publish every week",
      description: "Daily creatives suit businesses with a steady stream of offers, updates and campaigns to communicate.",
      items: [
        item("Retailers & showrooms", "Weekly offers, new arrivals and festive deals designed in the brand's own look."),
        item("Multi-branch businesses", "Chains that need one consistent visual identity across every outlet's posts."),
        item("Always-on advertisers", "Businesses running Meta ads that need new variations to replace tired creative."),
        item("Food & hospitality", "Restaurants, cafés and hotels posting menus, events and specials."),
      ],
    },
  },
  "video-ads": {
    importance: {
      heading: "When video ads are worth making",
      description: "Video earns its cost when a product or service is easier to show than to describe, or when static ads have stopped holding attention in the feed.",
      takeaways: [
        "A product or service that needs a demonstration: how it works and what the result looks like.",
        "Reels and Stories placements, where static images get scrolled past.",
        "Offers that need a face and a voice, such as a founder or a staff member, to feel trustworthy.",
      ],
    },
    outcome: {
      heading: "Built for businesses that are easier to show than explain",
      description: "Video ads suit businesses that advertise on Instagram, Facebook or YouTube and have something worth seeing: a product, a space, a process or a person.",
      items: [
        item("Product brands", "Consumer and D2C brands showing a product in use within the first few seconds."),
        item("Service businesses", "Clinics, repair services and institutes explaining what they do and why to trust them."),
        item("Real estate & hospitality", "Projects, hotels and venues where a walkthrough says more than a photo."),
        item("Retail offers", "Stores turning a time-bound offer into a short, punchy Reel."),
      ],
    },
  },
  "ai-videos": {
    importance: {
      heading: "When AI video is the right fit",
      description: "AI-assisted video makes sense when you need many versions quickly (different offers, formats or languages) and a full shoot for each would be too slow or too costly.",
      takeaways: [
        "One campaign that needs versions in more than one language for different parts of India.",
        "Ad testing that needs several hooks and variations before choosing what to scale.",
        "Explainer or product videos where a shoot isn't practical.",
      ],
    },
    outcome: {
      heading: "Built for teams that need volume and speed",
      description: "AI video suits businesses that publish or advertise often and need more versions than a traditional shoot schedule allows.",
      items: [
        item("Ad-testing brands", "Brands testing several video variations across Meta and YouTube campaigns."),
        item("Multi-language audiences", "Businesses reaching customers in different states and languages."),
        item("Courses & training", "Institutes producing explainer and course videos at scale."),
        item("Lean marketing teams", "Small teams that need regular video without booking a crew each time."),
      ],
    },
  },
  websites: {
    importance: {
      heading: "When it's time for a new website",
      description: "A new website is worth the investment when the current one costs you trust or enquiries: slow on mobile, out of date, hard to edit or impossible to connect to your other tools.",
      takeaways: [
        "Customers find you on Google or Instagram, but the website doesn't reflect the business you are today.",
        "The site is slow on mobile data, where most of your visitors are.",
        "Enquiries from the site land in an inbox nobody checks instead of your CRM or WhatsApp.",
      ],
    },
    outcome: {
      heading: "Built for businesses whose website has to earn its keep",
      description: "Our website work suits businesses that want a site to bring in and route enquiries, not just sit online as a brochure.",
      items: [
        item("Growing SMEs", "Established businesses whose website hasn't kept pace with how they operate."),
        item("Service & professional firms", "Clinics, consultancies and institutes where credibility decides who gets the call."),
        item("Multi-location businesses", "Brands with several branches that need clear location, map and contact details for each."),
        item("Businesses running ads", "Companies sending paid traffic to their site who need it built to convert."),
      ],
    },
  },
  "landing-pages": {
    importance: {
      heading: "When you need a landing page",
      description: "A dedicated landing page is the better destination whenever an ad, email or WhatsApp message promotes one specific offer and asks for one action.",
      takeaways: [
        "A Meta or Google Ads campaign for one offer, product or event.",
        "An admission drive, launch or festive sale with a deadline.",
        "Ads that currently send people to the homepage, where they get lost.",
      ],
    },
    outcome: {
      heading: "Built for campaigns with one clear offer",
      description: "Landing pages suit any business spending on campaigns that point to a specific offer or action.",
      items: [
        item("Lead-generation advertisers", "Businesses collecting enquiries for a sales team or call centre."),
        item("Education & admissions", "Institutes running intake campaigns with an application or counselling form."),
        item("Real estate projects", "Builders promoting a single project with its own brochure, price enquiry and site-visit booking."),
        item("Events & launches", "Brands promoting a launch, offer or event that needs a page of its own."),
      ],
    },
  },
  crm: {
    importance: {
      heading: "When your business needs a CRM",
      description: "A CRM becomes necessary once enquiries arrive from several places (ads, website, WhatsApp and calls) and spreadsheets and phone notes can no longer keep track.",
      takeaways: [
        "Leads arrive from Meta, Google, the website and WhatsApp, and some are never called back.",
        "Several salespeople or branches work the same leads with no single record.",
        "Managers can't see how many enquiries became customers.",
      ],
    },
    outcome: {
      heading: "Built for teams that sell through follow-up",
      description: "A CRM suits businesses where a sale takes more than one conversation and several people need to see the same customer history.",
      items: [
        item("Sales teams", "Teams of two or more handling enquiries that need assignment and tracking."),
        item("Property & vehicle sales", "Businesses with long follow-up cycles and site visits or test drives to schedule."),
        item("Colleges & institutes", "Institutes tracking each enquiry through counselling, application and admission."),
        item("Branch networks", "Companies routing every lead to the right branch or region."),
      ],
    },
  },
  automation: {
    importance: {
      heading: "When automation is worth setting up",
      description: "Automation pays off when your team repeats the same steps every day: copying leads, sending the same messages, chasing the same updates.",
      takeaways: [
        "Every new lead is copied by hand from Meta or the website into a sheet or CRM.",
        "Customers wait for confirmations, reminders or quotes that someone has to send manually.",
        "Managers spend time each day collecting updates for a report.",
      ],
    },
    outcome: {
      heading: "Built for teams buried in repeat work",
      description: "Automation suits businesses with clear, repeatable processes and enough volume that doing them by hand slows the team down.",
      items: [
        item("Lead-heavy businesses", "Teams receiving enquiries every day from ads, forms and WhatsApp."),
        item("Appointment-based services", "Clinics, institutes and service centres sending booking confirmations and reminders."),
        item("Sales operations", "Teams that need tasks, alerts and follow-ups created the moment a lead arrives."),
        item("Growing operations", "Businesses adding staff or branches whose processes must run the same way everywhere."),
      ],
    },
  },
  integrations: {
    importance: {
      heading: "When your tools need connecting",
      description: "Integration work is needed when the same information lives in several tools (ad platforms, website forms, CRM, WhatsApp, billing) and staff re-type it from one to the next.",
      takeaways: [
        "Meta and Google lead forms that are downloaded and uploaded by hand.",
        "A website, CRM and WhatsApp account that don't share customer details.",
        "Reports that need data pulled from three or four different tools.",
      ],
    },
    outcome: {
      heading: "Built for businesses running on several tools",
      description: "Integrations suit businesses that already use more than one system and want them to share data reliably.",
      items: [
        item("Advertisers collecting leads", "Businesses sending ad leads straight to a CRM, a sheet or the WhatsApp team."),
        item("CRM users", "Teams that want website, call and chat activity recorded against each customer."),
        item("E-commerce operations", "Online stores connecting their store, payments, shipping and customer messages."),
        item("Reporting-led teams", "Managers who want one view of marketing and sales data."),
      ],
    },
  },
  "whatsapp-marketing": {
    importance: {
      heading: "When WhatsApp should be a marketing channel",
      description: "Many customers in India would rather message a business on WhatsApp than fill a form or wait for a call, so it works best as the place where enquiries, offers and follow-up meet.",
      takeaways: [
        "Customers already message you on WhatsApp, and replies depend on whoever has the phone.",
        "Click-to-WhatsApp ads bring in chats that need quick, organised replies.",
        "You have opted-in customers to tell about offers, restocks or reminders.",
      ],
    },
    outcome: {
      heading: "Built for businesses customers like to message",
      description: "WhatsApp marketing suits businesses with frequent, personal customer contact and customers who have agreed to hear from them.",
      items: [
        item("Retail & showrooms", "Stores sharing offers, new arrivals and order updates with opted-in customers."),
        item("Clinics & service centres", "Practices and service businesses handling bookings, reminders and follow-ups."),
        item("Education", "Institutes answering admission questions and sending updates to students and parents."),
        item("D2C brands", "Online brands handling order queries, restock alerts and repeat purchases."),
      ],
    },
  },
  "lead-management": {
    importance: {
      heading: "When you need a lead management system",
      description: "Lead management becomes urgent when marketing is working but enquiries go cold: no one owns them, follow-up depends on memory, and nobody knows which leads became sales.",
      takeaways: [
        "Leads from ads, the website and WhatsApp land in different places.",
        "No one can say who is responsible for following up a particular enquiry.",
        "You can't tell which campaign produced the customers who actually bought.",
      ],
    },
    outcome: {
      heading: "Built for businesses with a steady flow of enquiries",
      description: "Lead management suits businesses already receiving regular enquiries that need a dependable process to work through them.",
      items: [
        item("Campaign-driven businesses", "Companies running Meta or Google lead campaigns every month."),
        item("Shared sales teams", "Teams that share enquiries and need clear assignment and status."),
        item("Admission-led institutes", "Institutes moving each enquiry through counselling and admission stages."),
        item("High-value sales", "Real estate, vehicles and other purchases whose leads need several calls and visits before a decision."),
      ],
    },
  },
  "call-centre-support": {
    importance: {
      heading: "When call centre support makes sense",
      description: "Calling support helps when enquiries arrive faster than your team can call them back, or when callers need a prompt, informed answer before they decide.",
      takeaways: [
        "Lead campaigns bring in more enquiries than the in-house team can call the same day.",
        "Enquiries go cold because the first callback happens a day or two later.",
        "Customers need reminders, confirmations or feedback calls after a sale or appointment.",
      ],
    },
    outcome: {
      heading: "Built for businesses where a call closes the sale",
      description: "Call centre support suits businesses whose customers expect to speak to someone before they decide.",
      items: [
        item("Lead-generation campaigns", "Businesses that need every ad enquiry called back promptly."),
        item("Admissions teams", "Institutes calling enquiries during intake seasons."),
        item("Visits & test drives", "Real estate and automotive businesses booking site visits, test drives and showroom appointments."),
        item("Clinics & service providers", "Practices confirming appointments and following up after visits."),
      ],
    },
  },
  "conversion-follow-up": {
    importance: {
      heading: "When structured follow-up makes the difference",
      description: "Follow-up becomes the bottleneck when enquiries come in but too few turn into customers, because interested people aren't contacted again at the right time.",
      takeaways: [
        "Quotes and callbacks are sent once and never chased.",
        "Interested leads say \"call me next week\" and are forgotten.",
        "Sales depend on one person's memory and notebook.",
      ],
    },
    outcome: {
      heading: "Built for sales that take more than one conversation",
      description: "Conversion follow-up suits businesses whose customers compare options and need a few touchpoints before they decide.",
      items: [
        item("Big-ticket purchases", "Real estate, vehicles, electronics and courses, where buyers take time to decide."),
        item("Quote-based businesses", "Service providers and contractors whose quotes need chasing."),
        item("Enrolment-driven institutes", "Institutes following each enquiry through to enrolment."),
        item("Retail with comparison shoppers", "Stores whose customers enquire about a product, then compare before buying."),
      ],
    },
  },
};
