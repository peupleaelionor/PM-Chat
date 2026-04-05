/*
 * PM-Chat Mesh Firmware — Mesh Routing Engine
 * Handles TTL, deduplication, relay, and multi-hop.
 */
#ifndef MESH_H
#define MESH_H

#include "config.h"
#include "packet.h"

namespace mesh {

/* Initialise mesh engine (clears dedup cache). */
void init();

/* Process an incoming raw radio buffer.
 * Deduplicates, routes, and relays as needed.
 * If the packet is for us, copies into out_pkt and returns true.
 * Relay happens automatically inside this function. */
bool process_incoming(const uint8_t *buf, uint16_t len, Packet &out_pkt);

/* Queue a packet for sending via mesh (sets TTL, flags, etc.). */
bool send_packet(Packet &p);

/* Called periodically to purge old dedup entries. */
void tick();

/* Get mesh statistics. */
uint32_t get_relayed_count();
uint32_t get_dropped_count();

} // namespace mesh

#endif
