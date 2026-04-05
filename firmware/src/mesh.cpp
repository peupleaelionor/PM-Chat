/*
 * PM-Chat Mesh Firmware — Mesh Routing Engine
 */
#include "mesh.h"
#include "radio.h"
#include "device_identity.h"
#include "crypto_engine.h"
#include <string.h>

/* Deduplication cache entry */
struct DedupEntry {
    uint32_t msg_id;
    uint32_t sender_id;
    uint32_t timestamp;  /* millis() */
};

static DedupEntry s_dedup[MESH_DEDUP_SIZE];
static uint8_t    s_dedup_head = 0;
static uint32_t   s_relayed    = 0;
static uint32_t   s_dropped    = 0;

/* Check if we've seen this packet recently */
static bool is_duplicate(uint32_t sender_id, uint32_t msg_id) {
    uint32_t now = millis();
    for (uint8_t i = 0; i < MESH_DEDUP_SIZE; i++) {
        if (s_dedup[i].sender_id == sender_id &&
            s_dedup[i].msg_id == msg_id &&
            (now - s_dedup[i].timestamp) < MESH_DEDUP_TTL_MS) {
            return true;
        }
    }
    return false;
}

/* Add to dedup cache */
static void dedup_add(uint32_t sender_id, uint32_t msg_id) {
    s_dedup[s_dedup_head].sender_id = sender_id;
    s_dedup[s_dedup_head].msg_id    = msg_id;
    s_dedup[s_dedup_head].timestamp = millis();
    s_dedup_head = (s_dedup_head + 1) % MESH_DEDUP_SIZE;
}

/* Relay a packet: decrement TTL, set relay flag, retransmit */
static void relay_packet(Packet &p) {
    if (p.ttl == 0) return;

    p.ttl--;
    p.flags |= FLAG_RELAYED;

    uint8_t buf[PACKET_MAX_SIZE];
    uint16_t len = pkt::encode(p, buf, sizeof(buf));
    if (len == 0) return;

    /* Small random delay to avoid collisions between relaying nodes */
    delay(crypto::random_u32() % MESH_RELAY_DELAY);

    radio::send(buf, len);
    s_relayed++;
}

void mesh::init() {
    memset(s_dedup, 0, sizeof(s_dedup));
    s_dedup_head = 0;
    s_relayed    = 0;
    s_dropped    = 0;
}

bool mesh::process_incoming(const uint8_t *buf, uint16_t len, Packet &out_pkt) {
    Packet p;
    if (!pkt::decode(buf, len, p)) {
        s_dropped++;
        return false;
    }

    /* Reject packets from ourselves */
    uint32_t my_id = identity::get_device_id();
    if (p.sender_id == my_id) {
        return false;
    }

    /* Deduplicate */
    if (is_duplicate(p.sender_id, p.msg_id)) {
        s_dropped++;
        return false;
    }
    dedup_add(p.sender_id, p.msg_id);

    /* Validate TTL */
    if (p.ttl > MESH_MAX_TTL) {
        s_dropped++;
        return false;
    }

    bool for_us = (p.dest_id == my_id || p.dest_id == BROADCAST_ID);

    /* Relay if not exclusively for us and TTL allows */
    if (p.ttl > 0 && p.dest_id != my_id) {
        relay_packet(p);
    }

    if (for_us) {
        memcpy(&out_pkt, &p, sizeof(Packet));
        return true;
    }

    return false;
}

bool mesh::send_packet(Packet &p) {
    uint32_t my_id = identity::get_device_id();

    p.version   = PROTOCOL_VERSION;
    p.sender_id = my_id;
    p.ttl       = MESH_DEFAULT_TTL;

    /* Add to our own dedup cache so we don't process our own relays */
    dedup_add(p.sender_id, p.msg_id);

    uint8_t buf[PACKET_MAX_SIZE];
    uint16_t len = pkt::encode(p, buf, sizeof(buf));
    if (len == 0) return false;

    return radio::send(buf, len);
}

void mesh::tick() {
    /* Purge old dedup entries to free slots */
    uint32_t now = millis();
    for (uint8_t i = 0; i < MESH_DEDUP_SIZE; i++) {
        if (s_dedup[i].timestamp != 0 &&
            (now - s_dedup[i].timestamp) > MESH_DEDUP_TTL_MS) {
            s_dedup[i].timestamp = 0;
            s_dedup[i].sender_id = 0;
            s_dedup[i].msg_id    = 0;
        }
    }
}

uint32_t mesh::get_relayed_count()  { return s_relayed; }
uint32_t mesh::get_dropped_count()  { return s_dropped; }
