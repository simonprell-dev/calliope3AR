# HUSKYLENS 2 für Calliope mini 3

Dies ist eine schlanke MakeCode-Erweiterung für **HUSKYLENS 2** mit Fokus auf
**Calliope mini 3** (I2C).

## Installation in MakeCode (Calliope) – ausführlich

### A) Erweiterung in ein MakeCode-Projekt einbinden

1. Öffne den Editor: **https://makecode.calliope.cc/**
2. Klicke auf **Neues Projekt**.
3. Öffne links den Bereich **Erweitert**.
4. Wähle **Erweiterungen**.
5. In das Feld **„Search or enter project URL…“** die Repository-URL einfügen:
   - `https://github.com/<DEIN-ACCOUNT>/huskylense2_calliope3`
6. Mit **Enter** bestätigen und die Erweiterung anklicken.
7. Danach findest du die neuen Blöcke in der Kategorie **HUSKYLENS2**.

### B) Programm auf den Calliope mini 3 übertragen

1. Verbinde den Calliope mini 3 per USB mit dem Computer.
2. Klicke in MakeCode auf **Herunterladen**.
3. Die Datei wird erzeugt (je nach Browser direkt gespeichert).
4. Falls nötig: Datei auf das Laufwerk des Calliope kopieren.
5. Nach dem Kopieren startet das Programm auf dem Board.

### C) HUSKYLENS 2 korrekt vorbereiten

1. HUSKYLENS auf **I2C-Modus** stellen.
2. Verdrahtung prüfen (VCC, GND, SDA, SCL).
3. In MakeCode zuerst immer den Block **„HUSKYLENS2 I2C initialisieren“** aufrufen.
4. Danach mit **„Verbindung testen“** prüfen, ob Sensor antwortet.

> Hinweis: Für lokale Tests in einem Fork/Branch muss die URL auf dein tatsächliches
> GitHub-Repository zeigen.


### D) Noch einfacher: über .hex importieren

Wenn du bereits ein fertiges Calliope-Projekt mit dieser Erweiterung hast:

1. In MakeCode auf **Importieren** klicken.
2. **Datei importieren** wählen.
3. Eine passende `.hex`-Datei auswählen (z. B. von Lehrkraft/Team).
4. MakeCode lädt dann Projekt **inkl. Erweiterung** automatisch.

Damit sparst du dir das manuelle Hinzufügen der URL in vielen Unterrichtsszenarien.

## Verfügbare Blöcke (Deutsch)

- **Setup**: `I2C initialisieren`, `Verbindung testen`, `Algorithmus wählen`
- **Erkennung**: `Ergebnisse aktualisieren`, `Objekt erkannt`, `hat ID ... vom Typ ...`, `hat gelernt ID ...`, `Anzahl gelernter IDs`, `Anzahl Objekte`, `Anzahl Pfeile`
- **Kasten**: `Kasten Mitte Eigenschaft`, `Kasten # Eigenschaft`, `Kasten ID Eigenschaft`, `Anzahl Kasten mit ID`
- **Pfeil**: `Pfeil Mitte Eigenschaft`, `Pfeil # Eigenschaft`, `Pfeil ID Eigenschaft`, `Anzahl Pfeile mit ID`
- **Werte**: `Eigenschaft`, `ID`, `X-Mitte`, `Y-Mitte`, `Breite`, `Höhe`
- **Kompatibilität (DFRobot V2)**: zusätzliche Alias-Blöcke für Face/Object/Color/ObjectTracking inkl. `getResult...`, `available...`, `cachedResultNum...`, `cachedCenter...`, `...IdExists`, `total...ById`, `...PropertyById`, `...PropertyByIdNth`

> Hinweis zur API-Abdeckung: Die grundlegenden DFRobot-V2-Workflows für Gesicht, Objekt, Farbe und Tracking sind als Calliope-kompatible Alias-Blöcke vorhanden. Sehr spezialisierte Unterkategorien (z. B. OCR/Barcode/QR/Face-Orientation/Fall Detection) sind in dieser schlanken Portierung weiterhin nicht vollständig implementiert.

## 5 Beispielprogramme zum Download

> Alle Beispiele sind als `.ts` im Ordner `beispiele/` hinterlegt und können direkt heruntergeladen werden.

### 1) Hallo Welt (ohne Kamera-Logik)

**Datei:** [beispiele/01_hallo_welt.ts](beispiele/01_hallo_welt.ts) · [Direktdownload](beispiele/01_hallo_welt.ts?raw=1)

**Was passiert?**
- Zeigt „Hallo Welt“ und prüft, ob die HUSKYLENS-Verbindung grundsätzlich antwortet.

**Blockansicht (vereinfacht):**

```text
beim Start
  HUSKYLENS2 I2C initialisieren
  wenn HUSKYLENS2 Verbindung testen
    zeige Text "Hallo Welt"
  sonst
    zeige Symbol Nein
```

---

### 2) Verbindungstest mit Statusanzeige

**Datei:** [beispiele/02_verbindungstest.ts](beispiele/02_verbindungstest.ts) · [Direktdownload](beispiele/02_verbindungstest.ts?raw=1)

**Was passiert?**
- Prüft zyklisch die Verbindung und zeigt per LED-Symbol den Status an.

**Blockansicht (vereinfacht):**

```text
dauerhaft
  wenn HUSKYLENS2 Verbindung testen
    zeige Symbol Ja
  sonst
    zeige Symbol Nein
```

---

### 3) Gesicht erkannt? + ID ausgeben

**Datei:** [beispiele/03_gesicht_erkennen.ts](beispiele/03_gesicht_erkennen.ts) · [Direktdownload](beispiele/03_gesicht_erkennen.ts?raw=1)

**Was passiert?**
- Schaltet auf Gesichtserkennung, fragt Ergebnisse ab und sendet ID/X/Y seriell.

**Blockansicht (vereinfacht):**

```text
beim Start
  I2C initialisieren
  Algorithmus Gesichtserkennung wählen

dauerhaft
  Ergebnisse aktualisieren
  wenn Objekt erkannt
    schreibe ID, X-Mitte, Y-Mitte an seriell
```

---

### 4) Farbtracking Rot (Objektmitte verfolgen)

**Datei:** [beispiele/04_farb_tracking_rot.ts](beispiele/04_farb_tracking_rot.ts) · [Direktdownload](beispiele/04_farb_tracking_rot.ts?raw=1)

**Was passiert?**
- Nutzt Farb-Erkennung und zeigt an, ob das rote Objekt links, mittig oder rechts ist.

**Blockansicht (vereinfacht):**

```text
dauerhaft
  Ergebnisse aktualisieren
  wenn Objekt erkannt
    wenn X-Mitte < 110 -> zeige Pfeil links
    wenn 110..210 -> zeige Quadrat
    wenn > 210 -> zeige Pfeil rechts
```

---

### 5) Folge dem roten LEGO-Stein (mit Trainingshinweis)

**Datei:** [beispiele/05_folge_roten_lego_stein.ts](beispiele/05_folge_roten_lego_stein.ts) · [Direktdownload](beispiele/05_folge_roten_lego_stein.ts?raw=1)

**Was passiert?**
- Nutzt Farb-Erkennung + X-Mitte, um ein einfaches Links/Rechts/Gerade-Verhalten für Motorlogik abzuleiten.
- Enthält Platzhalter-Funktionen für die Motorsteuerung (`fahreGerade`, `dreheLinks`, `dreheRechts`, `stopp`).

**So trainierst du HUSKYLENS für den roten LEGO-Stein:**
1. Algorithmus **Farb-Erkennung** am HUSKYLENS wählen.
2. Mehrfach den roten LEGO-Stein in unterschiedlichen Abständen/Beleuchtungen markieren.
3. Speichern/lernen bestätigen (je nach HUSKYLENS-Menüführung).
4. Testen, ob der Stein stabil als Ziel erkannt wird.

**Blockansicht (vereinfacht):**

```text
dauerhaft
  Ergebnisse aktualisieren
  wenn Objekt erkannt
    wenn X-Mitte < linksSchwelle -> dreheLinks
    wenn X-Mitte > rechtsSchwelle -> dreheRechts
    sonst -> fahreGerade
  sonst
    stopp
```

## Schnellstart

```typescript
huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.FaceRecognition)

basic.forever(function () {
    huskylens2.request()
    if (huskylens2.available()) {
        serial.writeLine("ID: " + huskylens2.cachedCenterResult(huskylens2.BasePropertyId.Id))
        serial.writeLine("X: " + huskylens2.cachedCenterResult(huskylens2.BasePropertyId.XCenter))
        serial.writeLine("Y: " + huskylens2.cachedCenterResult(huskylens2.BasePropertyId.YCenter))
    }
    basic.pause(100)
})
```

## Hinweis

Je nach HUSKYLENS-2-Firmware kann sich das exakte Antwortformat unterscheiden.
Die Implementierung enthält bewusst einen konservativen Parser für den ersten
Erkennungsblock.
