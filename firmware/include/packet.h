/*
 * PM-Chat Mesh Firmware — Binary Packet Format
 *
 * Layout (little-endian):
 *   Offset  Size  Field
 *   ──────  ────  ─────
 *   0       1     version        Protocol version
 *   1       1     type           PacketType enum
 *   2       4     sender_id      Source device ID
 *   6       4     dest_id        Destination (BROADCAST_ID = all)
 *   10      4     msg_id         Unique message identifier
 *   14      1     ttl            Hops remaining
 *   15      1     flags          PacketFlag bitmask
 *   16      12    nonce          AES-GCM nonce
 *   28      2     payload_len    Encrypted payload length
 *   30      N     payload        Encrypted payload (max 200)
 *   30+N    16    tag            AES-GCM auth tag
 *
 *   Max total: 30 + 200 + 16 = 246 bytes (fits LoRa 255 limit)
 */
#ifndef PACKET_H
#define PACKET_H

#include "config.h"
#include <string.h>

struct Packet {
    uint8_t  version;
    uint8_t  type;
    uint32_t sender_id;
    uint32_t dest_id;
    uint32_t msg_id;
    uint8_t  ttl;
    uint8_t  flags;
    uint8_t  nonce[NONCE_SIZE];
    uint16_t payload_len;
    uint8_t  payload[PACKET_MAX_PAYLOAD];
    uint8_t  tag[TAG_SIZE];
};

namespace pkt {

/* Encode Packet struct into wire-format byte buffer.
 * Returns total bytes written, or 0 on error. */
uint16_t encode(const Packet &p, uint8_t *buf, uint16_t buf_size);

/* Decode wire-format buffer into Packet struct.
 * Returns true on success. */
bool decode(const uint8_t *buf, uint16_t len, Packet &p);

/* Build the AAD (Additional Authenticated Data) from immutable header fields.
 * Writes AAD_SIZE bytes into aad[]. */
void build_aad(const Packet &p, uint8_t *aad);

/* Generate a random 32-bit message ID. */
uint32_t new_msg_id();

/* Pretty-print device ID as 8-char hex string. */
void id_to_hex(uint32_t id, char *buf);

} // namespace pkt

#endif
