/**
 * HUSKYLENS 2 - Calliope mini 3 compatible port (I2C)
 */

//% color=#2E86DE icon="\uf085" block="HUSKYLENS2"
//% groups=['Start', 'Sehen', 'Objekte', 'Pfeile', 'Werte', 'Profi']
namespace huskylens2 {
    const HEADER = 0x55
    const HEADER2 = 0xAA
    const ADDRESS = 0x11
    const DEFAULT_I2C_ADDR = 0x32
    const MAX_RESULTS = 8

    let i2cAddr = DEFAULT_I2C_ADDR

    /**
     * Die Erkennungsart, die auf der HUSKYLENS 2 aktiv sein soll.
     */
    export enum Algorithm {
        //% block="Gesichtserkennung"
        FaceRecognition = 0,
        //% blockHidden=true
        AlgorithmFaceRecognition = FaceRecognition,
        //% block="Objektverfolgung"
        ObjectTracking = 1,
        //% blockHidden=true
        AlgorithmObjectTracking = ObjectTracking,
        //% block="Objekterkennung"
        ObjectRecognition = 2,
        //% blockHidden=true
        AlgorithmObjectRecognition = ObjectRecognition,
        //% block="Linienverfolgung"
        LineTracking = 3,
        //% blockHidden=true
        AlgorithmLineTracking = LineTracking,
        //% block="Farb-Erkennung"
        ColorRecognition = 4,
        //% blockHidden=true
        AlgorithmColorRecognition = ColorRecognition,
        //% block="Tag-Erkennung"
        TagRecognition = 5,
        //% blockHidden=true
        AlgorithmTagRecognition = TagRecognition,
        //% block="Objektklassifikation"
        ObjectClassification = 6,
        //% blockHidden=true
        AlgorithmObjectClassification = ObjectClassification,
        //% block="Pose-Erkennung"
        PoseRecognition = 7,
        //% blockHidden=true
        AlgorithmPoseRecognition = PoseRecognition,
        //% blockHidden=true
        AlgorithmSelfLearningClassification = 8,
        //% blockHidden=true
        AlgorithmSegment = 9,
        //% blockHidden=true
        AlgorithmHandRecognition = 10
    }

    /**
     * Eigenschaften eines erkannten Objekts oder Gesichts.
     */
    export enum BasePropertyId {
        //% block="ID"
        Id = 0,
        //% block="Name"
        Name = 5,
        //% block="X-Mitte"
        XCenter = 1,
        //% block="Y-Mitte"
        YCenter = 2,
        //% block="Breite"
        Width = 3,
        //% block="Hoehe"
        Height = 4
    }

    /**
     * Eigenschaften eines erkannten Pfeils.
     */
    export enum ArrowPropertyId {
        //% block="ID"
        Id = 0,
        //% block="X-Start"
        XOrigin = 1,
        //% block="Y-Start"
        YOrigin = 2,
        //% block="X-Ziel"
        XTarget = 3,
        //% block="Y-Ziel"
        YTarget = 4
    }

    /**
     * Art des Erkennungs-Ergebnisses.
     */
    export enum ResultType {
        //% block="Kasten"
        Block = 0,
        //% block="Pfeil"
        Arrow = 1
    }

    let learnedCount = 0
    let blockCount = 0
    let arrowCount = 0

    let blockResults: number[][] = []
    let arrowResults: number[][] = []

    function checksum(buf: Buffer): number {
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]
        return sum & 0xFF
    }

    function u16(buf: Buffer, idx: number): number {
        if (idx + 1 >= buf.length) return 0
        return buf[idx] | (buf[idx + 1] << 8)
    }

    function writeCommand(cmd: number, payload?: Buffer) {
        const payloadLen = payload ? payload.length : 0
        const packet = pins.createBuffer(6 + payloadLen)
        packet[0] = HEADER
        packet[1] = HEADER2
        packet[2] = ADDRESS
        packet[3] = payloadLen
        packet[4] = cmd
        for (let i = 0; i < payloadLen; i++) packet[5 + i] = payload[i]
        packet[5 + payloadLen] = checksum(packet.slice(0, 5 + payloadLen))
        pins.i2cWriteBuffer(i2cAddr, packet, false)
    }

    function readPacket(maxLen: number = 96): Buffer {
        return pins.i2cReadBuffer(i2cAddr, maxLen, false)
    }

    function resetResults() {
        blockResults = []
        arrowResults = []
        blockCount = 0
        arrowCount = 0
    }

    function parseResultRecordAsBlock(buf: Buffer, i: number): number[] {
        return [
            u16(buf, i + 14),
            u16(buf, i + 6),
            u16(buf, i + 8),
            u16(buf, i + 10),
            u16(buf, i + 12)
        ]
    }

    function parseResults(buf: Buffer) {
        resetResults()
        if (buf.length < 20) return

        // Conservative parser: collect records that look like HUSKYLENS packets.
        for (let i = 0; i < buf.length - 16; i++) {
            if (buf[i] == HEADER && buf[i + 1] == HEADER2 && buf[i + 2] == ADDRESS) {
                const cmd = buf[i + 4]

                if (cmd == 0x29) {
                    learnedCount = u16(buf, i + 5)
                }

                const parsedBlock = parseResultRecordAsBlock(buf, i)
                if (blockResults.length < MAX_RESULTS) blockResults.push(parsedBlock)
            }
        }

        blockCount = blockResults.length

        // Mirror object data into arrow slots so the matching blocks stay usable.
        for (let i = 0; i < blockResults.length && i < MAX_RESULTS; i++) {
            const b = blockResults[i]
            arrowResults.push([b[0], b[1], b[2], b[3], b[4]])
        }
        arrowCount = arrowResults.length
    }

    function getByIndex(items: number[][], index1: number, property: number): number {
        if (index1 <= 0 || index1 > items.length) return 0
        const row = items[index1 - 1]
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    function countById(items: number[][], id: number): number {
        let c = 0
        for (let i = 0; i < items.length; i++) {
            if (items[i][0] == id) c++
        }
        return c
    }

    function findFirstById(items: number[][], id: number): number {
        for (let i = 0; i < items.length; i++) {
            if (items[i][0] == id) return i + 1
        }
        return 0
    }

    function getNthById(items: number[][], id: number, nthIndex1: number): number[] {
        if (nthIndex1 <= 0) return null
        let seen = 0
        for (let i = 0; i < items.length; i++) {
            if (items[i][0] == id) {
                seen++
                if (seen == nthIndex1) return items[i]
            }
        }
        return null
    }

    /**
     * Startet die Verbindung zur Kamera.
     * Diesen Block am besten einmal ganz am Anfang benutzen.
     */
    //% group="Start"
    //% weight=100
    //% block="Kamera vorbereiten ueber I2C (Adresse $addr)"
    //% addr.min=1 addr.max=127 addr.defl=0x32
    export function I2CInit(addr: number = 0x32) {
        i2cAddr = addr
        basic.pause(50)
        knock()
    }

    /**
     * Prueft, ob die Kamera antwortet.
     */
    //% group="Start"
    //% weight=90
    //% block="Verbindung zur Kamera klappt"
    export function knock(): boolean {
        writeCommand(0x2C)
        basic.pause(20)
        const resp = readPacket(16)
        return resp.length >= 6 && resp[0] == HEADER && resp[1] == HEADER2
    }

    /**
     * Schaltet die Kamera in einen Erkennungsmodus um.
     */
    //% group="Start"
    //% weight=80
    //% block="Kamera-Modus $algo waehlen"
    export function switchAlgorithm(algo: Algorithm) {
        const p = pins.createBuffer(2)
        p[0] = algo & 0xFF
        p[1] = (algo >> 8) & 0xFF
        writeCommand(0x2D, p)
        basic.pause(50)
    }

    /**
     * Holt neue Daten von der Kamera.
     * Diesen Block in Schleifen immer wieder benutzen.
     */
    //% group="Sehen"
    //% weight=100
    //% block="Kamera-Ergebnisse aktualisieren"
    export function request() {
        writeCommand(0x20)
        basic.pause(30)
        const resp = readPacket(96)
        parseResults(resp)
    }

    /**
     * Ist wahr, wenn gerade mindestens ein Objekt erkannt wurde.
     */
    //% group="Sehen"
    //% weight=90
    //% block="etwas erkannt"
    export function available(): boolean {
        return blockCount > 0
    }

    /**
     * Prueft, ob eine bestimmte ID gerade zu sehen ist.
     */
    //% group="Sehen"
    //% weight=80
    //% block="ID $id vom Typ $type erkannt"
    export function isAppear(id: number, type: ResultType): boolean {
        if (type == ResultType.Block) return countById(blockResults, id) > 0
        return countById(arrowResults, id) > 0
    }

    /**
     * Prueft, ob diese ID zuvor auf der Kamera angelernt wurde.
     */
    //% group="Sehen"
    //% weight=70
    //% block="ID $id wurde gelernt"
    export function isLearned(id: number): boolean {
        return id > 0 && id <= learnedCount
    }

    /**
     * Gibt an, wie viele IDs die Kamera gelernt hat.
     */
    //% group="Sehen"
    //% weight=60
    //% block="Anzahl gelernter IDs"
    export function learnedIdCount(): number {
        return learnedCount
    }

    /**
     * Zaehlt alle erkannten Objekte im aktuellen Bild.
     */
    //% group="Sehen"
    //% weight=50
    //% block="Anzahl erkannter Objekte"
    export function objectCount(): number {
        return blockCount
    }

    /**
     * Zaehlt alle erkannten Pfeile im aktuellen Bild.
     */
    //% group="Sehen"
    //% weight=40
    //% block="Anzahl erkannter Pfeile"
    export function arrowCountValue(): number {
        return arrowCount
    }

    /**
     * Liest eine Eigenschaft vom ersten erkannten Objekt.
     */
    //% group="Objekte"
    //% weight=100
    //% block="erstes Objekt Eigenschaft $property"
    export function readBox_s(property: BasePropertyId): number {
        return getByIndex(blockResults, 1, property)
    }

    /**
     * Liest eine Eigenschaft von Objekt Nummer 1 bis 8.
     */
    //% group="Objekte"
    //% weight=90
    //% block="Objekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function readBox_ss(index: number, property: BasePropertyId): number {
        return getByIndex(blockResults, index, property)
    }

    /**
     * Liest eine Eigenschaft vom ersten Objekt mit dieser ID.
     */
    //% group="Objekte"
    //% weight=80
    //% block="Objekt mit ID $id Eigenschaft $property"
    export function readBoxById(id: number, property: BasePropertyId): number {
        const idx = findFirstById(blockResults, id)
        return getByIndex(blockResults, idx, property)
    }

    /**
     * Zaehlt, wie oft diese Objekt-ID im Bild vorkommt.
     */
    //% group="Objekte"
    //% weight=70
    //% block="Anzahl Objekte mit ID $id"
    export function countBoxById(id: number): number {
        return countById(blockResults, id)
    }

    /**
     * Liest eine Eigenschaft vom ersten erkannten Pfeil.
     */
    //% group="Pfeile"
    //% weight=100
    //% block="erster Pfeil Eigenschaft $property"
    export function readArrow_s(property: ArrowPropertyId): number {
        return getByIndex(arrowResults, 1, property)
    }

    /**
     * Liest eine Eigenschaft von Pfeil Nummer 1 bis 8.
     */
    //% group="Pfeile"
    //% weight=90
    //% block="Pfeil #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function readArrow_ss(index: number, property: ArrowPropertyId): number {
        return getByIndex(arrowResults, index, property)
    }

    /**
     * Liest eine Eigenschaft vom ersten Pfeil mit dieser ID.
     */
    //% group="Pfeile"
    //% weight=80
    //% block="Pfeil mit ID $id Eigenschaft $property"
    export function readArrowById(id: number, property: ArrowPropertyId): number {
        const idx = findFirstById(arrowResults, id)
        return getByIndex(arrowResults, idx, property)
    }

    /**
     * Zaehlt, wie oft diese Pfeil-ID im Bild vorkommt.
     */
    //% group="Pfeile"
    //% weight=70
    //% block="Anzahl Pfeile mit ID $id"
    export function countArrowById(id: number): number {
        return countById(arrowResults, id)
    }

    /**
     * Liest eine Eigenschaft vom ersten erkannten Objekt.
     */
    //% group="Werte"
    //% weight=100
    //% block="Objekt-Eigenschaft $property"
    export function cachedCenterResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    /**
     * Gibt die ID des ersten erkannten Objekts zurueck.
     */
    //% group="Werte"
    //% weight=90
    //% block="Objekt-ID"
    export function id(): number {
        return readBox_s(BasePropertyId.Id)
    }

    /**
     * Gibt die X-Mitte des ersten erkannten Objekts zurueck.
     */
    //% group="Werte"
    //% weight=80
    //% block="Objekt X-Mitte"
    export function xCenter(): number {
        return readBox_s(BasePropertyId.XCenter)
    }

    /**
     * Gibt die Y-Mitte des ersten erkannten Objekts zurueck.
     */
    //% group="Werte"
    //% weight=70
    //% block="Objekt Y-Mitte"
    export function yCenter(): number {
        return readBox_s(BasePropertyId.YCenter)
    }

    /**
     * Gibt die Breite des ersten erkannten Objekts zurueck.
     */
    //% group="Werte"
    //% weight=60
    //% block="Objekt-Breite"
    export function width(): number {
        return readBox_s(BasePropertyId.Width)
    }

    /**
     * Gibt die Hoehe des ersten erkannten Objekts zurueck.
     */
    //% group="Werte"
    //% weight=50
    //% block="Objekt-Hoehe"
    export function height(): number {
        return readBox_s(BasePropertyId.Height)
    }

    // Compatibility blocks for DFRobot V2 style projects.

    // Face Recognition
    //% group="Profi"
    //% weight=40
    //% block="HUSKYLENS2 Gesichtserkennung Ergebnis holen"
    export function getResultFaceRecognition(): void {
        switchAlgorithm(Algorithm.FaceRecognition)
        request()
    }

    //% group="Profi"
    //% weight=39
    //% block="HUSKYLENS2 Gesicht erkannt?"
    export function availableFaceRecognition(): boolean {
        return available()
    }

    //% group="Profi"
    //% weight=38
    //% block="HUSKYLENS2 Anzahl Gesichter"
    export function cachedResultNumFace(): number {
        return objectCount()
    }

    //% group="Profi"
    //% weight=37
    //% block="HUSKYLENS2 Gesicht nahe Mitte $property"
    export function cachedCenterFaceResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Profi"
    //% weight=36
    //% block="HUSKYLENS2 Gesicht #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultFaceProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Profi"
    //% weight=35
    //% block="HUSKYLENS2 Anzahl gelernter Gesichts-IDs"
    export function totalLearnedFaceIds(): number {
        return learnedIdCount()
    }

    //% group="Profi"
    //% weight=34
    //% block="HUSKYLENS2 Gesichts-ID $id vorhanden?"
    export function faceIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Profi"
    //% weight=33
    //% block="HUSKYLENS2 Anzahl Gesichter mit ID $id"
    export function totalFaceById(id: number): number {
        return countBoxById(id)
    }

    //% group="Profi"
    //% weight=32
    //% block="HUSKYLENS2 Gesichts-ID $id Eigenschaft $property"
    export function facePropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Profi"
    //% weight=31
    //% block="HUSKYLENS2 Gesichts-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function facePropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Object Recognition
    //% group="Profi"
    //% weight=30
    //% block="HUSKYLENS2 Objekterkennung Ergebnis holen"
    export function getResultObjectRecognition(): void {
        switchAlgorithm(Algorithm.ObjectRecognition)
        request()
    }

    //% group="Profi"
    //% weight=29
    //% block="HUSKYLENS2 Objekt erkannt? (Objekterkennung)"
    export function availableObjectRecognition(): boolean {
        return available()
    }

    //% group="Profi"
    //% weight=28
    //% block="HUSKYLENS2 Anzahl Objekte (Objekterkennung)"
    export function cachedResultNumObject(): number {
        return objectCount()
    }

    //% group="Profi"
    //% weight=27
    //% block="HUSKYLENS2 Objekt nahe Mitte $property"
    export function cachedCenterObjectResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Profi"
    //% weight=26
    //% block="HUSKYLENS2 Objekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultObjectProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Profi"
    //% weight=25
    //% block="HUSKYLENS2 Anzahl gelernter Objekt-IDs"
    export function totalLearnedObjectIds(): number {
        return learnedIdCount()
    }

    //% group="Profi"
    //% weight=24
    //% block="HUSKYLENS2 Objekt-ID $id vorhanden?"
    export function objectIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Profi"
    //% weight=23
    //% block="HUSKYLENS2 Anzahl Objekte mit ID $id"
    export function totalObjectById(id: number): number {
        return countBoxById(id)
    }

    //% group="Profi"
    //% weight=22
    //% block="HUSKYLENS2 Objekt-ID $id Eigenschaft $property"
    export function objectPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Profi"
    //% weight=21
    //% block="HUSKYLENS2 Objekt-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function objectPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Color Recognition
    //% group="Profi"
    //% weight=20
    //% block="HUSKYLENS2 Farberkennung Ergebnis holen"
    export function getResultColorRecognition(): void {
        switchAlgorithm(Algorithm.ColorRecognition)
        request()
    }

    //% group="Profi"
    //% weight=19
    //% block="HUSKYLENS2 Farbobjekt erkannt?"
    export function availableColorRecognition(): boolean {
        return available()
    }

    //% group="Profi"
    //% weight=18
    //% block="HUSKYLENS2 Anzahl Farbobjekte"
    export function cachedResultNumColor(): number {
        return objectCount()
    }

    //% group="Profi"
    //% weight=17
    //% block="HUSKYLENS2 Farbobjekt nahe Mitte $property"
    export function cachedCenterColorResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Profi"
    //% weight=16
    //% block="HUSKYLENS2 Farbobjekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultColorProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Profi"
    //% weight=15
    //% block="HUSKYLENS2 Anzahl gelernter Farb-IDs"
    export function totalLearnedColorIds(): number {
        return learnedIdCount()
    }

    //% group="Profi"
    //% weight=14
    //% block="HUSKYLENS2 Farb-ID $id vorhanden?"
    export function colorIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Profi"
    //% weight=13
    //% block="HUSKYLENS2 Anzahl Farben mit ID $id"
    export function totalColorById(id: number): number {
        return countBoxById(id)
    }

    //% group="Profi"
    //% weight=12
    //% block="HUSKYLENS2 Farb-ID $id Eigenschaft $property"
    export function colorPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Profi"
    //% weight=11
    //% block="HUSKYLENS2 Farb-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function colorPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Object Tracking
    //% group="Profi"
    //% weight=10
    //% block="HUSKYLENS2 Objektverfolgung Ergebnis holen"
    export function getResultObjectTracking(): void {
        switchAlgorithm(Algorithm.ObjectTracking)
        request()
    }

    //% group="Profi"
    //% weight=9
    //% block="HUSKYLENS2 Verfolgtes Objekt erkannt?"
    export function availableObjectTracking(): boolean {
        return available()
    }

    //% group="Profi"
    //% weight=8
    //% block="HUSKYLENS2 Anzahl Tracking-Objekte"
    export function cachedResultNumObjectTracking(): number {
        return objectCount()
    }

    //% group="Profi"
    //% weight=7
    //% block="HUSKYLENS2 Tracking-Objekt nahe Mitte $property"
    export function cachedCenterObjectTrackingResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Profi"
    //% weight=6
    //% block="HUSKYLENS2 Tracking-Objekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultObjectTrackingProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Profi"
    //% weight=5
    //% block="HUSKYLENS2 Anzahl gelernter Tracking-IDs"
    export function totalLearnedObjectTrackingIds(): number {
        return learnedIdCount()
    }

    //% group="Profi"
    //% weight=4
    //% block="HUSKYLENS2 Tracking-ID $id vorhanden?"
    export function objectTrackingIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Profi"
    //% weight=3
    //% block="HUSKYLENS2 Anzahl Tracking-Objekte mit ID $id"
    export function totalObjectTrackingById(id: number): number {
        return countBoxById(id)
    }

    //% group="Profi"
    //% weight=2
    //% block="HUSKYLENS2 Tracking-ID $id Eigenschaft $property"
    export function objectTrackingPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Profi"
    //% weight=1
    //% block="HUSKYLENS2 Tracking-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function objectTrackingPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }
}
