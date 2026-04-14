/**
 * HUSKYLENS 2 - Calliope mini 3 compatible port (I2C)
 */

//% color=#2E86DE icon="\uf085" block="HUSKYLENS2"
//% groups=['Setup', 'Erkennung', 'Kasten', 'Pfeil', 'Werte']
namespace huskylens2 {
    const HEADER = 0x55
    const HEADER2 = 0xAA
    const ADDRESS = 0x11
    const DEFAULT_I2C_ADDR = 0x32
    const MAX_RESULTS = 8

    let i2cAddr = DEFAULT_I2C_ADDR

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
        //% block="Höhe"
        Height = 4
    }

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

    function parseResultRecordAsArrow(buf: Buffer, i: number): number[] {
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

        // Konservative Heuristik: Suche Header und lese Datensätze.
        for (let i = 0; i < buf.length - 16; i++) {
            if (buf[i] == HEADER && buf[i + 1] == HEADER2 && buf[i + 2] == ADDRESS) {
                const cmd = buf[i + 4]

                if (cmd == 0x29) {
                    learnedCount = u16(buf, i + 5)
                }

                // Für allgemeine Ergebnisdaten behandeln wir Einträge als Boxen;
                // bei Linienverfolgung/Arrow-Modi können gleiche Felder als Pfeil gelesen werden.
                const parsedBlock = parseResultRecordAsBlock(buf, i)
                if (blockResults.length < MAX_RESULTS) blockResults.push(parsedBlock)
            }
        }

        blockCount = blockResults.length

        // Spiegelung der Datensätze als Pfeile (gleiche 5 Felder),
        // damit Pfeil-Blöcke in MakeCode verfügbar sind.
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

    //% group="Setup"
    //% block="HUSKYLENS2 I2C initialisieren (Adresse $addr)"
    //% addr.min=1 addr.max=127 addr.defl=0x32
    export function I2CInit(addr: number = 0x32) {
        i2cAddr = addr
        basic.pause(50)
        knock()
    }

    //% group="Setup"
    //% block="HUSKYLENS2 Verbindung testen"
    export function knock(): boolean {
        writeCommand(0x2C)
        basic.pause(20)
        const resp = readPacket(16)
        return resp.length >= 6 && resp[0] == HEADER && resp[1] == HEADER2
    }

    //% group="Setup"
    //% block="HUSKYLENS2 Algorithmus $algo wählen"
    export function switchAlgorithm(algo: Algorithm) {
        const p = pins.createBuffer(2)
        p[0] = algo & 0xFF
        p[1] = (algo >> 8) & 0xFF
        writeCommand(0x2D, p)
        basic.pause(50)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Ergebnisse aktualisieren"
    export function request() {
        writeCommand(0x20)
        basic.pause(30)
        const resp = readPacket(96)
        parseResults(resp)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Objekt erkannt"
    export function available(): boolean {
        return blockCount > 0
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 hat ID $id vom Typ $type"
    export function isAppear(id: number, type: ResultType): boolean {
        if (type == ResultType.Block) return countById(blockResults, id) > 0
        return countById(arrowResults, id) > 0
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 hat gelernt ID $id"
    export function isLearned(id: number): boolean {
        return id > 0 && id <= learnedCount
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl gelernter IDs"
    export function learnedIdCount(): number {
        return learnedCount
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Objekte"
    export function objectCount(): number {
        return blockCount
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Pfeile"
    export function arrowCountValue(): number {
        return arrowCount
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Kasten Mitte Eigenschaft $property"
    export function readBox_s(property: BasePropertyId): number {
        return getByIndex(blockResults, 1, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Kasten #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function readBox_ss(index: number, property: BasePropertyId): number {
        return getByIndex(blockResults, index, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Kasten ID $id Eigenschaft $property"
    export function readBoxById(id: number, property: BasePropertyId): number {
        const idx = findFirstById(blockResults, id)
        return getByIndex(blockResults, idx, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Anzahl Kasten mit ID $id"
    export function countBoxById(id: number): number {
        return countById(blockResults, id)
    }

    //% group="Pfeil"
    //% block="HUSKYLENS2 Pfeil Mitte Eigenschaft $property"
    export function readArrow_s(property: ArrowPropertyId): number {
        return getByIndex(arrowResults, 1, property)
    }

    //% group="Pfeil"
    //% block="HUSKYLENS2 Pfeil #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function readArrow_ss(index: number, property: ArrowPropertyId): number {
        return getByIndex(arrowResults, index, property)
    }

    //% group="Pfeil"
    //% block="HUSKYLENS2 Pfeil ID $id Eigenschaft $property"
    export function readArrowById(id: number, property: ArrowPropertyId): number {
        const idx = findFirstById(arrowResults, id)
        return getByIndex(arrowResults, idx, property)
    }

    //% group="Pfeil"
    //% block="HUSKYLENS2 Anzahl Pfeile mit ID $id"
    export function countArrowById(id: number): number {
        return countById(arrowResults, id)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 Eigenschaft $property"
    export function cachedCenterResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 ID"
    export function id(): number {
        return readBox_s(BasePropertyId.Id)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 X-Mitte"
    export function xCenter(): number {
        return readBox_s(BasePropertyId.XCenter)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 Y-Mitte"
    export function yCenter(): number {
        return readBox_s(BasePropertyId.YCenter)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 Breite"
    export function width(): number {
        return readBox_s(BasePropertyId.Width)
    }

    //% group="Werte"
    //% block="HUSKYLENS2 Höhe"
    export function height(): number {
        return readBox_s(BasePropertyId.Height)
    }

    // --- Kompatibilitätsblöcke zum DFRobot-Referenzprojekt ---
    // Face Recognition
    //% group="Erkennung"
    //% block="HUSKYLENS2 Gesichtserkennung Ergebnis holen"
    export function getResultFaceRecognition(): void {
        switchAlgorithm(Algorithm.FaceRecognition)
        request()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Gesicht erkannt?"
    export function availableFaceRecognition(): boolean {
        return available()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Gesichter"
    export function cachedResultNumFace(): number {
        return objectCount()
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Gesicht nahe Mitte $property"
    export function cachedCenterFaceResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Gesicht #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultFaceProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl gelernter Gesichts-IDs"
    export function totalLearnedFaceIds(): number {
        return learnedIdCount()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Gesichts-ID $id vorhanden?"
    export function faceIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Gesichter mit ID $id"
    export function totalFaceById(id: number): number {
        return countBoxById(id)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Gesichts-ID $id Eigenschaft $property"
    export function facePropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Gesichts-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function facePropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Object Recognition
    //% group="Erkennung"
    //% block="HUSKYLENS2 Objekterkennung Ergebnis holen"
    export function getResultObjectRecognition(): void {
        switchAlgorithm(Algorithm.ObjectRecognition)
        request()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Objekt erkannt? (Objekterkennung)"
    export function availableObjectRecognition(): boolean {
        return available()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Objekte (Objekterkennung)"
    export function cachedResultNumObject(): number {
        return objectCount()
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Objekt nahe Mitte $property"
    export function cachedCenterObjectResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Objekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultObjectProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl gelernter Objekt-IDs"
    export function totalLearnedObjectIds(): number {
        return learnedIdCount()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Objekt-ID $id vorhanden?"
    export function objectIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Objekte mit ID $id"
    export function totalObjectById(id: number): number {
        return countBoxById(id)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Objekt-ID $id Eigenschaft $property"
    export function objectPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Objekt-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function objectPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Color Recognition
    //% group="Erkennung"
    //% block="HUSKYLENS2 Farberkennung Ergebnis holen"
    export function getResultColorRecognition(): void {
        switchAlgorithm(Algorithm.ColorRecognition)
        request()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Farbobjekt erkannt?"
    export function availableColorRecognition(): boolean {
        return available()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Farbobjekte"
    export function cachedResultNumColor(): number {
        return objectCount()
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Farbobjekt nahe Mitte $property"
    export function cachedCenterColorResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Farbobjekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultColorProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl gelernter Farb-IDs"
    export function totalLearnedColorIds(): number {
        return learnedIdCount()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Farb-ID $id vorhanden?"
    export function colorIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Farben mit ID $id"
    export function totalColorById(id: number): number {
        return countBoxById(id)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Farb-ID $id Eigenschaft $property"
    export function colorPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Farb-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function colorPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }

    // Object Tracking
    //% group="Erkennung"
    //% block="HUSKYLENS2 Objektverfolgung Ergebnis holen"
    export function getResultObjectTracking(): void {
        switchAlgorithm(Algorithm.ObjectTracking)
        request()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Verfolgtes Objekt erkannt?"
    export function availableObjectTracking(): boolean {
        return available()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Tracking-Objekte"
    export function cachedResultNumObjectTracking(): number {
        return objectCount()
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Tracking-Objekt nahe Mitte $property"
    export function cachedCenterObjectTrackingResult(property: BasePropertyId): number {
        return readBox_s(property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Tracking-Objekt #$index Eigenschaft $property"
    //% index.min=1 index.max=8 index.defl=1
    export function cachedResultObjectTrackingProperty(index: number, property: BasePropertyId): number {
        return readBox_ss(index, property)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl gelernter Tracking-IDs"
    export function totalLearnedObjectTrackingIds(): number {
        return learnedIdCount()
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Tracking-ID $id vorhanden?"
    export function objectTrackingIdExists(id: number): boolean {
        return isAppear(id, ResultType.Block)
    }

    //% group="Erkennung"
    //% block="HUSKYLENS2 Anzahl Tracking-Objekte mit ID $id"
    export function totalObjectTrackingById(id: number): number {
        return countBoxById(id)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Tracking-ID $id Eigenschaft $property"
    export function objectTrackingPropertyById(id: number, property: BasePropertyId): number {
        return readBoxById(id, property)
    }

    //% group="Kasten"
    //% block="HUSKYLENS2 Tracking-ID $id Eintrag #$index Eigenschaft $property"
    //% id.min=1 id.defl=1
    //% index.min=1 index.defl=1
    export function objectTrackingPropertyByIdNth(id: number, index: number, property: BasePropertyId): number {
        const row = getNthById(blockResults, id, index)
        if (!row || property < 0 || property >= row.length) return 0
        return row[property]
    }
}
