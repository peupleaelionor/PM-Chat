/*
 * PM-Chat Mesh Firmware — Device Identity
 * Manages device ID generation and first-boot detection.
 */
#ifndef DEVICE_IDENTITY_H
#define DEVICE_IDENTITY_H

#include "config.h"

namespace identity {

/* Check if device has been provisioned (magic present). */
bool is_provisioned();

/* Generate and store a new device ID + network key from mesh PIN.
 * Called on first boot / after factory reset. */
void provision(const char *mesh_pin);

/* Load device ID from storage. Returns 0 if not provisioned. */
uint32_t get_device_id();

/* Copy the network encryption key into key[KEY_SIZE]. */
void get_net_key(uint8_t *key);

/* Get mesh PIN as null-terminated string (4 digits). */
void get_mesh_pin(char *pin);

/* Wipe all identity data (factory reset). */
void wipe();

} // namespace identity

#endif
