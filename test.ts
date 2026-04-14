huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.FaceRecognition)

basic.forever(function () {
    huskylens2.request()
    if (huskylens2.available()) {
        serial.writeLine("Objekt erkannt")
    }
    basic.pause(200)
})
