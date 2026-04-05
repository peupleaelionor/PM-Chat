/*
 * PM-Chat Mesh Firmware — System State Machine
 */
#include "state_machine.h"
#include "ui.h"
#include "radio.h"
#include "mesh.h"
#include "message_store.h"
#include "device_identity.h"
#include "crypto_engine.h"
#include "packet.h"
#include "battery.h"
#include "storage.h"
#include <string.h>
#include <Arduino.h>

static SystemState s_state     = STATE_BOOT;
static uint32_t    s_state_ts  = 0;
static char        s_err[48]   = {0};
static uint8_t     s_net_key[KEY_SIZE];

static void enter_state(SystemState ns) {
    s_state    = ns;
    s_state_ts = millis();
}

void fsm::init() {
    enter_state(STATE_BOOT);
}

SystemState fsm::state() {
    return s_state;
}

void fsm::transition(SystemState new_state) {
    enter_state(new_state);
}

/* ── Build, encrypt, and send a text message ── */
static bool send_text_message(uint32_t dest_id, const char *text, uint8_t text_len,
                              uint8_t flags) {
    Packet p;
    memset(&p, 0, sizeof(p));

    p.version = PROTOCOL_VERSION;
    p.type    = PKT_TEXT;
    p.dest_id = dest_id;
    p.msg_id  = pkt::new_msg_id();
    p.flags   = flags | FLAG_ENCRYPTED;

    /* Generate nonce */
    crypto::random_bytes(p.nonce, NONCE_SIZE);

    /* Build AAD from packet header */
    uint8_t aad[AAD_SIZE];
    p.sender_id = identity::get_device_id();
    pkt::build_aad(p, aad);

    /* Encrypt text */
    if (!crypto::encrypt(s_net_key, p.nonce, aad, AAD_SIZE,
                         (const uint8_t *)text, text_len,
                         p.payload, p.tag)) {
        return false;
    }
    p.payload_len = text_len;

    return mesh::send_packet(p);
}

/* ── Handle a decrypted incoming text packet ── */
static void handle_text_packet(const Packet &p) {
    uint8_t aad[AAD_SIZE];
    pkt::build_aad(p, aad);

    /* Decrypt payload */
    char plaintext[MAX_TEXT_LEN + 1];
    if (p.payload_len > MAX_TEXT_LEN) return;

    if (!(p.flags & FLAG_ENCRYPTED)) {
        /* Unencrypted packet (e.g., ping) */
        memcpy(plaintext, p.payload, p.payload_len);
    } else {
        if (!crypto::decrypt(s_net_key, p.nonce, aad, AAD_SIZE,
                             p.payload, p.payload_len,
                             (uint8_t *)plaintext, p.tag)) {
            return; /* Authentication failed — drop silently */
        }
    }
    plaintext[p.payload_len] = '\0';

    /* Store message */
    msg_store::add_incoming(p.sender_id, p.msg_id, p.flags,
                            plaintext, (uint8_t)p.payload_len);

    /* Notify UI */
    ui::wake();
    ui::toast("New message!", 2000);

    /* Send ACK if requested */
    if (p.flags & FLAG_ACK_REQ) {
        Packet ack;
        memset(&ack, 0, sizeof(ack));
        ack.type    = PKT_ACK;
        ack.dest_id = p.sender_id;
        ack.msg_id  = p.msg_id;
        ack.flags   = 0;
        ack.payload_len = 0;
        mesh::send_packet(ack);
    }
}

/* ── Process radio receive buffer ── */
static void process_radio() {
    uint8_t buf[PACKET_MAX_SIZE];
    uint16_t len = 0;

    if (!radio::receive(buf, len)) return;

    Packet p;
    if (!mesh::process_incoming(buf, len, p)) return;

    switch (p.type) {
        case PKT_TEXT:
            handle_text_packet(p);
            break;
        case PKT_ACK: {
            /* Find matching outgoing message and mark delivered */
            for (int i = 0; i < msg_store::count(); i++) {
                const Message *m = msg_store::get(i);
                if (m && !m->incoming && m->msg_id == p.msg_id) {
                    msg_store::set_state(i, MSTATE_DELIVERED);
                    break;
                }
            }
            break;
        }
        case PKT_PING:
            ui::toast("Ping received", 1500);
            break;
        default:
            break;
    }
}

/* ── Process outgoing message queue ── */
static void process_outgoing() {
    int idx = msg_store::next_pending();
    if (idx < 0) return;

    const Message *m = msg_store::get(idx);
    if (!m) return;

    bool ok = send_text_message(m->dest_id, m->text, m->text_len, m->flags);
    if (ok) {
        msg_store::set_state(idx, MSTATE_SENT);
    } else {
        /* Increment retry with exponential backoff */
        msg_store::set_state(idx, MSTATE_QUEUED);
    }
}

void fsm::tick() {
    uint32_t now = millis();

    switch (s_state) {
        case STATE_BOOT:
            ui::set_screen(SCR_SPLASH);
            /* Show splash for 1.5 seconds */
            if ((now - s_state_ts) > 1500) {
                if (identity::is_provisioned()) {
                    /* Load network key */
                    identity::get_net_key(s_net_key);
                    enter_state(STATE_IDLE);
                    ui::set_screen(SCR_INBOX);
                } else {
                    enter_state(STATE_SETUP);
                    ui::set_screen(SCR_SETUP_WELCOME);
                }
            }
            break;

        case STATE_SETUP:
            /* UI handles setup flow. When PIN is entered and device
             * provisioned, ui transitions to SCR_DEVICE_INFO, then SCR_INBOX.
             * We detect that provisioning happened. */
            if (identity::is_provisioned() &&
                ui::current_screen() == SCR_INBOX) {
                identity::get_net_key(s_net_key);
                enter_state(STATE_IDLE);
            }
            break;

        case STATE_PIN_ENTRY:
            /* Handled by UI */
            break;

        case STATE_IDLE:
            /* Core operational loop */
            process_radio();
            process_outgoing();
            msg_store::tick();
            mesh::tick();

            /* Check if UI triggered a send */
            if (ui::current_screen() == SCR_SENDING) {
                const char *text = ui::compose_text();
                uint8_t len = (uint8_t)strlen(text);
                if (len > 0) {
                    int idx = msg_store::queue_outgoing(
                        ui::compose_dest(), text, len, FLAG_ACK_REQ);
                    if (idx >= 0) {
                        msg_store::set_state(idx, MSTATE_SENDING);
                        bool ok = send_text_message(ui::compose_dest(), text, len,
                                                    FLAG_ACK_REQ);
                        if (ok) {
                            msg_store::set_state(idx, MSTATE_SENT);
                            ui::toast("Sent!", 1500);
                        } else {
                            msg_store::set_state(idx, MSTATE_QUEUED);
                            ui::toast("Queued (retry)", 1500);
                        }
                    }
                }
                ui::set_screen(SCR_INBOX);
            }

            /* Check for wipe confirmation */
            if (ui::current_screen() == SCR_WIPE_CONFIRM) {
                /* The wipe_sel is checked via a global state */
            }
            break;

        case STATE_SENDING:
            /* Transient state during active send */
            process_radio();
            if ((now - s_state_ts) > 5000) {
                enter_state(STATE_IDLE);
            }
            break;

        case STATE_RECEIVING:
            process_radio();
            enter_state(STATE_IDLE);
            break;

        case STATE_TEST:
            /* Test mode — radio, buttons, display all active */
            process_radio();
            break;

        case STATE_ERROR:
            /* Display error, wait for user dismiss */
            if (ui::current_screen() != SCR_ERROR) {
                enter_state(STATE_IDLE);
            }
            break;
    }
}

void fsm::on_message_received() {
    if (s_state == STATE_IDLE) {
        /* Already processing in tick() */
    }
}

void fsm::on_send_complete(bool success) {
    if (!success) {
        ui::toast("Send failed", 2000);
    }
    enter_state(STATE_IDLE);
}

void fsm::on_error(const char *msg) {
    strncpy(s_err, msg, sizeof(s_err) - 1);
    s_err[sizeof(s_err) - 1] = '\0';
    ui::show_error(s_err);
    enter_state(STATE_ERROR);
}

void fsm::on_setup_complete() {
    identity::get_net_key(s_net_key);
    enter_state(STATE_IDLE);
    ui::set_screen(SCR_INBOX);
}

void fsm::on_pin_accepted() {
    identity::get_net_key(s_net_key);
    enter_state(STATE_IDLE);
    ui::set_screen(SCR_INBOX);
}

void fsm::panic_wipe() {
    /* Emergency wipe — erase everything immediately */
    msg_store::clear();
    crypto::secure_zero(s_net_key, KEY_SIZE);
    identity::wipe();
    ui::toast("WIPED!", 3000);
    /* Reset to setup state */
    enter_state(STATE_SETUP);
    ui::set_screen(SCR_SETUP_WELCOME);
}
