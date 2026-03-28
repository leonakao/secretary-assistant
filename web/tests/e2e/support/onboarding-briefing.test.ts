import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildBootstrapCompanyInput,
  parseOnboardingBriefing,
} from './onboarding-briefing';

const briefingMarkdown = `
## Company
- Name: Aurora
- Business Type: Wellness clinic

Aurora is a small clinic focused on aesthetics.

## Services
- Skin treatment
- Laser hair removal

## What Clients Look For In Chat
- Pricing
- Appointment availability

## Service Area
We serve clients in Sao Paulo.

## Business Hours
We open from Monday to Friday.

## Booking and Scheduling
Clients book through WhatsApp.

## Pricing and Payment
We share price ranges and accept Pix.

## Cancellation and Rescheduling
Clients can reschedule with 24 hours notice.

## Contact
- Phone: +55 11 4000-1234
- Email: contato@aurora.test
- Address: Rua Central, 10

## Turnaround Time
Assessments last 45 minutes.

## Differentiators
We offer personalized treatment plans.

## Common Questions
- How many sessions do I need?

## Client Request Flow
Clients ask for recommendations and pricing.

## Finish Confirmation
Yes, you can finalize the onboarding.
`.trim();

const fixturePath = join(
  process.cwd(),
  'tests/e2e/fixtures/onboarding-company-briefing.md',
);

describe('parseOnboardingBriefing', () => {
  it('extracts the canonical company briefing structure', () => {
    const briefing = parseOnboardingBriefing(briefingMarkdown);

    expect(briefing.companyName).toBe('Aurora');
    expect(briefing.businessType).toBe('Wellness clinic');
    expect(briefing.services).toEqual([
      'Skin treatment',
      'Laser hair removal',
    ]);
    expect(briefing.clientNeeds).toEqual(['Pricing', 'Appointment availability']);
    expect(briefing.contactPhone).toBe('+55 11 4000-1234');
  });

  it('builds bootstrap values from the parsed briefing', () => {
    const briefing = parseOnboardingBriefing(briefingMarkdown);

    expect(buildBootstrapCompanyInput(briefing)).toEqual({
      businessType: 'Wellness clinic',
      name: 'Aurora',
    });
  });

  it('fails explicitly when a required section is missing', () => {
    expect(() =>
      parseOnboardingBriefing(briefingMarkdown.replace('## Services', '## Missing')),
    ).toThrow('Missing required briefing section: Services');
  });

  it('parses the committed onboarding briefing fixture', () => {
    const fixtureMarkdown = readFileSync(fixturePath, 'utf8');

    const briefing = parseOnboardingBriefing(fixtureMarkdown);

    expect(briefing.companyName).toBe('Luna Clean');
    expect(briefing.businessType).toBe('Residential cleaning company');
    expect(briefing.services.length).toBeGreaterThan(0);
    expect(briefing.clientNeeds.length).toBeGreaterThan(0);
    expect(briefing.contactPhone).toBe('+55 11 99888-7766');
    expect(briefing.finishConfirmation).toContain('finalize');
  });
});
