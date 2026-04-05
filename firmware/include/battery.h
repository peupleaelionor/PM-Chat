/*
 * PM-Chat Mesh Firmware — Battery Monitor
 * ADC-based LiPo voltage reading with smoothing.
 */
#ifndef BATTERY_H
#define BATTERY_H

#include "config.h"

namespace battery {

/* Initialise ADC pin. */
void init();

/* Read battery and update internal state.
 * Call periodically (e.g., every 10 seconds). */
void update();

/* Get battery voltage in millivolts. */
uint16_t voltage_mv();

/* Get battery percentage (0-100). */
uint8_t percent();

/* Check if battery is critically low. */
bool is_critical();

/* Check if battery is low. */
bool is_low();

} // namespace battery

#endif
