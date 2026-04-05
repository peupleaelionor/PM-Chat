/*
 * PM-Chat Mesh Firmware — 3-Button Handler with Debounce
 */
#include "button.h"
#include "pins.h"
#include <Arduino.h>

struct BtnState {
    uint8_t  pin;
    bool     pressed;
    bool     was_pressed;
    uint32_t change_time;
    uint32_t press_start;
    bool     long_fired;
};

static BtnState s_btns[3];
static uint32_t s_panic_start = 0;

void button::init() {
    s_btns[0] = {PIN_BTN_UP,   false, false, 0, 0, false};
    s_btns[1] = {PIN_BTN_OK,   false, false, 0, 0, false};
    s_btns[2] = {PIN_BTN_DOWN, false, false, 0, 0, false};

    for (int i = 0; i < 3; i++) {
        pinMode(s_btns[i].pin, INPUT_PULLUP);
    }
    s_panic_start = 0;
}

BtnEvent button::poll() {
    uint32_t now = millis();
    BtnEvent evt = BTN_NONE;

    /* Read all buttons with debounce */
    for (int i = 0; i < 3; i++) {
        bool raw = (digitalRead(s_btns[i].pin) == LOW); /* active low */

        if (raw != s_btns[i].pressed) {
            if ((now - s_btns[i].change_time) >= DEBOUNCE_MS) {
                s_btns[i].was_pressed = s_btns[i].pressed;
                s_btns[i].pressed = raw;
                s_btns[i].change_time = now;

                if (raw) {
                    /* Button pressed */
                    s_btns[i].press_start = now;
                    s_btns[i].long_fired = false;
                } else if (s_btns[i].was_pressed && !s_btns[i].long_fired) {
                    /* Button released — short press */
                    switch (i) {
                        case 0: evt = BTN_UP_SHORT;   break;
                        case 1: evt = BTN_OK_SHORT;   break;
                        case 2: evt = BTN_DOWN_SHORT; break;
                    }
                }
            }
        }

        /* Long press detection (while held) */
        if (s_btns[i].pressed && !s_btns[i].long_fired) {
            if ((now - s_btns[i].press_start) >= LONG_PRESS_MS) {
                s_btns[i].long_fired = true;
                switch (i) {
                    case 0: evt = BTN_UP_LONG;   break;
                    case 1: evt = BTN_OK_LONG;   break;
                    case 2: evt = BTN_DOWN_LONG; break;
                }
            }
        }
    }

    /* Panic detection: all 3 buttons held simultaneously */
    if (s_btns[0].pressed && s_btns[1].pressed && s_btns[2].pressed) {
        if (s_panic_start == 0) {
            s_panic_start = now;
        } else if ((now - s_panic_start) >= PANIC_HOLD_MS) {
            s_panic_start = 0;
            return BTN_PANIC;
        }
    } else {
        s_panic_start = 0;
    }

    return evt;
}

bool button::is_held_up()   { return s_btns[0].pressed; }
bool button::is_held_ok()   { return s_btns[1].pressed; }
bool button::is_held_down() { return s_btns[2].pressed; }

void button::reset() {
    for (int i = 0; i < 3; i++) {
        s_btns[i].pressed     = false;
        s_btns[i].was_pressed = false;
        s_btns[i].long_fired  = false;
    }
    s_panic_start = 0;
}
