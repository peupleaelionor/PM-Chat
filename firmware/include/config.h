/*
 * PM-Chat Mesh Firmware — System Configuration
 * All compile-time constants, types, and enumerations.
 */
#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>

/* ── Firmware ── */
#define FW_VERSION_MAJOR   1
#define FW_VERSION_MINOR   0
#define FW_VERSION_PATCH   0

/* ── Protocol ── */
#define PROTOCOL_VERSION   0x01
#define PACKET_HEADER_SIZE 30
#define PACKET_TAG_SIZE    16
#define PACKET_MAX_PAYLOAD 200
#define PACKET_MAX_SIZE    (PACKET_HEADER_SIZE + PACKET_MAX_PAYLOAD + PACKET_TAG_SIZE)
#define NONCE_SIZE         12
#define KEY_SIZE           32
#define TAG_SIZE           16
#define AAD_SIZE           14   /* version+type+sender_id+dest_id+msg_id */

/* ── LoRa Radio (EU868) ── */
#define LORA_FREQUENCY     868.0f
#define LORA_BANDWIDTH     125.0f
#define LORA_SF            9
#define LORA_CR            7
#define LORA_SYNC_WORD     0x12
#define LORA_TX_POWER      14
#define LORA_PREAMBLE      8

/* ── Mesh ── */
#define MESH_DEFAULT_TTL   3
#define MESH_MAX_TTL       7
#define MESH_DEDUP_SIZE    64
#define MESH_DEDUP_TTL_MS  60000UL
#define MESH_RELAY_DELAY   100

/* ── Messages ── */
#define MAX_MESSAGES       32
#define MAX_TEXT_LEN       160
#define MAX_PEERS          8
#define MSG_RETRY_MAX      3
#define MSG_RETRY_BASE_MS  2000UL
#define MSG_EXPIRE_MS      3600000UL
#define BROADCAST_ID       0xFFFFFFFFUL

/* ── Display ── */
#define SCREEN_W           128
#define SCREEN_H           64
#define HDR_H              13
#define FTR_H              11
#define CONTENT_Y          (HDR_H + 1)
#define CONTENT_H          (SCREEN_H - HDR_H - FTR_H - 2)
#define UI_FPS_MS          100
#define DIM_TIMEOUT_MS     30000UL
#define OFF_TIMEOUT_MS     120000UL

/* ── Buttons ── */
#define DEBOUNCE_MS        30
#define LONG_PRESS_MS      800
#define PANIC_HOLD_MS      3000
#define REPEAT_DELAY_MS    400
#define REPEAT_RATE_MS     80

/* ── Battery ── */
#define BATT_INTERVAL_MS   10000UL
#define BATT_FULL_MV       4200
#define BATT_LOW_MV        3300
#define BATT_CRIT_MV       3100
#define BATT_EMPTY_MV      3000
#define BATT_DIVIDER       2

/* ── EEPROM layout ── */
#define EEPROM_TOTAL       256
#define ADDR_MAGIC         0      /*  4 bytes */
#define ADDR_DEVICE_ID     4      /*  4 bytes */
#define ADDR_NET_KEY       8      /* 32 bytes */
#define ADDR_PIN_ENABLED   40     /*  1 byte  */
#define ADDR_PIN_HASH      41     /*  4 bytes */
#define ADDR_BRIGHTNESS    45     /*  1 byte  */
#define ADDR_MSG_COUNTER   46     /*  4 bytes */
#define ADDR_MESH_PIN      50     /*  4 bytes */
#define MAGIC_VALUE        0x504D4348UL  /* "PMCH" */

/* ── Watchdog ── */
#define WDG_TIMEOUT_US     8000000UL

/* ── Loop ── */
#define LOOP_DELAY_MS      5

/* ── Charset for text input ── */
#define INPUT_CHARSET      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-:;'@#&+="

/* ──────── Enumerations ──────── */

enum PacketType : uint8_t {
    PKT_TEXT     = 0x01,
    PKT_ACK      = 0x02,
    PKT_PING     = 0x03,
    PKT_PAIR_REQ = 0x04,
    PKT_PAIR_ACK = 0x05,
};

enum PacketFlag : uint8_t {
    FLAG_NONE      = 0x00,
    FLAG_BURN      = 0x01,
    FLAG_ACK_REQ   = 0x02,
    FLAG_RELAYED   = 0x04,
    FLAG_PRIORITY  = 0x08,
    FLAG_ENCRYPTED = 0x10,
};

enum SystemState : uint8_t {
    STATE_BOOT,
    STATE_SETUP,
    STATE_PIN_ENTRY,
    STATE_IDLE,
    STATE_RECEIVING,
    STATE_SENDING,
    STATE_TEST,
    STATE_ERROR,
};

enum Screen : uint8_t {
    SCR_SPLASH,
    SCR_SETUP_WELCOME,
    SCR_SETUP_PIN,
    SCR_DEVICE_INFO,
    SCR_INBOX,
    SCR_CONVERSATION,
    SCR_COMPOSE,
    SCR_SENDING,
    SCR_SETTINGS,
    SCR_NETWORK,
    SCR_WIPE_CONFIRM,
    SCR_PIN_ENTRY,
    SCR_TEST,
    SCR_ERROR,
};

enum MsgState : uint8_t {
    MSTATE_QUEUED,
    MSTATE_SENDING,
    MSTATE_SENT,
    MSTATE_DELIVERED,
    MSTATE_READ,
    MSTATE_FAILED,
    MSTATE_EXPIRED,
};

enum BtnEvent : uint8_t {
    BTN_NONE       = 0,
    BTN_UP_SHORT   = 1,
    BTN_UP_LONG    = 2,
    BTN_OK_SHORT   = 3,
    BTN_OK_LONG    = 4,
    BTN_DOWN_SHORT = 5,
    BTN_DOWN_LONG  = 6,
    BTN_PANIC      = 7,
};

#endif
