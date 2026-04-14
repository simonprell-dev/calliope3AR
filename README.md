# HUSKYLENS 2 fuer Calliope mini 3

Dies ist eine schlanke MakeCode-Erweiterung fuer **HUSKYLENS 2** mit Fokus auf **Calliope mini 3** per I2C.

Die Repository-Struktur ist so aufgebaut, dass das Projekt direkt in **MakeCode fuer Calliope** als Erweiterung importiert werden kann.

## In MakeCode benutzen

1. Oeffne den Editor: `https://makecode.calliope.cc/`
2. Erstelle ein neues Projekt.
3. Oeffne `Erweitert` -> `Erweiterungen`.
4. Fuege die GitHub-URL dieses Repositories ein.
5. Bestaetige mit Enter und waehle die Erweiterung aus.

Wichtig:
MakeCode erwartet die Dateien `pxt.json`, `README.md`, `test.ts` und den Erweiterungs-Code direkt im Repository-Stamm. Genau so ist dieses Repo jetzt aufgebaut.

## Ordnerstruktur

- `pxt.json`: MakeCode-Projektdatei
- `huskylens2_protocol.ts`: Erweiterung mit allen Bloecken
- `test.ts`: kleines Testprogramm fuer die Erweiterung
- `beispiele/`: Beispielprogramme zum schnellen Start

## Blockbereiche in MakeCode

- `Start`: Kamera vorbereiten, Verbindung pruefen, Modus waehlen
- `Sehen`: neue Ergebnisse holen und Basisabfragen
- `Objekte`: Daten von erkannten Objekten lesen
- `Pfeile`: Daten von erkannten Pfeilen lesen
- `Werte`: haeufige Kurzwerte wie ID, X-Mitte, Y-Mitte, Breite, Hoehe
- `Profi`: DFRobot-V2-Kompatibilitaetsbloecke fuer fortgeschrittene Nutzung

Die wichtigsten Bloecke haben zusaetzlich Erklaertexte direkt im Code. Diese kann MakeCode als Hilfe bzw. Tooltip anzeigen.

## HUSKYLENS vorbereiten

1. Stelle die HUSKYLENS 2 auf `I2C`.
2. Pruefe die Verkabelung: `VCC`, `GND`, `SDA`, `SCL`.
3. Benutze in MakeCode zuerst `Kamera vorbereiten ueber I2C`.
4. Pruefe danach mit `Verbindung zur Kamera klappt`, ob der Sensor antwortet.

## Schnellstart

```typescript
huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.FaceRecognition)

basic.forever(function () {
    huskylens2.request()
    if (huskylens2.available()) {
        serial.writeLine("ID: " + huskylens2.id())
        serial.writeLine("X: " + huskylens2.xCenter())
        serial.writeLine("Y: " + huskylens2.yCenter())
    }
    basic.pause(100)
})
```

## Beispiele

Die Dateien im Ordner `beispiele/` koennen als Vorlage fuer eigene Projekte verwendet werden:

- `beispiele/01_hallo_welt.ts`
- `beispiele/02_verbindungstest.ts`
- `beispiele/03_gesicht_erkennen.ts`
- `beispiele/04_farb_tracking_rot.ts`
- `beispiele/05_folge_roten_lego_stein.ts`

## Hinweis

Je nach HUSKYLENS-2-Firmware kann sich das genaue Antwortformat leicht unterscheiden. Die Implementierung verwendet bewusst einen vorsichtigen Parser fuer den ersten Erkennungsblock.
