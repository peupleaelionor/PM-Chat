/*
 * PM-Chat Mesh Firmware — Device Identity Management
 */
#include "device_identity.h"
#include "storage.h"
#include "crypto_engine.h"
#include <string.h>

static uint32_t s_device_id = 0;
static uint8_t  s_net_key[KEY_SIZE];
static char     s_mesh_pin[5] = {0};
static bool     s_key_loaded  = false;

bool identity::is_provisioned() {
    return storage::has_magic();
}

void identity::provision(const char *mesh_pin) {
    /* Generate random device ID */
    s_device_id = crypto::random_u32();
    /* Avoid reserved IDs */
    if (s_device_id == 0 || s_device_id == BROADCAST_ID) {
        s_device_id = 0x00010001;
    }

    /* Derive network key from mesh PIN */
    crypto::derive_key(mesh_pin, s_net_key);

    /* Store mesh PIN digits */
    strncpy(s_mesh_pin, mesh_pin, 4);
    s_mesh_pin[4] = '\0';

    s_key_loaded = true;

    /* Persist to EEPROM */
    storage::write_u32(ADDR_DEVICE_ID, s_device_id);
    storage::write_block(ADDR_NET_KEY, s_net_key, KEY_SIZE);
    storage::write_block(ADDR_MESH_PIN, (const uint8_t *)s_mesh_pin, 4);
    storage::write_u32(ADDR_MSG_COUNTER, 0);
    storage::write_u8(ADDR_PIN_ENABLED, 0);
    storage::write_u8(ADDR_BRIGHTNESS, 200);
    storage::write_magic();
    storage::commit();
}

uint32_t identity::get_device_id() {
    if (s_device_id == 0) {
        s_device_id = storage::read_u32(ADDR_DEVICE_ID);
    }
    return s_device_id;
}

void identity::get_net_key(uint8_t *key) {
    if (!s_key_loaded) {
        storage::read_block(ADDR_NET_KEY, s_net_key, KEY_SIZE);
        s_key_loaded = true;
    }
    memcpy(key, s_net_key, KEY_SIZE);
}

void identity::get_mesh_pin(char *pin) {
    if (s_mesh_pin[0] == 0) {
        storage::read_block(ADDR_MESH_PIN, (uint8_t *)s_mesh_pin, 4);
        s_mesh_pin[4] = '\0';
    }
    memcpy(pin, s_mesh_pin, 5);
}

void identity::wipe() {
    crypto::secure_zero(s_net_key, KEY_SIZE);
    crypto::secure_zero(s_mesh_pin, sizeof(s_mesh_pin));
    s_device_id  = 0;
    s_key_loaded = false;
    storage::erase_all();
    storage::commit();
}
