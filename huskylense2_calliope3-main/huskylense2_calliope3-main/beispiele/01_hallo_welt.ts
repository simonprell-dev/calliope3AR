huskylens2.I2CInit()

if (huskylens2.knock()) {
    basic.showString("Hallo Welt")
} else {
    basic.showIcon(IconNames.No)
}
