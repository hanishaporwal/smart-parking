/**
 * Analytics page copy source of truth.
 * All section titles, subtitles, inner chart labels, and KPI titles are centralized here.
 */

export interface SectionCopy {
  title: string;
  subtitle: string;
}

export const ANALYTICS_COPY = {
  // Page Title & Subtitle
  page: {
    title: 'Analytics',
    subtitle: 'What the operator sees after months on site',
  },

  // 15 Section Titles & Subtitles
  occupancy: {
    title: 'Occupancy',
    subtitle: 'How full the lot is over time',
  },
  peakHours: {
    title: 'Peak hours',
    subtitle: 'When the lot is busiest',
  },
  searchTime: {
    title: 'Search time',
    subtitle: 'How long drivers take to find a slot',
  },
  savings: {
    title: 'Savings',
    subtitle: 'Fuel, CO2 and time saved',
  },
  zoneUsage: {
    title: 'Zone usage',
    subtitle: 'Which zones and slots get used most',
  },
  slotMap: {
    title: 'Slot map',
    subtitle: 'Every bay, filling and emptying over time',
  },
  parkingDuration: {
    title: 'Parking duration',
    subtitle: 'How long cars stay and how often bays turn over',
  },
  sensorHealth: {
    title: 'Sensor health',
    subtitle: 'Which sensors can be trusted',
  },
  networkLoad: {
    title: 'Network load',
    subtitle: 'Data and Wi-Fi needs at this size',
  },
  forecast: {
    title: 'Forecast',
    subtitle: 'Expected demand in the next 24 hours',
  },
  alerts: {
    title: 'Alerts',
    subtitle: 'What needs attention now',
  },
  recommendations: {
    title: 'Recommendations',
    subtitle: 'What the operator should do',
  },
  payback: {
    title: 'Payback',
    subtitle: 'When the system pays for itself',
  },
  howItWorks: {
    title: 'How it works',
    subtitle: 'How the numbers are generated',
  },

  // 8 KPI Card Titles (sentence case, not all caps)
  kpis: {
    searchTime: 'Search time',
    distanceSaved: 'Distance saved',
    fuelSaved: 'Fuel saved',
    co2Saved: 'CO2 saved',
    peakLoad: 'Peak load',
    turnover: 'Turnover',
    sensorUptime: 'Sensor uptime',
    payback: 'Payback',
  },

  // Inner Chart Labels & Badges
  inner: {
    timeByOccupancy: 'Time by occupancy',
    timeSpread: 'Time spread',
    useByZone: 'Use by zone',
    overstayLoss: 'Overstay loss',
    shortStay: 'Short stay',
    mediumStay: 'Medium stay',
    longStay: 'Long stay',
    limitBadge: 'Limit: 4 h',
  },
} as const;
