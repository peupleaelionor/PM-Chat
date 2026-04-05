/*
 * PM-Chat Mesh Firmware — Button Handler
 * Debounced, event-based input for 3 physical buttons.
 */
#ifndef BUTTON_H
#define BUTTON_H

#include "config.h"

namespace button {

/* Initialise button GPIOs with internal pull-ups. */
void init();

/* Poll buttons and update state. Call every loop iteration.
 * Returns the current button event (BTN_NONE if nothing). */
BtnEvent poll();

/* Check if a specific button is currently held down. */
bool is_held_up();
bool is_held_ok();
bool is_held_down();

/* Reset all button state (e.g., after screen transition). */
void reset();

} // namespace button

#endif
