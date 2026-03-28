export interface OnboardingBriefing {
  address: string;
  bookingScheduling: string;
  businessHours: string;
  businessType: string;
  cancellationPolicy: string;
  clientNeeds: string[];
  clientRequestFlow: string;
  commonQuestions: string[];
  companyDescription: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  differentiators: string;
  finishConfirmation: string;
  pricingApproach: string;
  rawMarkdown: string;
  serviceArea: string;
  services: string[];
  turnaroundTime: string;
}

type SectionMap = Record<string, string[]>;

function normalizeHeading(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseSections(markdown: string): SectionMap {
  const sections: SectionMap = {};
  let currentSection = 'root';

  for (const line of markdown.split('\n')) {
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      currentSection = normalizeHeading(headingMatch[1]);
      sections[currentSection] = [];
      continue;
    }

    if (!sections[currentSection]) {
      sections[currentSection] = [];
    }

    sections[currentSection].push(line);
  }

  return sections;
}

function getRequiredSection(
  sections: SectionMap,
  name: string,
  heading: string,
): string[] {
  const section = sections[name];

  if (!section) {
    throw new Error(`Missing required briefing section: ${heading}`);
  }

  return section;
}

function getRequiredValue(
  values: Record<string, string>,
  key: string,
  sectionName: string,
): string {
  const value = values[key];

  if (!value) {
    throw new Error(`Missing required "${key}" entry in section: ${sectionName}`);
  }

  return value;
}

function parseKeyValueList(lines: string[]): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.+)$/);

    if (!match) {
      continue;
    }

    entries[normalizeHeading(match[1])] = match[2].trim();
  }

  return entries;
}

function parseBulletList(lines: string[]): string[] {
  return lines
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim() || null)
    .filter((value): value is string => Boolean(value));
}

function parseParagraph(lines: string[], heading: string): string {
  const value = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('- '))
    .join(' ')
    .trim();

  if (!value) {
    throw new Error(`Missing paragraph content in section: ${heading}`);
  }

  return value;
}

export function buildBootstrapCompanyInput(briefing: OnboardingBriefing): {
  businessType: string;
  name: string;
} {
  return {
    businessType: briefing.businessType,
    name: briefing.companyName,
  };
}

export function parseOnboardingBriefing(markdown: string): OnboardingBriefing {
  const sections = parseSections(markdown);
  const companySectionName = 'company';
  const contactSectionName = 'contact';
  const companySection = getRequiredSection(sections, companySectionName, 'Company');
  const contactSection = getRequiredSection(sections, contactSectionName, 'Contact');
  const companyValues = parseKeyValueList(companySection);
  const contactValues = parseKeyValueList(contactSection);

  const services = parseBulletList(
    getRequiredSection(sections, 'services', 'Services'),
  );
  const clientNeeds = parseBulletList(
    getRequiredSection(
      sections,
      'what clients look for in chat',
      'What Clients Look For In Chat',
    ),
  );
  const commonQuestions = parseBulletList(
    getRequiredSection(sections, 'common questions', 'Common Questions'),
  );

  if (services.length === 0) {
    throw new Error('Briefing section "Services" must contain at least one list item.');
  }

  if (clientNeeds.length === 0) {
    throw new Error(
      'Briefing section "What Clients Look For In Chat" must contain at least one list item.',
    );
  }

  return {
    address: getRequiredValue(contactValues, 'address', contactSectionName),
    bookingScheduling: parseParagraph(
      getRequiredSection(sections, 'booking and scheduling', 'Booking and Scheduling'),
      'Booking and Scheduling',
    ),
    businessHours: parseParagraph(
      getRequiredSection(sections, 'business hours', 'Business Hours'),
      'Business Hours',
    ),
    businessType: getRequiredValue(companyValues, 'business type', companySectionName),
    cancellationPolicy: parseParagraph(
      getRequiredSection(
        sections,
        'cancellation and rescheduling',
        'Cancellation and Rescheduling',
      ),
      'Cancellation and Rescheduling',
    ),
    clientNeeds,
    clientRequestFlow: parseParagraph(
      getRequiredSection(sections, 'client request flow', 'Client Request Flow'),
      'Client Request Flow',
    ),
    commonQuestions,
    companyDescription: parseParagraph(companySection, 'Company'),
    companyName: getRequiredValue(companyValues, 'name', companySectionName),
    contactEmail: getRequiredValue(contactValues, 'email', contactSectionName),
    contactPhone: getRequiredValue(contactValues, 'phone', contactSectionName),
    differentiators: parseParagraph(
      getRequiredSection(sections, 'differentiators', 'Differentiators'),
      'Differentiators',
    ),
    finishConfirmation: parseParagraph(
      getRequiredSection(sections, 'finish confirmation', 'Finish Confirmation'),
      'Finish Confirmation',
    ),
    pricingApproach: parseParagraph(
      getRequiredSection(sections, 'pricing and payment', 'Pricing and Payment'),
      'Pricing and Payment',
    ),
    rawMarkdown: markdown,
    serviceArea: parseParagraph(
      getRequiredSection(sections, 'service area', 'Service Area'),
      'Service Area',
    ),
    services,
    turnaroundTime: parseParagraph(
      getRequiredSection(sections, 'turnaround time', 'Turnaround Time'),
      'Turnaround Time',
    ),
  };
}
