/*
 * PM-Chat Mesh Firmware — Packet Encode / Decode
 */
#include "packet.h"
#include "crypto_engine.h"

static void put_u16(uint8_t *buf, uint16_t v) {
    buf[0] = (uint8_t)(v & 0xFF);
    buf[1] = (uint8_t)(v >> 8);
}

static void put_u32(uint8_t *buf, uint32_t v) {
    buf[0] = (uint8_t)(v & 0xFF);
    buf[1] = (uint8_t)((v >> 8) & 0xFF);
    buf[2] = (uint8_t)((v >> 16) & 0xFF);
    buf[3] = (uint8_t)((v >> 24) & 0xFF);
}

static uint16_t get_u16(const uint8_t *buf) {
    return (uint16_t)buf[0] | ((uint16_t)buf[1] << 8);
}

static uint32_t get_u32(const uint8_t *buf) {
    return (uint32_t)buf[0]
         | ((uint32_t)buf[1] << 8)
         | ((uint32_t)buf[2] << 16)
         | ((uint32_t)buf[3] << 24);
}

uint16_t pkt::encode(const Packet &p, uint8_t *buf, uint16_t buf_size) {
    uint16_t total = PACKET_HEADER_SIZE + p.payload_len + PACKET_TAG_SIZE;
    if (total > buf_size || p.payload_len > PACKET_MAX_PAYLOAD) {
        return 0;
    }

    buf[0] = p.version;
    buf[1] = p.type;
    put_u32(&buf[2],  p.sender_id);
    put_u32(&buf[6],  p.dest_id);
    put_u32(&buf[10], p.msg_id);
    buf[14] = p.ttl;
    buf[15] = p.flags;
    memcpy(&buf[16], p.nonce, NONCE_SIZE);
    put_u16(&buf[28], p.payload_len);
    memcpy(&buf[PACKET_HEADER_SIZE], p.payload, p.payload_len);
    memcpy(&buf[PACKET_HEADER_SIZE + p.payload_len], p.tag, TAG_SIZE);

    return total;
}

bool pkt::decode(const uint8_t *buf, uint16_t len, Packet &p) {
    if (len < PACKET_HEADER_SIZE + PACKET_TAG_SIZE) {
        return false;
    }

    p.version = buf[0];
    if (p.version != PROTOCOL_VERSION) {
        return false;
    }

    p.type      = buf[1];
    p.sender_id = get_u32(&buf[2]);
    p.dest_id   = get_u32(&buf[6]);
    p.msg_id    = get_u32(&buf[10]);
    p.ttl       = buf[14];
    p.flags     = buf[15];
    memcpy(p.nonce, &buf[16], NONCE_SIZE);
    p.payload_len = get_u16(&buf[28]);

    if (p.payload_len > PACKET_MAX_PAYLOAD) {
        return false;
    }
    if (len < (uint16_t)(PACKET_HEADER_SIZE + p.payload_len + PACKET_TAG_SIZE)) {
        return false;
    }

    memcpy(p.payload, &buf[PACKET_HEADER_SIZE], p.payload_len);
    memcpy(p.tag, &buf[PACKET_HEADER_SIZE + p.payload_len], TAG_SIZE);

    return true;
}

void pkt::build_aad(const Packet &p, uint8_t *aad) {
    /* AAD = version (1) + type (1) + sender_id (4) + dest_id (4) + msg_id (4) = 14 bytes
     * These fields are immutable during mesh relay. */
    aad[0] = p.version;
    aad[1] = p.type;
    put_u32(&aad[2],  p.sender_id);
    put_u32(&aad[6],  p.dest_id);
    put_u32(&aad[10], p.msg_id);
}

uint32_t pkt::new_msg_id() {
    return crypto::random_u32();
}

void pkt::id_to_hex(uint32_t id, char *buf) {
    static const char hex[] = "0123456789ABCDEF";
    for (int i = 7; i >= 0; i--) {
        buf[i] = hex[id & 0x0F];
        id >>= 4;
    }
    buf[8] = '\0';
}
