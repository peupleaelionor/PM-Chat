/*
 * PM-Chat Mesh Firmware — Hardware Pin Definitions
 * Target: RAK3172-E Evaluation Board (STM32WLE5CC)
 *
 * See WIRING.md for physical connection diagram.
 */
#ifndef PINS_H
#define PINS_H

#include <Arduino.h>

/* ── I2C — OLED SSD1306 ── */
#define PIN_I2C_SDA    PA11
#define PIN_I2C_SCL    PA12

/* ── Buttons (active LOW, internal pull-up) ── */
#define PIN_BTN_UP     PA15
#define PIN_BTN_OK     PB6
#define PIN_BTN_DOWN   PB7

/* ── Battery ADC (voltage divider 100k/100k) ── */
#define PIN_BATT_ADC   PB3

/* ── Status LED (active HIGH) ── */
#define PIN_LED        PB5

/* ── Debug UART ── */
#define PIN_UART_TX    PA9
#define PIN_UART_RX    PA10

/*
 * LoRa radio uses the internal SubGHz SPI of STM32WLE5.
 * No external pin assignment needed — RadioLib handles it
 * via RADIOLIB_BUILTIN_MODULE.
 */

#endif
