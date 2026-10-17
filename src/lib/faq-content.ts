import { ROUTES } from "@/lib/routes";

/**
 * The copy of the FAQ page (/faq). The page renders these answers and emits its FAQPage structured data from this same
 * list, so what is marked up and what is shown can never differ. Answers are plain text (structured data takes no
 * markup); a related page is offered through `link`, shown under the answer.
 *
 * Keep the answers to what the site already says about SMASH — no prices, turnaround times, guarantees or client
 * names. Anything that depends on the engagement is described as depending on it, and sent to the contact page.
 */
export type FaqItem = { question: string; answer: string; link?: { label: string; href: string } };
export type FaqCategory = { id: string; title: string; blurb: string; items: FaqItem[] };

export const FAQ_PAGE = {
  title: "Frequently Asked Questions",
  intro: "Straight answers about SMASH, our services, how we work and how to get started.",
} as const;

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "about-smash",
    title: "About SMASH",
    blurb: "Who we are and what we stand for.",
    items: [
      {
        question: "What is SMASH?",
        answer:
          "SMASH is a growth-focused marketing and technology agency. We bring performance marketing, social and creative, technology, and customer engagement together under one team, so strategy, campaigns, websites and follow-up all work toward the same goal: measurable business growth.",
        link: { label: "More about us", href: ROUTES.ABOUT },
      },
      {
        question: "What makes SMASH different from other marketing agencies?",
        answer:
          "SMASH was built from real business experience: managing operations, hiring teams and paying for advertising that had to bring customers back. That is why we plan around the transaction, not just attention. One team covers everything from the first ad to the final follow-up, instead of handing you between separate vendors.",
      },
      {
        question: "Which industries does SMASH work with?",
        answer:
          "We work across retail, technology, education, healthcare, real estate, hospitality, automotive, professional services, e-commerce and consumer brands. The approach stays the same in every sector: understand the business first, then build the plan around its customers.",
      },
      {
        question: "Can I see examples of your work?",
        answer:
          "Yes. Our Work page shows case studies across growth, performance marketing, social and creative, technology and customer engagement, covering the challenge, what we did and the results.",
        link: { label: "View our work", href: ROUTES.WORK },
      },
      {
        question: "Is SMASH hiring?",
        answer: "We are always interested in talented people. Open roles, when there are any, are listed on our Careers page along with how to apply.",
        link: { label: "See careers", href: ROUTES.CAREERS },
      },
    ],
  },
  {
    id: "services",
    title: "Services",
    blurb: "What we do, grouped by the job it does for your business.",
    items: [
      {
        question: "What services does SMASH offer?",
        answer:
          "Our services sit in four groups. Growth covers performance marketing such as Meta Ads, Google Ads, lead generation, remarketing and conversion optimisation. Social & Creative covers social media management, campaign concepts, daily creatives and video. Technology covers websites, landing pages, CRM, automation and integrations. Customer Connect covers WhatsApp marketing, lead management, call centre support and conversion follow-up.",
        link: { label: "Explore our services", href: ROUTES.SERVICES },
      },
      {
        question: "Do you run paid ads on Meta and Google?",
        answer:
          "Yes. Our Growth services include precision-targeted campaigns on Facebook and Instagram, and search, display and shopping campaigns on Google. They are supported by lead generation funnels, remarketing to warm audiences, and conversion testing aimed at better returns on ad spend.",
        link: { label: "Growth services", href: ROUTES.SERVICE("growth") },
      },
      {
        question: "Can you create our social media content and videos?",
        answer:
          "Yes. Social & Creative includes social media management with strategy, content, scheduling and community management, big-idea campaign concepts, fresh on-brand creatives, performance video ads and AI-powered video production for fast, scalable output.",
        link: { label: "Social & Creative services", href: ROUTES.SERVICE("social-and-creative") },
      },
      {
        question: "Do you build websites, landing pages and CRMs?",
        answer:
          "Yes. Our Technology services cover high-converting websites built for speed, conversion-focused landing pages for campaigns, custom CRM solutions, workflow automation, and integrations that connect your tools. They are built to feed the same funnel your marketing fills.",
        link: { label: "Technology services", href: ROUTES.SERVICE("technology") },
      },
      {
        question: "What happens to leads after they come in?",
        answer:
          "That is what Customer Connect is for. We help you respond and follow up through WhatsApp marketing, a lead management system that tracks each inquiry through to conversion, professional call centre support, and systematic follow-up so fewer enquiries are lost along the way.",
        link: { label: "Customer Connect services", href: ROUTES.SERVICE("customer-engagement") },
      },
      {
        question: "Can I use just one service?",
        answer:
          "Yes. The services work best together, but you do not have to buy everything. Many businesses start with the area that matters most right now, such as paid ads or a new website, and add more as the results come in.",
      },
    ],
  },
  {
    id: "how-we-work",
    title: "How we work",
    blurb: "The SMASH Growth Engine, step by step.",
    items: [
      {
        question: "What is the SMASH Growth Engine?",
        answer:
          "The SMASH Growth Engine is our end-to-end growth system. It runs in six phases: Strategy, Create, Attract, Convert, Optimise and Scale. Each phase builds on the one before it, so strategy becomes campaigns, campaigns become leads, leads become customers, and what works is improved and expanded.",
      },
      {
        question: "How does a project start?",
        answer:
          "With strategy. Before any campaign or design work begins, we take the time to understand your business, your target audience, your objectives and your market opportunities. The growth plan is built around that, so the work that follows is aligned with your goals.",
      },
      {
        question: "What does the Optimise phase involve?",
        answer:
          "We track every campaign and customer touchpoint, identify what is working and what is not, and keep testing and refining creatives, targeting and funnels. The aim is better results and a lower cost for every conversion over time, not a one-off launch.",
      },
      {
        question: "How do you decide what to scale?",
        answer:
          "We scale what the data shows is working. Once a strategy delivers, we invest more in it, expand the campaigns that perform and keep refining our approach, so growth is steady and sustainable rather than a short spike.",
      },
      {
        question: "How will I know what is working?",
        answer:
          "We agree the goals and the numbers that matter at the start, then track performance against them. The exact metrics and how often we report depend on the services involved, and we set them out when we scope the work with you.",
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "Costs, timing and the first conversation.",
    items: [
      {
        question: "How do I get started with SMASH?",
        answer:
          "Send us a message through the contact page, or book a strategy call. Tell us a little about your business and what you want to achieve, and our team will get back to you to talk through where you are and how we can help.",
        link: { label: "Contact our team", href: ROUTES.CONTACT },
      },
      {
        question: "How much do your services cost?",
        answer:
          "It depends on what you need. The services involved, the size of the opportunity and how much support you want all change the scope, so we do not publish one-size-fits-all packages. After a conversation about your goals we will put together a proposal that fits.",
        link: { label: "Request a proposal", href: ROUTES.CONTACT },
      },
      {
        question: "How soon will I see results?",
        answer:
          "It depends on the channel, the budget and where your business is starting from. Paid campaigns can show early signals quickly, while improvements to your brand, website and follow-up process build up over time. We will not promise guaranteed outcomes, but we will tell you honestly what to expect.",
      },
      {
        question: "Is SMASH a good fit for a small or growing business?",
        answer:
          "Very possibly. SMASH began as a very small team, and we understand what it takes to grow step by step. If we are not the right fit, we will say so. Tell us where your business is today and we will give you a straight view on how we could help.",
        link: { label: "Talk to us", href: ROUTES.CONTACT },
      },
      {
        question: "How can I contact SMASH?",
        answer:
          "Use the contact form, call or email the team, or message us on WhatsApp. The details are on the Contact page, along with a form where you can describe your business and what you are looking for.",
        link: { label: "Contact details", href: ROUTES.CONTACT },
      },
    ],
  },
];

/** Every question, in page order — the single list the FAQPage structured data is built from. */
export const FAQ_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((c) => c.items);
