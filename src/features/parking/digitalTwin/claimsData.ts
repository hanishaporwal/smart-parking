import { ClaimDefinition, ClaimId } from './types';

export const CLAIM_2_SENSE: ClaimDefinition = {
  id: 'claim2',
  claimNumber: 2,
  pillar: 'Sense',
  title: 'Claim 2 — Ultrasonic Echo Detection',
  duration: 10.0,
  steps: [
    {
      number: 1,
      text: 'Every bay has its own sensor.',
      startTime: 0.0,
      endTime: 1.5,
    },
    {
      number: 2,
      text: 'Each sensor sends an ultrasonic pulse.',
      startTime: 1.5,
      endTime: 3.0,
    },
    {
      number: 3,
      text: 'The pulse hits the car or the empty floor.',
      startTime: 3.0,
      endTime: 5.0,
    },
    {
      number: 4,
      text: 'A fast echo (under 15 cm) means occupied.',
      startTime: 5.0,
      endTime: 6.5,
    },
    {
      number: 5,
      text: 'A late or missing echo means vacant.',
      startTime: 6.5,
      endTime: 8.0,
    },
    {
      number: 6,
      text: 'Results go to the controller.',
      startTime: 8.0,
      endTime: 10.0,
    },
  ],
};

export const CLAIM_5_DECIDE: ClaimDefinition = {
  id: 'claim5',
  claimNumber: 5,
  pillar: 'Decide',
  title: 'Claim 5 — Position Comparison & Target Selection',
  duration: 10.0,
  steps: [
    {
      number: 1,
      text: 'The free bays are found.',
      startTime: 0.0,
      endTime: 2.0,
    },
    {
      number: 2,
      text: 'Each free bay has a position.',
      startTime: 2.0,
      endTime: 4.0,
    },
    {
      number: 3,
      text: 'The scanner compares both lanes together.',
      startTime: 4.0,
      endTime: 7.0,
    },
    {
      number: 4,
      text: 'The lowest position wins.',
      startTime: 7.0,
      endTime: 8.5,
    },
    {
      number: 5,
      text: 'The nearest slot is picked.',
      startTime: 8.5,
      endTime: 10.0,
    },
  ],
};

export const CLAIM_12_GUIDE: ClaimDefinition = {
  id: 'claim12',
  claimNumber: 12,
  pillar: 'Guide',
  title: 'Claim 12 — Sequential LED Visual Guidance',
  duration: 10.0,
  steps: [
    {
      number: 1,
      text: 'A car arrives at the gate.',
      startTime: 0.0,
      endTime: 1.8,
    },
    {
      number: 2,
      text: 'The path is planned.',
      startTime: 1.8,
      endTime: 3.2,
    },
    {
      number: 3,
      text: 'The lights switch on one after another.',
      startTime: 3.2,
      endTime: 4.2,
    },
    {
      number: 4,
      text: 'The driver follows the lights.',
      startTime: 4.2,
      endTime: 7.0,
    },
    {
      number: 5,
      text: 'The car parks.',
      startTime: 7.0,
      endTime: 9.0,
    },
    {
      number: 6,
      text: 'The lights switch off.',
      startTime: 9.0,
      endTime: 10.0,
    },
  ],
};

export const CLAIM_7_ADAPT: ClaimDefinition = {
  id: 'claim7',
  claimNumber: 7,
  pillar: 'Adapt',
  title: 'Claim 7 — Real-Time Obstruction Re-routing',
  duration: 10.0,
  steps: [
    {
      number: 1,
      text: 'Plan A: guide the driver to S2.',
      startTime: 0.0,
      endTime: 2.5,
    },
    {
      number: 2,
      text: 'Another car parks in S2 first.',
      startTime: 2.5,
      endTime: 4.5,
    },
    {
      number: 3,
      text: 'The sensor sees S2 is taken.',
      startTime: 4.5,
      endTime: 5.5,
    },
    {
      number: 4,
      text: 'The next loop picks S7.',
      startTime: 5.5,
      endTime: 6.5,
    },
    {
      number: 5,
      text: 'A new path redirects the driver.',
      startTime: 6.5,
      endTime: 8.0,
    },
    {
      number: 6,
      text: 'The driver parks in S7.',
      startTime: 8.0,
      endTime: 10.0,
    },
  ],
};

export const CLAIMS_CONFIG: Record<ClaimId, ClaimDefinition> = {
  claim7: CLAIM_7_ADAPT,
  claim12: CLAIM_12_GUIDE,
  claim5: CLAIM_5_DECIDE,
  claim2: CLAIM_2_SENSE,
};


