huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.ColorRecognition)

basic.forever(function () {
    huskylens2.request()
    if (!huskylens2.available()) {
        basic.clearScreen()
        basic.pause(100)
        return
    }

    const x = huskylens2.xCenter()
    if (x < 110) {
        basic.showArrow(ArrowNames.West)
    } else if (x > 210) {
        basic.showArrow(ArrowNames.East)
    } else {
        basic.showIcon(IconNames.Square)
    }
    basic.pause(120)
})
