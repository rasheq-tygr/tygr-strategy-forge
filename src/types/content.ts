export type NavLink = { label: string; href: string };

export type StatItem = { value: string; label: string };

export type EcosystemNode = {
  id: string;
  name: string;
  role: string;
  summary: string;
  url: string;
};

export type CapabilityItem = {
  id: string;
  number: string;
  title: string;
  body: string;
};

export type WorkItem = {
  id: string;
  slug: string;
  client: string;
  title: string;
  summary: string;
  body: string;
  outcome: string;
  year: string;
  tags: string[];
  image: string;
  imageCredit: string;
};

export type InsightItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  author: string;
  tags: string[];
  image: string;
  imageCredit: string;
};

export type PartnerItem = { name: string; href: string; logo?: string };

export type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
};

export type SiteContent = {
  meta: { title: string; description: string };
  brand: { name: string; shortName: string; domain: string };
  nav: { links: NavLink[]; cta: string };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    scrollHint: string;
  };
  stats: { items: StatItem[] };
  ecosystem: {
    eyebrow: string;
    title: string;
    body: string;
    hubLabel: string;
    hubBody: string;
    nodes: EcosystemNode[];
  };
  capabilities: {
    eyebrow: string;
    title: string;
    body: string;
    items: CapabilityItem[];
  };
  work: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    items: WorkItem[];
  };
  insights: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    items: InsightItem[];
  };
  partners: { eyebrow: string; title: string; items: PartnerItem[] };
  proof: { eyebrow: string; title: string; items: PartnerItem[] };
  testimonials: { eyebrow: string; title: string; items: TestimonialItem[] };
  contact: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    emailLabel: string;
    phoneLabel: string;
    email: string;
    phone: string;
    bookingUrl: string;
    tidycalPath?: string;
    tidycalBookingTypeId?: number;
  };
  founder: { name: string; role: string; blurb: string };
  footer: { blurb: string; copyright: string; editHint: string };
  social: { linkedin: string; x: string; instagram: string };
  admin: {
    loginTitle: string;
    loginBody: string;
    passwordLabel: string;
    submit: string;
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
  };
};

export function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.hero && v.ecosystem && v.capabilities && v.work && v.insights && v.contact);
}
