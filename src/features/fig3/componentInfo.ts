import {
  NUM_SLOTS,
  PIXELS_PER_SLOT,
  SENSOR_PINS,
  TIMEOUT_DISTANCE_CM,
  DEFAULT_OCCUPANCY_THRESHOLD_CM,
  SWEEP_STEP_MS,
  BLINK_MS,
  NUM_STRIPS,
  PIXELS_PER_STRIP,
} from '@/engine/types';

export type Fig3Numeral = '101' | '102' | '103' | '104' | '105' | '106' | '107' | '108';
export type HotspotId = Fig3Numeral;

export const HOTSPOT_LIST: Fig3Numeral[] = [
  '101',
  '102',
  '103',
  '104',
  '105',
  '106',
  '107',
  '108',
];

export interface TechnicalRow {
  label: string;
  value: string;
}

export interface Fig3ComponentInfo {
  numeral: Fig3Numeral | string;
  title: string;
  subtitle: string;
  whatItIs: string;
  whatItDoes: string[];
  inParkWay: string[];
  technical: TechnicalRow[];
}

export const SYSTEM_OVERVIEW_INFO: Fig3ComponentInfo = {
  numeral: '101–108',
  title: 'Hardware overview',
  subtitle: 'All 8 subsystems',
  whatItIs: 'Full end-to-end hardware topology running the ParkWay IoT smart parking guidance digital twin.',
  whatItDoes: [
    'HC-SR04 ultrasonic mesh (102) samples bay distances across both lanes (101).',
    'ESP32 SoC (103) executes the ~100 ms classification cycle and selects optimal targets.',
    'WS2812 guidance strips (105) sweep green navigation paths while red markers (104) flag occupied slots.',
    'Regulated power supply (108) powers microcontroller, sensors, and addressable LEDs.',
    '2.4 GHz Wi-Fi link (106) broadcasts real-time telemetry packets directly to the monitoring dashboard (107).',
  ],
  inParkWay: [
    'All 8 subsystems operate concurrently in continuous synchronized harmony.',
    'Click any reference numeral (101–108) in the diagram or hotspot bar to focus and inspect a specific subsystem.',
  ],
  technical: [
    { label: 'System status', value: 'All 8 subsystems online & transmitting' },
    { label: 'Microcontroller', value: 'ESP32 dual-core Xtensa @ 240 MHz' },
    { label: 'Ultrasonic mesh', value: '8 × HC-SR04 sensors (GPIO trig/echo)' },
    { label: 'Guidance strips', value: '2 × 100px WS2812B LEDs (GPIO 23 & 15)' },
    { label: 'Telemetry protocol', value: 'HTTP GET /status over 802.11 b/g/n Wi-Fi' },
    { label: 'Main power bus', value: '5V DC (LEDs/sensors) + 3.3V DC (ESP32)' },
  ],
};

export const COMPONENT_INFO: Record<Fig3Numeral, Fig3ComponentInfo> = {
  '101': {
    numeral: '101',
    title: 'Parking slots',
    subtitle: 'Parking bays',
    whatItIs: '8 bays in 2 lanes of 4 (S1-S4 and S5-S8).',
    whatItDoes: [
      'Each bay holds one vehicle.',
      'Each bay has its own sensor.',
      'Each bay has a 25-pixel LED zone.',
    ],
    inParkWay: [
      'Position 0-3 from the entrance sets priority.',
      'The nearest vacant position becomes the target.',
    ],
    technical: [
      { label: 'Slots', value: `${NUM_SLOTS} (S1-S4 lane 0, S5-S8 lane 1)` },
      { label: 'Positions', value: '4 per lane (index mod 4)' },
      { label: 'LED zone', value: `${PIXELS_PER_SLOT} px per slot` },
      { label: 'Priority', value: 'lowest position first' },
    ],
  },
  '102': {
    numeral: '102',
    title: 'Ultrasonic sensors',
    subtitle: 'HC-SR04 distance sensors',
    whatItIs: 'One distance sensor per bay.',
    whatItDoes: [
      'Sends a pulse and times the echo.',
      'Converts echo time into distance in cm.',
    ],
    inParkWay: [
      'Under 15 cm means occupied, otherwise vacant.',
      'No echo reads 400 cm, so the bay is vacant.',
    ],
    technical: [
      { label: 'Model', value: `HC-SR04 x ${NUM_SLOTS}` },
      { label: 'Trig GPIO', value: SENSOR_PINS.map(p => p.trig).join(', ') },
      { label: 'Echo GPIO', value: SENSOR_PINS.map(p => p.echo).join(', ') },
      { label: 'Trigger pulse', value: '10 us' },
      { label: 'Echo timeout', value: '30000 us' },
      { label: 'Distance', value: 'duration x 0.0343 / 2 (cm)' },
      { label: 'No echo', value: `${TIMEOUT_DISTANCE_CM} cm` },
      { label: 'Occupied', value: `below ${DEFAULT_OCCUPANCY_THRESHOLD_CM} cm` },
    ],
  },
  '103': {
    numeral: '103',
    title: 'ESP32 microcontroller',
    subtitle: 'The controller',
    whatItIs: 'The Wi-Fi microcontroller that runs the whole system.',
    whatItDoes: [
      'Reads all 8 sensors about every 100 ms.',
      'Marks each bay occupied or vacant.',
      'Picks the nearest vacant position.',
    ],
    inParkWay: [
      'Drives both LED strips (GPIO 23 and 15).',
      'Serves bay data at /status over Wi-Fi.',
    ],
    technical: [
      { label: 'Loop period', value: '~100 ms' },
      { label: 'Steps', value: 'read sensors, pick target, redraw on change, blink' },
      { label: 'Redraw', value: 'only when occupancy changes' },
      { label: 'Target rule', value: 'one global minimum position across both lanes, ties all blink' },
      { label: 'LED data', value: 'GPIO 23 and 15' },
      { label: 'Wi-Fi', value: 'station mode, HTTP server port 80' },
    ],
  },
  '104': {
    numeral: '104',
    title: 'Status LEDs',
    subtitle: 'Occupied indicators, red',
    whatItIs: 'Red lights that show which bays are taken.',
    whatItDoes: ['Light red on every occupied bay.'],
    inParkWay: [
      'Built as red 25-pixel zones on the WS2812 strips.',
      'The green sweep never overwrites them.',
    ],
    technical: [
      { label: 'Type', value: 'WS2812 pixels (addressable)' },
      { label: 'Colour', value: 'red (255,0,0)' },
      { label: 'Zone', value: `${PIXELS_PER_SLOT} px per occupied slot` },
      { label: 'Protected', value: 'the green sweep never overwrites red' },
    ],
  },
  '105': {
    numeral: '105',
    title: 'Guidance LEDs',
    subtitle: 'Sequential path, green',
    whatItIs: 'The green light path that leads the driver to the target.',
    whatItDoes: [
      'Sweeps green pixel by pixel to the target bay.',
      'Blinks the target bay every 300 ms.',
    ],
    inParkWay: [
      'Other vacant bays stay dim green.',
      'The sweep runs at 15 ms per pixel and pauses sensing in firmware.',
    ],
    technical: [
      { label: 'Sweep', value: 'bright green (0,255,0)' },
      { label: 'Sweep speed', value: `${SWEEP_STEP_MS} ms per pixel, blocks the loop` },
      { label: 'Other vacant slots', value: 'dim green (0,200,0)' },
      { label: 'Target blink', value: `${BLINK_MS} ms on/off` },
      { label: 'Sweep length', value: 'pixel 0 to the end of the target zone' },
    ],
  },
  '106': {
    numeral: '106',
    title: 'Wi-Fi',
    subtitle: 'Wireless link',
    whatItIs: "The ESP32's built-in wireless connection.",
    whatItDoes: [
      'Connects the controller to the network.',
      'Sends occupancy data to the dashboard.',
    ],
    inParkWay: [
      'Data goes out as JSON from /status.',
      'It carries bay states, distances and targets.',
    ],
    technical: [
      { label: 'Mode', value: 'station (STA)' },
      { label: 'Server', value: 'WebServer on port 80' },
      { label: 'CORS', value: 'allow-origin *' },
      { label: 'Endpoint', value: 'GET /status' },
      { label: 'Format', value: 'JSON' },
    ],
  },
  '107': {
    numeral: '107',
    title: 'Dashboard',
    subtitle: 'Web monitor',
    whatItIs: 'The web screen for operators and managers.',
    whatItDoes: [
      'Shows occupied and vacant bays and the chosen target.',
      'Updates as occupancy changes.',
    ],
    inParkWay: [
      'Fed by the /status data.',
      'Simulated here with local data.',
    ],
    technical: [
      { label: 'Data source', value: '/status JSON' },
      { label: 'Payload', value: 'slots[{occupied, distance}] and targets[]' },
      { label: 'Shows', value: 'total, occupied, vacant, target' },
      { label: 'Here', value: 'simulated locally' },
    ],
  },
  '108': {
    numeral: '108',
    title: 'Power supply',
    subtitle: 'Regulated 5 V supply',
    whatItIs: 'The source that powers every part.',
    whatItDoes: ['Feeds the ESP32, sensors and LED strips.'],
    inParkWay: [
      'All parts share one ground.',
      'The LED strips draw the most current.',
    ],
    technical: [
      { label: 'Rail', value: '5 V DC for LEDs, 3.3 V logic for ESP32' },
      { label: 'Common ground', value: 'shared across all parts' },
      { label: 'Largest load', value: `${NUM_STRIPS * PIXELS_PER_STRIP} WS2812 pixels` },
      { label: 'LED data line', value: 'GPIO 23 (strip 1), GPIO 15 (strip 2)' },
    ],
  },
};
