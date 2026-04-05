/*
 * PM-Chat Mesh Firmware — EEPROM Persistent Storage
 */
#include "storage.h"
#include <EEPROM.h>
#include <string.h>

void storage::init() {
    /* STM32duino EEPROM emulation in Flash */
}

uint32_t storage::read_u32(uint16_t addr) {
    uint32_t val = 0;
    val |= (uint32_t)EEPROM.read(addr);
    val |= (uint32_t)EEPROM.read(addr + 1) << 8;
    val |= (uint32_t)EEPROM.read(addr + 2) << 16;
    val |= (uint32_t)EEPROM.read(addr + 3) << 24;
    return val;
}

void storage::write_u32(uint16_t addr, uint32_t val) {
    EEPROM.write(addr,     (uint8_t)(val & 0xFF));
    EEPROM.write(addr + 1, (uint8_t)((val >> 8) & 0xFF));
    EEPROM.write(addr + 2, (uint8_t)((val >> 16) & 0xFF));
    EEPROM.write(addr + 3, (uint8_t)((val >> 24) & 0xFF));
}

uint8_t storage::read_u8(uint16_t addr) {
    return EEPROM.read(addr);
}

void storage::write_u8(uint16_t addr, uint8_t val) {
    EEPROM.write(addr, val);
}

void storage::read_block(uint16_t addr, uint8_t *buf, uint16_t len) {
    for (uint16_t i = 0; i < len; i++) {
        buf[i] = EEPROM.read(addr + i);
    }
}

void storage::write_block(uint16_t addr, const uint8_t *buf, uint16_t len) {
    for (uint16_t i = 0; i < len; i++) {
        EEPROM.write(addr + i, buf[i]);
    }
}

void storage::commit() {
    /* STM32duino EEPROM commits on each write by default.
     * On platforms needing explicit commit, call EEPROM.commit(). */
}

void storage::erase_all() {
    for (uint16_t i = 0; i < EEPROM_TOTAL; i++) {
        EEPROM.write(i, 0xFF);
    }
}

bool storage::has_magic() {
    return read_u32(ADDR_MAGIC) == MAGIC_VALUE;
}

void storage::write_magic() {
    write_u32(ADDR_MAGIC, MAGIC_VALUE);
}
