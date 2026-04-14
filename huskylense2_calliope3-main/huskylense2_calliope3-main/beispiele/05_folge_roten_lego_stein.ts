// Beispiel mit einfacher Fahrlogik.
// Passe die Motor-Funktionen an deine Motorplatine an.

huskylens2.I2CInit()
huskylens2.switchAlgorithm(huskylens2.Algorithm.ColorRecognition)

const linksSchwelle = 120
const rechtsSchwelle = 200

function fahreGerade() {
    serial.writeLine("Motor: gerade")
}

function dreheLinks() {
    serial.writeLine("Motor: links")
}

function dreheRechts() {
    serial.writeLine("Motor: rechts")
}

function stopp() {
    serial.writeLine("Motor: stopp")
}

basic.forever(function () {
    huskylens2.request()

    if (!huskylens2.available()) {
        stopp()
        basic.showIcon(IconNames.SmallDiamond)
        basic.pause(100)
        return
    }

    const x = huskylens2.xCenter()

    if (x < linksSchwelle) {
        dreheLinks()
        basic.showArrow(ArrowNames.West)
    } else if (x > rechtsSchwelle) {
        dreheRechts()
        basic.showArrow(ArrowNames.East)
    } else {
        fahreGerade()
        basic.showArrow(ArrowNames.North)
    }

    basic.pause(80)
})
