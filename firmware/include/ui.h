/*
 * PM-Chat Mesh Firmware — UI Engine
 * SSD1306 128x64 OLED display with premium minimal interface.
 * All screens managed here: splash, setup, inbox, compose, settings, etc.
 */
#ifndef UI_H
#define UI_H

#include "config.h"
#include "message_store.h"

namespace ui {

/* Initialise display hardware. */
void init();

/* Set the current screen. */
void set_screen(Screen scr);

/* Get the current screen. */
Screen current_screen();

/* Handle a button event on the current screen. */
void handle_input(BtnEvent evt);

/* Redraw the current screen. Call at UI_FPS_MS interval. */
void draw();

/* Show a brief toast notification overlay (auto-dismiss). */
void toast(const char *text, uint16_t duration_ms);

/* Wake display (reset dim/off timer). */
void wake();

/* Tick display dim/off timers. */
void tick();

/* Set display brightness (0-255). */
void set_brightness(uint8_t b);

/* Get display brightness. */
uint8_t get_brightness();

/* Check if display is currently off. */
bool is_off();

/* ── Compose screen state ── */
/* Get the composed text (null-terminated). */
const char *compose_text();

/* Get destination peer ID for current composition. */
uint32_t compose_dest();

/* Reset compose state for a new message. */
void compose_begin(uint32_t dest_id);

/* ── Conversation view state ── */
/* Set peer for conversation view. */
void conversation_set_peer(uint32_t peer_id);

/* ── Error screen ── */
void show_error(const char *msg);

/* ── Setup screen state ── */
/* Get the entered mesh PIN (4 digits, null-terminated). */
const char *setup_pin();

} // namespace ui

#endif
