/*
 * PM-Chat Mesh Firmware — AES-256-GCM Crypto Engine
 * Hardware RNG + software AES-GCM via rweather/Crypto.
 */
#include "crypto_engine.h"
#include <AES.h>
#include <GCM.h>
#include <SHA256.h>
#include <string.h>

/* STM32 HAL for hardware RNG */
#ifdef HAL_RNG_MODULE_ENABLED
static RNG_HandleTypeDef s_hrng;
static bool s_rng_ready = false;
#endif

static const char KEY_SALT[] = "PM-CHAT-MESH-KEY-V1";

void crypto::init() {
#ifdef HAL_RNG_MODULE_ENABLED
    __HAL_RCC_RNG_CLK_ENABLE();
    s_hrng.Instance = RNG;
    s_rng_ready = (HAL_RNG_Init(&s_hrng) == HAL_OK);
#endif
}

void crypto::random_bytes(uint8_t *buf, uint16_t len) {
#ifdef HAL_RNG_MODULE_ENABLED
    if (s_rng_ready) {
        uint16_t i = 0;
        while (i < len) {
            uint32_t val;
            if (HAL_RNG_GenerateRandomNumber(&s_hrng, &val) == HAL_OK) {
                uint16_t chunk = (len - i >= 4) ? 4 : (len - i);
                memcpy(&buf[i], &val, chunk);
                i += chunk;
            }
        }
        return;
    }
#endif
    /* Fallback: NOT cryptographically secure. Hardware RNG should always
     * be available on STM32WLE5. If we reach this path, the device is
     * in a degraded state and should not be used for key generation. */
    for (uint16_t i = 0; i < len; i++) {
        buf[i] = (uint8_t)(micros() ^ (analogRead(PB3) & 0xFF) ^ (i * 37));
        delayMicroseconds(1);
    }
    Serial.println(F("[CRYPTO] WARNING: Using fallback RNG — not secure!"));
}

uint32_t crypto::random_u32() {
    uint32_t val;
    random_bytes((uint8_t *)&val, 4);
    return val;
}

void crypto::derive_key(const char *pin, uint8_t *key) {
    SHA256 sha;
    sha.reset();
    sha.update(pin, strlen(pin));
    sha.update(KEY_SALT, strlen(KEY_SALT));
    sha.finalize(key, KEY_SIZE);
}

bool crypto::encrypt(const uint8_t *key,
                     const uint8_t *nonce,
                     const uint8_t *aad, uint16_t aad_len,
                     const uint8_t *pt,  uint16_t pt_len,
                     uint8_t *ct,
                     uint8_t *tag) {
    if (pt_len > PACKET_MAX_PAYLOAD) return false;

    GCM<AES256> gcm;
    gcm.clear();
    if (!gcm.setKey(key, KEY_SIZE))        return false;
    if (!gcm.setIV(nonce, NONCE_SIZE))     return false;
    gcm.addAuthData(aad, aad_len);
    gcm.encrypt(ct, pt, pt_len);
    gcm.computeTag(tag, TAG_SIZE);
    gcm.clear();
    return true;
}

bool crypto::decrypt(const uint8_t *key,
                     const uint8_t *nonce,
                     const uint8_t *aad, uint16_t aad_len,
                     const uint8_t *ct,  uint16_t ct_len,
                     uint8_t *pt,
                     const uint8_t *tag) {
    if (ct_len > PACKET_MAX_PAYLOAD) return false;

    GCM<AES256> gcm;
    gcm.clear();
    if (!gcm.setKey(key, KEY_SIZE))        return false;
    if (!gcm.setIV(nonce, NONCE_SIZE))     return false;
    gcm.addAuthData(aad, aad_len);
    gcm.decrypt(pt, ct, ct_len);
    bool ok = gcm.checkTag(tag, TAG_SIZE);
    gcm.clear();
    return ok;
}

void crypto::secure_zero(void *buf, uint16_t len) {
    volatile uint8_t *p = (volatile uint8_t *)buf;
    while (len--) {
        *p++ = 0;
    }
}
