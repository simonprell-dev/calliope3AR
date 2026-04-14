huskylens2.I2CInit()

basic.forever(function () {
    if (huskylens2.knock()) {
        basic.showIcon(IconNames.Yes)
    } else {
        basic.showIcon(IconNames.No)
    }
    basic.pause(300)
})
