/*
 * PM-Chat Mesh Firmware — LoRa Radio Module
 * Wraps RadioLib STM32WLx for LoRa communication.
 */
#ifndef RADIO_H
#define RADIO_H

#include "config.h"

namespace radio {

/* Initialise LoRa radio. Returns true on success. */
bool init();

/* Send raw buffer over LoRa. Returns true on success. */
bool send(const uint8_t *buf, uint16_t len);

/* Check if a packet has been received (non-blocking).
 * If true, copies data into buf[] and sets len. */
bool receive(uint8_t *buf, uint16_t &len);

/* Put radio back into receive mode after a send. */
void start_receive();

/* Get RSSI of last received packet (dBm). */
int16_t last_rssi();

/* Get SNR of last received packet (dB). */
float last_snr();

/* Check if radio is currently transmitting. */
bool is_busy();

} // namespace radio

#endif
