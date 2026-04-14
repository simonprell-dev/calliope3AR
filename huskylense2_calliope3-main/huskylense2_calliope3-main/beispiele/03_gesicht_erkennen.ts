huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.FaceRecognition)

basic.forever(function () {
    huskylens2.request()
    if (huskylens2.available()) {
        serial.writeLine("ID=" + huskylens2.id())
        serial.writeLine("X=" + huskylens2.xCenter())
        serial.writeLine("Y=" + huskylens2.yCenter())
    }
    basic.pause(100)
})
