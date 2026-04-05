/*
 * PM-Chat Mesh Firmware — Battery Monitor (LiPo via ADC)
 */
#include "battery.h"
#include "pins.h"
#include <Arduino.h>

static uint16_t s_voltage_mv = 0;
static uint8_t  s_percent    = 0;
static uint16_t s_samples[8];
static uint8_t  s_sample_idx = 0;
static bool     s_filled     = false;

void battery::init() {
    pinMode(PIN_BATT_ADC, INPUT_ANALOG);
    memset(s_samples, 0, sizeof(s_samples));
    s_sample_idx = 0;
    s_filled = false;

    /* Take initial readings */
    for (int i = 0; i < 8; i++) {
        s_samples[i] = analogRead(PIN_BATT_ADC);
        delay(2);
    }
    s_filled = true;
    update();
}

void battery::update() {
    /* Take a new sample */
    s_samples[s_sample_idx] = analogRead(PIN_BATT_ADC);
    s_sample_idx = (s_sample_idx + 1) & 7;

    /* Average the samples */
    uint32_t sum = 0;
    for (int i = 0; i < 8; i++) {
        sum += s_samples[i];
    }
    uint16_t avg = (uint16_t)(sum >> 3);

    /* Convert ADC to millivolts.
     * STM32 12-bit ADC (0-4095), Vref = 3300mV
     * Voltage divider 100k/100k → multiply by 2 */
    s_voltage_mv = (uint16_t)(((uint32_t)avg * 3300 * BATT_DIVIDER) / 4095);

    /* Calculate percentage using linear approximation:
     * 4200mV = 100%, 3700mV = 50%, 3000mV = 0% */
    if (s_voltage_mv >= BATT_FULL_MV) {
        s_percent = 100;
    } else if (s_voltage_mv <= BATT_EMPTY_MV) {
        s_percent = 0;
    } else {
        s_percent = (uint8_t)(((uint32_t)(s_voltage_mv - BATT_EMPTY_MV) * 100)
                              / (BATT_FULL_MV - BATT_EMPTY_MV));
    }
}

uint16_t battery::voltage_mv() { return s_voltage_mv; }
uint8_t  battery::percent()    { return s_percent; }
bool     battery::is_critical(){ return s_voltage_mv <= BATT_CRIT_MV && s_voltage_mv > 0; }
bool     battery::is_low()     { return s_voltage_mv <= BATT_LOW_MV && s_voltage_mv > 0; }
