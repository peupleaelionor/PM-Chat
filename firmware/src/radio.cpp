/*
 * PM-Chat Mesh Firmware — LoRa Radio (RadioLib STM32WLx)
 */
#include "radio.h"
#include "pins.h"
#include <RadioLib.h>

static STM32WLx s_radio = new Module(RADIOLIB_BUILTIN_MODULE);

static volatile bool s_rx_flag  = false;
static volatile bool s_tx_done  = false;
static int16_t       s_rssi     = 0;
static float         s_snr      = 0.0f;

static void on_rx_done() {
    s_rx_flag = true;
}

bool radio::init() {
    int state = s_radio.begin(
        LORA_FREQUENCY,
        LORA_BANDWIDTH,
        LORA_SF,
        LORA_CR,
        LORA_SYNC_WORD,
        LORA_TX_POWER,
        LORA_PREAMBLE
    );

    if (state != RADIOLIB_ERR_NONE) {
        return false;
    }

    /* Set CRC on for all packets */
    s_radio.setCRC(true);

    /* Set DIO1 interrupt for receive */
    s_radio.setDio1Action(on_rx_done);

    /* Start listening */
    s_radio.startReceive();

    return true;
}

bool radio::send(const uint8_t *buf, uint16_t len) {
    if (len == 0 || len > PACKET_MAX_SIZE) return false;

    /* Block and transmit */
    int state = s_radio.transmit(const_cast<uint8_t *>(buf), len);

    /* Re-enable receive mode after transmit */
    s_radio.startReceive();

    return (state == RADIOLIB_ERR_NONE);
}

bool radio::receive(uint8_t *buf, uint16_t &len) {
    if (!s_rx_flag) return false;
    s_rx_flag = false;

    uint16_t pkt_len = s_radio.getPacketLength();
    if (pkt_len == 0 || pkt_len > PACKET_MAX_SIZE) {
        s_radio.startReceive();
        return false;
    }

    int state = s_radio.readData(buf, pkt_len);

    s_rssi = (int16_t)s_radio.getRSSI();
    s_snr  = s_radio.getSNR();

    /* Restart receive */
    s_radio.startReceive();

    if (state != RADIOLIB_ERR_NONE) {
        return false;
    }

    len = pkt_len;
    return true;
}

void radio::start_receive() {
    s_radio.startReceive();
}

int16_t radio::last_rssi() {
    return s_rssi;
}

float radio::last_snr() {
    return s_snr;
}

bool radio::is_busy() {
    return false; /* Blocking transmit, so never busy outside send() */
}
