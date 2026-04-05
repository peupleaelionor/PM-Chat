/*
 * PM-Chat Mesh Firmware — AES-256-GCM Crypto Engine
 * Uses rweather/Crypto library + STM32 hardware RNG.
 */
#ifndef CRYPTO_ENGINE_H
#define CRYPTO_ENGINE_H

#include "config.h"

namespace crypto {

/* Initialise hardware RNG. Call once in setup(). */
void init();

/* Fill buffer with hardware random bytes. */
void random_bytes(uint8_t *buf, uint16_t len);

/* Generate a random uint32_t. */
uint32_t random_u32();

/* Derive a 256-bit network key from a mesh PIN string.
 * key[] must be KEY_SIZE bytes. */
void derive_key(const char *pin, uint8_t *key);

/* Encrypt plaintext in-place into ciphertext + tag.
 *   key     : 32-byte AES-256 key
 *   nonce   : 12-byte nonce (caller must fill with random)
 *   aad/len : additional authenticated data
 *   pt/len  : plaintext input
 *   ct      : ciphertext output (same length as pt)
 *   tag     : 16-byte auth tag output
 * Returns true on success. */
bool encrypt(const uint8_t *key,
             const uint8_t *nonce,
             const uint8_t *aad, uint16_t aad_len,
             const uint8_t *pt,  uint16_t pt_len,
             uint8_t *ct,
             uint8_t *tag);

/* Decrypt ciphertext and verify tag.
 * Returns true if authentication passes. */
bool decrypt(const uint8_t *key,
             const uint8_t *nonce,
             const uint8_t *aad, uint16_t aad_len,
             const uint8_t *ct,  uint16_t ct_len,
             uint8_t *pt,
             const uint8_t *tag);

/* Securely zero a buffer. */
void secure_zero(void *buf, uint16_t len);

} // namespace crypto

#endif
