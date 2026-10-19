# Firmware

`fieldtrace_temperature_test/fieldtrace_temperature_test.ino` is the current ESP32 DS18B20 temperature-sensor sketch. It reads the sensor on GPIO 4 and prints measurements over serial.

The sketch requires the Arduino `OneWire` and `DallasTemperature` libraries. This is a temperature test sketch, not yet the complete FieldTrace sensor-node firmware.
