/*
 * PM-Chat Mesh Firmware — Unit Tests (PlatformIO Unity)
 *
 * Run with: pio test -e test
 *
 * Tests packet encode/decode, crypto roundtrip, and mesh dedup.
 * These tests run on the target hardware.
 */
#include <unity.h>
#include <string.h>
#include "config.h"
#include "packet.h"
#include "crypto_engine.h"

/* ──────── Packet Tests ──────── */

void test_packet_encode_decode() {
    Packet p;
    memset(&p, 0, sizeof(p));
    p.version     = PROTOCOL_VERSION;
    p.type        = PKT_TEXT;
    p.sender_id   = 0x12345678;
    p.dest_id     = 0xAABBCCDD;
    p.msg_id      = 0x00001234;
    p.ttl         = 3;
    p.flags       = FLAG_ENCRYPTED | FLAG_ACK_REQ;
    p.payload_len = 5;
    memcpy(p.payload, "HELLO", 5);
    memset(p.nonce, 0xAB, NONCE_SIZE);
    memset(p.tag, 0xCD, TAG_SIZE);

    uint8_t buf[PACKET_MAX_SIZE];
    uint16_t len = pkt::encode(p, buf, sizeof(buf));

    TEST_ASSERT_GREATER_THAN(0, len);
    TEST_ASSERT_EQUAL(PACKET_HEADER_SIZE + 5 + PACKET_TAG_SIZE, len);

    Packet decoded;
    bool ok = pkt::decode(buf, len, decoded);

    TEST_ASSERT_TRUE(ok);
    TEST_ASSERT_EQUAL(p.version, decoded.version);
    TEST_ASSERT_EQUAL(p.type, decoded.type);
    TEST_ASSERT_EQUAL_UINT32(p.sender_id, decoded.sender_id);
    TEST_ASSERT_EQUAL_UINT32(p.dest_id, decoded.dest_id);
    TEST_ASSERT_EQUAL_UINT32(p.msg_id, decoded.msg_id);
    TEST_ASSERT_EQUAL(p.ttl, decoded.ttl);
    TEST_ASSERT_EQUAL(p.flags, decoded.flags);
    TEST_ASSERT_EQUAL(p.payload_len, decoded.payload_len);
    TEST_ASSERT_EQUAL_MEMORY(p.payload, decoded.payload, 5);
    TEST_ASSERT_EQUAL_MEMORY(p.nonce, decoded.nonce, NONCE_SIZE);
    TEST_ASSERT_EQUAL_MEMORY(p.tag, decoded.tag, TAG_SIZE);
}

void test_packet_reject_bad_version() {
    uint8_t buf[PACKET_HEADER_SIZE + PACKET_TAG_SIZE];
    memset(buf, 0, sizeof(buf));
    buf[0] = 0xFF; /* Bad version */
    buf[28] = 0;   /* payload_len = 0 */
    buf[29] = 0;

    Packet p;
    TEST_ASSERT_FALSE(pkt::decode(buf, sizeof(buf), p));
}

void test_packet_reject_truncated() {
    uint8_t buf[10]; /* Too short */
    memset(buf, 0, sizeof(buf));
    buf[0] = PROTOCOL_VERSION;

    Packet p;
    TEST_ASSERT_FALSE(pkt::decode(buf, sizeof(buf), p));
}

void test_packet_reject_oversized_payload() {
    uint8_t buf[PACKET_MAX_SIZE];
    memset(buf, 0, sizeof(buf));
    buf[0] = PROTOCOL_VERSION;
    /* Set payload_len > MAX */
    buf[28] = 0xFF;
    buf[29] = 0xFF;

    Packet p;
    TEST_ASSERT_FALSE(pkt::decode(buf, sizeof(buf), p));
}

void test_packet_id_to_hex() {
    char hex[9];
    pkt::id_to_hex(0x12345678, hex);
    TEST_ASSERT_EQUAL_STRING("12345678", hex);

    pkt::id_to_hex(0x00000000, hex);
    TEST_ASSERT_EQUAL_STRING("00000000", hex);

    pkt::id_to_hex(0xFFFFFFFF, hex);
    TEST_ASSERT_EQUAL_STRING("FFFFFFFF", hex);
}

void test_packet_aad_build() {
    Packet p;
    memset(&p, 0, sizeof(p));
    p.version   = PROTOCOL_VERSION;
    p.type      = PKT_TEXT;
    p.sender_id = 0x11223344;
    p.dest_id   = 0x55667788;
    p.msg_id    = 0xAABBCCDD;

    uint8_t aad[AAD_SIZE];
    pkt::build_aad(p, aad);

    TEST_ASSERT_EQUAL(PROTOCOL_VERSION, aad[0]);
    TEST_ASSERT_EQUAL(PKT_TEXT, aad[1]);
    /* Verify sender_id at offset 2 (little-endian) */
    TEST_ASSERT_EQUAL(0x44, aad[2]);
    TEST_ASSERT_EQUAL(0x33, aad[3]);
    TEST_ASSERT_EQUAL(0x22, aad[4]);
    TEST_ASSERT_EQUAL(0x11, aad[5]);
}

/* ──────── Crypto Tests ──────── */

void test_crypto_derive_key_deterministic() {
    uint8_t key1[KEY_SIZE], key2[KEY_SIZE];
    crypto::derive_key("1234", key1);
    crypto::derive_key("1234", key2);
    TEST_ASSERT_EQUAL_MEMORY(key1, key2, KEY_SIZE);
}

void test_crypto_derive_key_different_pins() {
    uint8_t key1[KEY_SIZE], key2[KEY_SIZE];
    crypto::derive_key("1234", key1);
    crypto::derive_key("5678", key2);
    /* Keys should differ */
    bool same = (memcmp(key1, key2, KEY_SIZE) == 0);
    TEST_ASSERT_FALSE(same);
}

void test_crypto_encrypt_decrypt_roundtrip() {
    uint8_t key[KEY_SIZE];
    crypto::derive_key("TEST", key);

    uint8_t nonce[NONCE_SIZE] = {1,2,3,4,5,6,7,8,9,10,11,12};
    uint8_t aad[4] = {0xAA, 0xBB, 0xCC, 0xDD};

    const char *plaintext = "Hello PM-Chat!";
    uint16_t pt_len = strlen(plaintext);

    uint8_t ct[PACKET_MAX_PAYLOAD];
    uint8_t tag[TAG_SIZE];
    bool enc_ok = crypto::encrypt(key, nonce, aad, 4,
                                  (const uint8_t *)plaintext, pt_len,
                                  ct, tag);
    TEST_ASSERT_TRUE(enc_ok);

    /* Ciphertext should differ from plaintext */
    bool same = (memcmp(ct, plaintext, pt_len) == 0);
    TEST_ASSERT_FALSE(same);

    /* Decrypt */
    uint8_t decrypted[PACKET_MAX_PAYLOAD];
    bool dec_ok = crypto::decrypt(key, nonce, aad, 4,
                                  ct, pt_len,
                                  decrypted, tag);
    TEST_ASSERT_TRUE(dec_ok);
    TEST_ASSERT_EQUAL_MEMORY(plaintext, decrypted, pt_len);
}

void test_crypto_decrypt_rejects_tampered() {
    uint8_t key[KEY_SIZE];
    crypto::derive_key("TEST", key);

    uint8_t nonce[NONCE_SIZE] = {1,2,3,4,5,6,7,8,9,10,11,12};
    uint8_t aad[4] = {0xAA, 0xBB, 0xCC, 0xDD};

    const char *plaintext = "Secret data";
    uint16_t pt_len = strlen(plaintext);

    uint8_t ct[PACKET_MAX_PAYLOAD];
    uint8_t tag[TAG_SIZE];
    crypto::encrypt(key, nonce, aad, 4,
                    (const uint8_t *)plaintext, pt_len, ct, tag);

    /* Tamper with ciphertext */
    ct[0] ^= 0xFF;

    uint8_t decrypted[PACKET_MAX_PAYLOAD];
    bool dec_ok = crypto::decrypt(key, nonce, aad, 4,
                                  ct, pt_len, decrypted, tag);
    TEST_ASSERT_FALSE(dec_ok);
}

void test_crypto_decrypt_rejects_wrong_key() {
    uint8_t key1[KEY_SIZE], key2[KEY_SIZE];
    crypto::derive_key("KEY1", key1);
    crypto::derive_key("KEY2", key2);

    uint8_t nonce[NONCE_SIZE] = {1,2,3,4,5,6,7,8,9,10,11,12};
    uint8_t aad[4] = {0xAA, 0xBB, 0xCC, 0xDD};

    const char *plaintext = "Secret";
    uint16_t pt_len = strlen(plaintext);

    uint8_t ct[PACKET_MAX_PAYLOAD];
    uint8_t tag[TAG_SIZE];
    crypto::encrypt(key1, nonce, aad, 4,
                    (const uint8_t *)plaintext, pt_len, ct, tag);

    uint8_t decrypted[PACKET_MAX_PAYLOAD];
    bool dec_ok = crypto::decrypt(key2, nonce, aad, 4,
                                  ct, pt_len, decrypted, tag);
    TEST_ASSERT_FALSE(dec_ok);
}

void test_crypto_secure_zero() {
    uint8_t buf[32];
    memset(buf, 0xAA, 32);
    crypto::secure_zero(buf, 32);
    for (int i = 0; i < 32; i++) {
        TEST_ASSERT_EQUAL(0, buf[i]);
    }
}

/* ──────── Test Runner ──────── */

void setup() {
    delay(2000); /* Wait for serial monitor */

    UNITY_BEGIN();

    /* Packet tests */
    RUN_TEST(test_packet_encode_decode);
    RUN_TEST(test_packet_reject_bad_version);
    RUN_TEST(test_packet_reject_truncated);
    RUN_TEST(test_packet_reject_oversized_payload);
    RUN_TEST(test_packet_id_to_hex);
    RUN_TEST(test_packet_aad_build);

    /* Crypto tests */
    RUN_TEST(test_crypto_derive_key_deterministic);
    RUN_TEST(test_crypto_derive_key_different_pins);
    RUN_TEST(test_crypto_encrypt_decrypt_roundtrip);
    RUN_TEST(test_crypto_decrypt_rejects_tampered);
    RUN_TEST(test_crypto_decrypt_rejects_wrong_key);
    RUN_TEST(test_crypto_secure_zero);

    UNITY_END();
}

void loop() {
    /* Nothing — tests run once in setup */
}
