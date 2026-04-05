/*
 * PM-Chat Mesh Firmware — Persistent Storage
 * EEPROM-based storage for device identity, keys, and settings.
 */
#ifndef STORAGE_H
#define STORAGE_H

#include "config.h"

namespace storage {

/* Initialise EEPROM. */
void init();

/* Read a uint32_t from EEPROM address. */
uint32_t read_u32(uint16_t addr);

/* Write a uint32_t to EEPROM address. */
void write_u32(uint16_t addr, uint32_t val);

/* Read a uint8_t from EEPROM address. */
uint8_t read_u8(uint16_t addr);

/* Write a uint8_t to EEPROM address. */
void write_u8(uint16_t addr, uint8_t val);

/* Read a block of bytes. */
void read_block(uint16_t addr, uint8_t *buf, uint16_t len);

/* Write a block of bytes. */
void write_block(uint16_t addr, const uint8_t *buf, uint16_t len);

/* Commit changes to flash (required on some platforms). */
void commit();

/* Erase all EEPROM data (factory reset). */
void erase_all();

/* Check if magic number is present. */
bool has_magic();

/* Write magic number. */
void write_magic();

} // namespace storage

#endif
