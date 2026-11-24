#include <NeoPixelBus.h>
#include <WiFi.h>
#include <WebServer.h>

#define NUM_SLOTS 8
#define PIXELS_PER_STRIP 100
#define PIXELS_PER_SLOT 25
#define SLOTS_PER_STRIP 4
#define BLINK_MS 300

int trigPins[NUM_SLOTS] = {5, 18, 19, 21, 13, 14, 26, 33};
int echoPins[NUM_SLOTS] = {4, 17, 16, 22, 12, 27, 25, 32};

NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt0Ws2812xMethod> strip1(PIXELS_PER_STRIP, 23);
NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt1Ws2812xMethod> strip2(PIXELS_PER_STRIP, 15);

RgbColor COLOR_RED(255, 0, 0);
RgbColor COLOR_GREEN(0, 255, 0);   // bright: sweep + blinking slot
RgbColor COLOR_DIM(0, 200, 0);      // dim: other vacant slots
RgbColor COLOR_OFF(0, 0, 0);

bool slotOccupied[NUM_SLOTS], lastOccupied[NUM_SLOTS];
bool isTarget[NUM_SLOTS];
long slotDistance[NUM_SLOTS];
bool needDraw = true;
bool blinkOn = true;
unsigned long lastBlink = 0;

WebServer server(80);

void clearAll() { strip1.ClearTo(COLOR_OFF); strip2.ClearTo(COLOR_OFF); }
void showAll()  { strip1.Show(); strip2.Show(); }
void setPixel(int s, int p, RgbColor c) {
  if (s == 0) strip1.SetPixelColor(p, c);
  else        strip2.SetPixelColor(p, c);
}
void showStrip(int s) {
  if (s == 0) strip1.Show();
  else        strip2.Show();
}
void fillZone(int slot, RgbColor c) {
  int lane = slot / SLOTS_PER_STRIP;
  int start = (slot % SLOTS_PER_STRIP) * PIXELS_PER_SLOT;
  for (int p = 0; p < PIXELS_PER_SLOT; p++) setPixel(lane, start + p, c);
}

long readDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 400;
  return duration * 0.0343 / 2;
}

void classifySlots() {
  for (int i = 0; i < NUM_SLOTS; i++) {
    slotDistance[i] = readDistanceCM(trigPins[i], echoPins[i]);
    slotOccupied[i] = (slotDistance[i] < 15);
  }
}

// nearest = smallest position from the entrance; ties across lanes all blink
void findTargets() {
  int best = 99;
  for (int i = 0; i < NUM_SLOTS; i++)
    if (!slotOccupied[i] && (i % SLOTS_PER_STRIP) < best) best = i % SLOTS_PER_STRIP;
  for (int i = 0; i < NUM_SLOTS; i++)
    isTarget[i] = (!slotOccupied[i] && (i % SLOTS_PER_STRIP) == best);
}

bool stateChanged() {
  if (needDraw) return true;
  for (int i = 0; i < NUM_SLOTS; i++)
    if (slotOccupied[i] != lastOccupied[i]) return true;
  return false;
}

void drawStrips() {
  clearAll();

  // red = occupied, dim green = vacant
  for (int i = 0; i < NUM_SLOTS; i++)
    fillZone(i, slotOccupied[i] ? COLOR_RED : COLOR_DIM);
  showAll();

  // bright green sweep toward each lane's target slot
  int endPixel[2] = {-1, -1};
  for (int i = 0; i < NUM_SLOTS; i++)
    if (isTarget[i])
      endPixel[i / SLOTS_PER_STRIP] = ((i % SLOTS_PER_STRIP) + 1) * PIXELS_PER_SLOT - 1;

  for (int p = 0; p < PIXELS_PER_STRIP; p++) {
    bool drew = false;
    for (int l = 0; l < 2; l++) {
      if (p > endPixel[l]) continue;
      int slotOfPixel = l * SLOTS_PER_STRIP + p / PIXELS_PER_SLOT;
      if (slotOccupied[slotOfPixel]) continue;   // never overwrite red
      setPixel(l, p, COLOR_GREEN);
      showStrip(l);
      drew = true;
    }
    if (drew) delay(15);
  }
  blinkOn = true;
  lastBlink = millis();
}

// blink only the target zones
void updateBlink() {
  if (millis() - lastBlink < BLINK_MS) return;
  lastBlink = millis();
  blinkOn = !blinkOn;
  for (int i = 0; i < NUM_SLOTS; i++)
    if (isTarget[i]) fillZone(i, blinkOn ? COLOR_GREEN : COLOR_OFF);
  showAll();
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String json = "{\"slots\":[";
  for (int i = 0; i < NUM_SLOTS; i++) {
    json += "{\"occupied\":" + String(slotOccupied[i] ? "true" : "false");
    json += ",\"distance\":" + String(slotDistance[i]) + "}";
    if (i < NUM_SLOTS - 1) json += ",";
  }
  json += "],\"targets\":[";
  bool first = true;
  for (int i = 0; i < NUM_SLOTS; i++) {
    if (!isTarget[i]) continue;
    if (!first) json += ",";
    json += String(i);
    first = false;
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
  }
  strip1.Begin();
  strip2.Begin();
  clearAll();
  showAll();

  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) { delay(200); Serial.print("."); }
  Serial.println(WiFi.localIP());

  server.on("/status", handleStatus);
  server.begin();
}

void loop() {
  classifySlots();
  findTargets();
  if (stateChanged()) {
    drawStrips();
    needDraw = false;
    for (int i = 0; i < NUM_SLOTS; i++) lastOccupied[i] = slotOccupied[i];
  }
  updateBlink();
  server.handleClient();
  delay(100);
}