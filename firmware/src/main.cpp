/*
 * PM-Chat Mesh Firmware — Main Entry Point
 * Target: RAK3172-E Evaluation Board (STM32WLE5CC)
 *
 * Main loop architecture:
 *   1. Poll buttons
 *   2. Handle button events in UI
 *   3. State machine tick (radio, mesh, messages)
 *   4. Update display
 *   5. Battery check (periodic)
 *   6. Feed watchdog
 */
#include <Arduino.h>
#include <IWatchdog.h>

#include "config.h"
#include "pins.h"
#include "storage.h"
#include "crypto_engine.h"
#include "device_identity.h"
#include "radio.h"
#include "mesh.h"
#include "message_store.h"
#include "button.h"
#include "battery.h"
#include "ui.h"
#include "state_machine.h"

/* ── Timing ── */
static uint32_t s_last_ui_draw  = 0;
static uint32_t s_last_batt     = 0;

/* ── Status LED ── */
static void led_init() {
    pinMode(PIN_LED, OUTPUT);
    digitalWrite(PIN_LED, LOW);
}

static void led_blink() {
    digitalWrite(PIN_LED, HIGH);
    delay(50);
    digitalWrite(PIN_LED, LOW);
}

/* ──────────────────────────────────── */
/*              SETUP                   */
/* ──────────────────────────────────── */
void setup() {
    /* Debug serial (optional) */
    Serial.setTx(PIN_UART_TX);
    Serial.setRx(PIN_UART_RX);
    Serial.begin(115200);
    Serial.println(F("\n[PM-Chat] Démarrage..."));

    /* Initialise subsystems */
    led_init();
    storage::init();
    crypto::init();
    button::init();
    battery::init();
    msg_store::init();
    mesh::init();
    ui::init();
    fsm::init();

    /* Initialise LoRa radio */
    if (!radio::init()) {
        Serial.println(F("[PM-Chat] Initialisation radio ÉCHOUÉE !"));
        fsm::on_error("Radio init failed");
    } else {
        Serial.println(F("[PM-Chat] Radio OK"));
    }

    /* LED blink to confirm boot */
    led_blink();

    /* Start watchdog (8 seconds) */
    IWatchdog.begin(WDG_TIMEOUT_US);

    Serial.println(F("[PM-Chat] Démarrage terminé"));
    s_last_ui_draw = millis();
    s_last_batt    = millis();
}

/* ──────────────────────────────────── */
/*             MAIN LOOP                */
/* ──────────────────────────────────── */
void loop() {
    uint32_t now = millis();

    /* ── 1. Poll buttons ── */
    BtnEvent evt = button::poll();

    /* ── 2. Handle panic wipe (all buttons held) ── */
    if (evt == BTN_PANIC) {
        Serial.println(F("[PM-Chat] EFFACEMENT D'URGENCE !"));
        fsm::panic_wipe();
        evt = BTN_NONE;
    }

    /* ── 3. Pass input to UI ── */
    if (evt != BTN_NONE) {
        ui::handle_input(evt);
    }

    /* ── 4. State machine tick (radio, mesh, messages) ── */
    fsm::tick();

    /* ── 5. Update display at target frame rate ── */
    if ((now - s_last_ui_draw) >= UI_FPS_MS) {
        s_last_ui_draw = now;
        ui::draw();
        ui::tick(); /* dim/off timers */
    }

    /* ── 6. Periodic battery check ── */
    if ((now - s_last_batt) >= BATT_INTERVAL_MS) {
        s_last_batt = now;
        battery::update();

        if (battery::is_critical()) {
            ui::toast("BATT CRITIQUE !", 3000);
            ui::wake();
        } else if (battery::is_low()) {
            ui::toast("Batterie faible", 2000);
        }
    }

    /* ── 7. Feed watchdog ── */
    IWatchdog.reload();

    /* ── 8. Brief idle to save power ── */
    delay(LOOP_DELAY_MS);
}
