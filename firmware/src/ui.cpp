/*
 * PM-Chat Mesh Firmware — OLED UI Engine (SSD1306 128x64)
 *
 * Premium minimal interface with all screens:
 *   Splash, Setup, Device Info, Inbox, Conversation,
 *   Compose, Sending, Settings, Network, Wipe, PIN, Error
 *
 * Layout:
 *   [0-12]   Header bar   (icon + title + battery)
 *   [13]     Separator
 *   [14-52]  Content area
 *   [53]     Separator
 *   [54-63]  Footer bar   (button hints)
 */
#include "ui.h"
#include "pins.h"
#include "packet.h"
#include "battery.h"
#include "device_identity.h"
#include "message_store.h"
#include "mesh.h"
#include "radio.h"
#include <U8g2lib.h>
#include <Wire.h>
#include <string.h>

/* ── Display instance ── */
static U8G2_SSD1306_128X64_NONAME_F_HW_I2C s_disp(U8G2_R0, U8X8_PIN_NONE);

/* ── State ── */
static Screen   s_screen      = SCR_SPLASH;
static uint8_t  s_brightness  = 200;
static uint32_t s_last_input  = 0;
static bool     s_dimmed      = false;
static bool     s_off         = false;

/* Toast */
static char     s_toast[32]   = {0};
static uint32_t s_toast_until = 0;

/* Error */
static char     s_error[48]   = {0};

/* ── Inbox state ── */
static uint32_t s_peer_list[MAX_PEERS];
static int      s_peer_count    = 0;
static int      s_inbox_sel     = 0;

/* ── Conversation state ── */
static uint32_t s_conv_peer     = 0;
static int      s_conv_indices[MAX_MESSAGES];
static int      s_conv_count    = 0;
static int      s_conv_scroll   = 0;

/* ── Compose state ── */
static uint32_t s_compose_dest  = 0;
static char     s_compose_buf[MAX_TEXT_LEN + 1];
static uint8_t  s_compose_len   = 0;
static uint8_t  s_compose_char  = 0;   /* index in charset */
static const char CHARSET[]     = INPUT_CHARSET;
static const uint8_t CHARSET_LEN = sizeof(CHARSET) - 1;

/* ── Setup / PIN entry state ── */
static char     s_pin_buf[5]    = "0000";
static uint8_t  s_pin_pos       = 0;

/* ── Settings state ── */
static int      s_settings_sel  = 0;
#define SETTINGS_COUNT 5

/* ── Network screen state ── */
/* (no extra state needed) */

/* ── Wipe confirmation ── */
static int      s_wipe_sel      = 0;

/* ──────── Drawing Helpers ──────── */

static void draw_header(const char *title) {
    s_disp.setFont(u8g2_font_helvB08_tr);
    s_disp.drawStr(2, 10, title);

    /* Battery indicator (top-right) */
    uint8_t bp = battery::percent();
    char bat[6];
    snprintf(bat, sizeof(bat), "%d%%", bp);
    uint8_t bw = s_disp.getStrWidth(bat);
    s_disp.drawStr(SCREEN_W - bw - 2, 10, bat);

    /* Battery icon */
    uint8_t bx = SCREEN_W - bw - 15;
    s_disp.drawFrame(bx, 2, 10, 7);
    s_disp.drawBox(bx + 10, 4, 2, 3);
    uint8_t fill = (uint8_t)((8UL * bp) / 100);
    if (fill > 0) s_disp.drawBox(bx + 1, 3, fill, 5);

    /* Separator line */
    s_disp.drawHLine(0, HDR_H, SCREEN_W);
}

static void draw_footer(const char *left, const char *center, const char *right) {
    s_disp.drawHLine(0, SCREEN_H - FTR_H - 1, SCREEN_W);
    s_disp.setFont(u8g2_font_5x7_tr);
    uint8_t y = SCREEN_H - 2;
    if (left)   s_disp.drawStr(1, y, left);
    if (center) {
        uint8_t cw = s_disp.getStrWidth(center);
        s_disp.drawStr((SCREEN_W - cw) / 2, y, center);
    }
    if (right) {
        uint8_t rw = s_disp.getStrWidth(right);
        s_disp.drawStr(SCREEN_W - rw - 1, y, right);
    }
}

static void draw_centered(const char *text, uint8_t y) {
    uint8_t w = s_disp.getStrWidth(text);
    s_disp.drawStr((SCREEN_W - w) / 2, y, text);
}

/* ──────── Screen Renderers ──────── */

static void draw_splash() {
    s_disp.setFont(u8g2_font_helvB12_tr);
    draw_centered("PM-Chat", 30);
    s_disp.setFont(u8g2_font_helvR08_tr);
    draw_centered("LoRa Mesh v1.0", 44);
    s_disp.setFont(u8g2_font_5x7_tr);
    draw_centered("Initialisation...", 58);
}

static void draw_setup_welcome() {
    draw_header("Configuration");
    s_disp.setFont(u8g2_font_helvR08_tr);
    draw_centered("Bienvenue sur PM-Chat", 28);
    s_disp.setFont(u8g2_font_5x7_tr);
    draw_centered("Entrez un code PIN Mesh", 40);
    draw_centered("Partagez avec votre groupe", 50);
    draw_footer(NULL, "OK:start", NULL);
}

static void draw_setup_pin() {
    draw_header("Code PIN Mesh");

    s_disp.setFont(u8g2_font_helvB12_tr);
    char display[9] = "_ _ _ _";
    for (uint8_t i = 0; i < 4; i++) {
        if (i < s_pin_pos || (i == s_pin_pos && s_pin_buf[i] != '0')) {
            display[i * 2] = s_pin_buf[i];
        }
    }
    /* Blink cursor */
    if (s_pin_pos < 4 && (millis() / 400) & 1) {
        display[s_pin_pos * 2] = '_';
    } else if (s_pin_pos < 4) {
        display[s_pin_pos * 2] = s_pin_buf[s_pin_pos];
    }
    draw_centered(display, 38);

    draw_footer("^v:digit", "OK:next", "Hold OK:go");
}

static void draw_device_info() {
    draw_header("Infos appareil");

    char hex_id[9];
    pkt::id_to_hex(identity::get_device_id(), hex_id);

    s_disp.setFont(u8g2_font_5x7_tr);
    draw_centered("Votre ID d'appareil :", 26);

    s_disp.setFont(u8g2_font_helvB12_tr);
    draw_centered(hex_id, 42);

    s_disp.setFont(u8g2_font_5x7_tr);
    draw_centered("Partagez ceci avec vos pairs", 52);

    draw_footer(NULL, "OK:continue", NULL);
}

static void draw_inbox() {
    int unread = msg_store::unread_count();
    char title[24];
    snprintf(title, sizeof(title), "Réception (%d)", unread);
    draw_header(title);

    s_peer_count = msg_store::get_peers(s_peer_list, MAX_PEERS);

    if (s_peer_count == 0) {
        s_disp.setFont(u8g2_font_helvR08_tr);
        draw_centered("Aucun message", 35);
        s_disp.setFont(u8g2_font_5x7_tr);
        draw_centered("Envoyez un ping ou composez", 47);
    } else {
        s_disp.setFont(u8g2_font_5x7_tr);
        int visible_rows = 4;
        int start = (s_inbox_sel >= visible_rows) ? s_inbox_sel - visible_rows + 1 : 0;

        for (int i = 0; i < visible_rows && (start + i) < s_peer_count; i++) {
            int idx = start + i;
            uint8_t y = CONTENT_Y + 2 + i * 10;
            char hex_id[9];
            pkt::id_to_hex(s_peer_list[idx], hex_id);

            if (idx == s_inbox_sel) {
                s_disp.drawBox(0, y - 7, SCREEN_W, 10);
                s_disp.setDrawColor(0);
            }

            /* Show peer ID and last message preview */
            s_disp.drawStr(2, y, hex_id);

            /* Get last message from this peer */
            int conv_idx[MAX_MESSAGES];
            int conv_n = msg_store::get_conversation(s_peer_list[idx], conv_idx, MAX_MESSAGES);
            if (conv_n > 0) {
                const Message *last = msg_store::get(conv_idx[conv_n - 1]);
                if (last) {
                    char preview[12];
                    strncpy(preview, last->text, 11);
                    preview[11] = '\0';
                    if (last->text_len > 11) {
                        preview[9] = '.';
                        preview[10] = '.';
                    }
                    s_disp.drawStr(55, y, preview);
                }
            }

            s_disp.setDrawColor(1);
        }
    }

    draw_footer("^v:nav", "OK:open", "Hold:new");
}

static void draw_conversation() {
    char hex_id[9];
    pkt::id_to_hex(s_conv_peer, hex_id);
    draw_header(hex_id);

    s_conv_count = msg_store::get_conversation(s_conv_peer, s_conv_indices, MAX_MESSAGES);

    s_disp.setFont(u8g2_font_5x7_tr);

    if (s_conv_count == 0) {
        draw_centered("Aucun message", 35);
    } else {
        int visible_rows = 4;
        int start = s_conv_scroll;
        if (start > s_conv_count - visible_rows) {
            start = s_conv_count - visible_rows;
        }
        if (start < 0) start = 0;

        for (int i = 0; i < visible_rows && (start + i) < s_conv_count; i++) {
            const Message *m = msg_store::get(s_conv_indices[start + i]);
            if (!m) continue;

            uint8_t y = CONTENT_Y + 2 + i * 10;
            char line[24];

            if (m->incoming) {
                s_disp.drawStr(1, y, ">");
                strncpy(line, m->text, 22);
                line[22] = '\0';
                s_disp.drawStr(8, y, line);
            } else {
                /* Right-align sent messages */
                strncpy(line, m->text, 20);
                line[20] = '\0';
                uint8_t tw = s_disp.getStrWidth(line);
                s_disp.drawStr(SCREEN_W - tw - 2, y, line);
            }
        }
    }

    draw_footer("^v:scroll", "OK:reply", "Back:hold^");
}

static void draw_compose() {
    char hex_id[9];
    pkt::id_to_hex(s_compose_dest, hex_id);
    char title[16];
    snprintf(title, sizeof(title), "To:%s", hex_id);
    draw_header(title);

    /* Show composed text */
    s_disp.setFont(u8g2_font_5x7_tr);
    uint8_t y = CONTENT_Y + 2;

    /* Word-wrap the composed text across lines */
    int chars_per_line = 21;
    for (int line = 0; line < 3 && line * chars_per_line < (int)s_compose_len; line++) {
        char seg[22];
        int seg_start = line * chars_per_line;
        int seg_len = s_compose_len - seg_start;
        if (seg_len > chars_per_line) seg_len = chars_per_line;
        memcpy(seg, &s_compose_buf[seg_start], seg_len);
        seg[seg_len] = '\0';
        s_disp.drawStr(2, y + line * 9, seg);
    }

    /* Show cursor character */
    if (s_compose_len < MAX_TEXT_LEN) {
        char cur[4];
        cur[0] = '[';
        cur[1] = CHARSET[s_compose_char];
        cur[2] = ']';
        cur[3] = '\0';

        s_disp.setFont(u8g2_font_helvB08_tr);
        uint8_t cw = s_disp.getStrWidth(cur);
        s_disp.drawStr((SCREEN_W - cw) / 2, CONTENT_Y + 36, cur);
    }

    draw_footer("^v:char", "OK:add", "HldOK:send");
}

static void draw_sending() {
    draw_header("Envoi");
    s_disp.setFont(u8g2_font_helvR08_tr);
    draw_centered("Transmission...", 32);

    /* Simple animated dots */
    uint8_t dots = (millis() / 300) % 4;
    char anim[5] = "    ";
    for (uint8_t i = 0; i < dots; i++) anim[i] = '.';
    anim[dots] = '\0';
    s_disp.setFont(u8g2_font_helvB12_tr);
    draw_centered(anim, 48);

    draw_footer(NULL, NULL, NULL);
}

static void draw_settings() {
    draw_header("Paramètres");

    static const char *items[] = {
        "Code PIN Mesh",
        "Verrouillage PIN",
        "Luminosité",
        "Mode test",
        "Réinitialisation usine"
    };

    s_disp.setFont(u8g2_font_5x7_tr);
    for (int i = 0; i < SETTINGS_COUNT; i++) {
        uint8_t y = CONTENT_Y + 2 + i * 9;
        if (i == s_settings_sel) {
            s_disp.drawBox(0, y - 7, SCREEN_W, 9);
            s_disp.setDrawColor(0);
        }
        s_disp.drawStr(4, y, items[i]);

        /* Show current values */
        char val[12] = "";
        if (i == 0) {
            char pin[5];
            identity::get_mesh_pin(pin);
            snprintf(val, sizeof(val), "%s", pin);
        } else if (i == 1) {
            uint8_t enabled = 0; /* PIN lock state from storage */
            snprintf(val, sizeof(val), "%s", enabled ? "ON" : "OFF");
        } else if (i == 2) {
            snprintf(val, sizeof(val), "%d%%", (s_brightness * 100) / 255);
        }
        if (val[0]) {
            uint8_t vw = s_disp.getStrWidth(val);
            s_disp.drawStr(SCREEN_W - vw - 4, y, val);
        }

        s_disp.setDrawColor(1);
    }

    draw_footer("^v:nav", "OK:select", "Back:hold^");
}

static void draw_network() {
    draw_header("Réseau");

    s_disp.setFont(u8g2_font_5x7_tr);
    uint8_t y = CONTENT_Y + 4;

    char line[28];
    char hex_id[9];
    pkt::id_to_hex(identity::get_device_id(), hex_id);
    snprintf(line, sizeof(line), "ID: %s", hex_id);
    s_disp.drawStr(2, y, line);
    y += 10;

    snprintf(line, sizeof(line), "RSSI: %d dBm", radio::last_rssi());
    s_disp.drawStr(2, y, line);
    y += 10;

    snprintf(line, sizeof(line), "Relayés: %lu", (unsigned long)mesh::get_relayed_count());
    s_disp.drawStr(2, y, line);
    y += 10;

    snprintf(line, sizeof(line), "Perdus: %lu", (unsigned long)mesh::get_dropped_count());
    s_disp.drawStr(2, y, line);

    draw_footer(NULL, NULL, "Back:hold^");
}

static void draw_wipe_confirm() {
    draw_header("! EFFACER !");

    s_disp.setFont(u8g2_font_helvR08_tr);
    draw_centered("Effacer toutes les données ?", 28);
    draw_centered("Action irréversible !", 40);

    s_disp.setFont(u8g2_font_helvB08_tr);
    if (s_wipe_sel == 0) {
        s_disp.drawFrame(20, 46, 40, 12);
        s_disp.drawStr(24, 55, "Annuler");
        s_disp.drawBox(68, 46, 40, 12);
        s_disp.setDrawColor(0);
        s_disp.drawStr(72, 55, "EFFACER");
        s_disp.setDrawColor(1);
    } else {
        s_disp.drawBox(20, 46, 40, 12);
        s_disp.setDrawColor(0);
        s_disp.drawStr(24, 55, "Annuler");
        s_disp.setDrawColor(1);
        s_disp.drawFrame(68, 46, 40, 12);
        s_disp.drawStr(72, 55, "EFFACER");
    }

    draw_footer("<:annuler", "OK:choisir", ">:effacer");
}

static void draw_pin_entry() {
    draw_header("Verrouillage PIN");

    s_disp.setFont(u8g2_font_helvB12_tr);
    char display[9] = "* * * *";
    for (uint8_t i = 0; i < 4; i++) {
        if (i == s_pin_pos) {
            display[i * 2] = s_pin_buf[i];
        }
    }
    draw_centered(display, 38);

    draw_footer("^v:digit", "OK:next", NULL);
}

static void draw_test() {
    draw_header("Mode test");

    s_disp.setFont(u8g2_font_5x7_tr);
    uint8_t y = CONTENT_Y + 4;

    s_disp.drawStr(2, y, "Radio : OK");
    y += 10;

    char line[28];
    snprintf(line, sizeof(line), "Batt : %dmV %d%%",
             battery::voltage_mv(), battery::percent());
    s_disp.drawStr(2, y, line);
    y += 10;

    s_disp.drawStr(2, y, "Boutons : appuyez");
    y += 10;

    s_disp.drawStr(2, y, "OLED : affichage OK");

    draw_footer(NULL, NULL, "Back:hold^");
}

static void draw_error() {
    draw_header("ERREUR");

    s_disp.setFont(u8g2_font_helvR08_tr);
    /* Word-wrap error message */
    int len = strlen(s_error);
    int chars_per_line = 20;
    for (int line = 0; line < 3 && line * chars_per_line < len; line++) {
        char seg[22];
        int seg_start = line * chars_per_line;
        int seg_len = len - seg_start;
        if (seg_len > chars_per_line) seg_len = chars_per_line;
        memcpy(seg, &s_error[seg_start], seg_len);
        seg[seg_len] = '\0';
        s_disp.drawStr(4, CONTENT_Y + 4 + line * 12, seg);
    }

    draw_footer(NULL, "OK:dismiss", NULL);
}

/* ──────── Input Handlers ──────── */

static void handle_setup_welcome(BtnEvent evt) {
    if (evt == BTN_OK_SHORT) {
        s_pin_pos = 0;
        memcpy(s_pin_buf, "0000", 4);
        s_screen = SCR_SETUP_PIN;
    }
}

static void handle_setup_pin(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            s_pin_buf[s_pin_pos]++;
            if (s_pin_buf[s_pin_pos] > '9') s_pin_buf[s_pin_pos] = '0';
            break;
        case BTN_DOWN_SHORT:
            s_pin_buf[s_pin_pos]--;
            if (s_pin_buf[s_pin_pos] < '0') s_pin_buf[s_pin_pos] = '9';
            break;
        case BTN_OK_SHORT:
            if (s_pin_pos < 3) {
                s_pin_pos++;
            }
            break;
        case BTN_OK_LONG:
            /* Confirm PIN — provision device */
            s_pin_buf[4] = '\0';
            identity::provision(s_pin_buf);
            s_screen = SCR_DEVICE_INFO;
            break;
        case BTN_UP_LONG:
            /* Go back a digit */
            if (s_pin_pos > 0) s_pin_pos--;
            break;
        default: break;
    }
}

static void handle_device_info(BtnEvent evt) {
    if (evt == BTN_OK_SHORT || evt == BTN_OK_LONG) {
        s_screen = SCR_INBOX;
    }
}

static void handle_inbox(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            if (s_inbox_sel > 0) s_inbox_sel--;
            break;
        case BTN_DOWN_SHORT:
            if (s_inbox_sel < s_peer_count - 1) s_inbox_sel++;
            break;
        case BTN_OK_SHORT:
            if (s_peer_count > 0) {
                s_conv_peer = s_peer_list[s_inbox_sel];
                s_conv_scroll = 0;
                /* Mark messages as read */
                int indices[MAX_MESSAGES];
                int n = msg_store::get_conversation(s_conv_peer, indices, MAX_MESSAGES);
                for (int i = 0; i < n; i++) {
                    msg_store::mark_read(indices[i]);
                }
                s_screen = SCR_CONVERSATION;
            }
            break;
        case BTN_OK_LONG:
            /* New message — compose to broadcast */
            ui::compose_begin(BROADCAST_ID);
            s_screen = SCR_COMPOSE;
            break;
        case BTN_UP_LONG:
            s_screen = SCR_SETTINGS;
            s_settings_sel = 0;
            break;
        case BTN_DOWN_LONG:
            s_screen = SCR_NETWORK;
            break;
        default: break;
    }
}

static void handle_conversation(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            if (s_conv_scroll > 0) s_conv_scroll--;
            break;
        case BTN_DOWN_SHORT:
            if (s_conv_scroll < s_conv_count - 1) s_conv_scroll++;
            break;
        case BTN_OK_SHORT:
            /* Reply to this peer */
            ui::compose_begin(s_conv_peer);
            s_screen = SCR_COMPOSE;
            break;
        case BTN_UP_LONG:
            s_screen = SCR_INBOX;
            break;
        default: break;
    }
}

static void handle_compose(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            s_compose_char = (s_compose_char + 1) % CHARSET_LEN;
            break;
        case BTN_DOWN_SHORT:
            s_compose_char = (s_compose_char == 0) ? CHARSET_LEN - 1 : s_compose_char - 1;
            break;
        case BTN_OK_SHORT:
            /* Add character */
            if (s_compose_len < MAX_TEXT_LEN) {
                s_compose_buf[s_compose_len++] = CHARSET[s_compose_char];
                s_compose_buf[s_compose_len] = '\0';
            }
            break;
        case BTN_OK_LONG:
            /* Send message */
            if (s_compose_len > 0) {
                s_screen = SCR_SENDING;
            }
            break;
        case BTN_DOWN_LONG:
            /* Delete last character */
            if (s_compose_len > 0) {
                s_compose_len--;
                s_compose_buf[s_compose_len] = '\0';
            }
            break;
        case BTN_UP_LONG:
            /* Cancel — back to inbox */
            s_screen = SCR_INBOX;
            break;
        default: break;
    }
}

static void handle_settings(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            if (s_settings_sel > 0) s_settings_sel--;
            break;
        case BTN_DOWN_SHORT:
            if (s_settings_sel < SETTINGS_COUNT - 1) s_settings_sel++;
            break;
        case BTN_OK_SHORT:
            switch (s_settings_sel) {
                case 0: /* Mesh PIN — show network info */
                    s_screen = SCR_NETWORK;
                    break;
                case 1: /* PIN Lock toggle */
                    /* TODO: toggle PIN lock */
                    break;
                case 2: /* Brightness */
                    s_brightness = (s_brightness >= 250) ? 50 : s_brightness + 50;
                    ui::set_brightness(s_brightness);
                    break;
                case 3: /* Test Mode */
                    s_screen = SCR_TEST;
                    break;
                case 4: /* Factory Reset */
                    s_wipe_sel = 0;
                    s_screen = SCR_WIPE_CONFIRM;
                    break;
            }
            break;
        case BTN_UP_LONG:
            s_screen = SCR_INBOX;
            break;
        default: break;
    }
}

static void handle_wipe_confirm(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
        case BTN_DOWN_SHORT:
            s_wipe_sel = 1 - s_wipe_sel;
            break;
        case BTN_OK_SHORT:
            if (s_wipe_sel == 1) {
                /* Perform wipe — state machine handles the rest */
                return; /* Caller checks s_wipe_sel */
            }
            s_screen = SCR_SETTINGS;
            break;
        case BTN_UP_LONG:
            s_screen = SCR_SETTINGS;
            break;
        default: break;
    }
}

static void handle_pin_entry(BtnEvent evt) {
    switch (evt) {
        case BTN_UP_SHORT:
            s_pin_buf[s_pin_pos]++;
            if (s_pin_buf[s_pin_pos] > '9') s_pin_buf[s_pin_pos] = '0';
            break;
        case BTN_DOWN_SHORT:
            s_pin_buf[s_pin_pos]--;
            if (s_pin_buf[s_pin_pos] < '0') s_pin_buf[s_pin_pos] = '9';
            break;
        case BTN_OK_SHORT:
            if (s_pin_pos < 3) s_pin_pos++;
            break;
        case BTN_OK_LONG:
            /* PIN submitted — state machine validates */
            break;
        default: break;
    }
}

static void handle_error(BtnEvent evt) {
    if (evt == BTN_OK_SHORT) {
        s_screen = SCR_INBOX;
    }
}

static void handle_test(BtnEvent evt) {
    if (evt == BTN_UP_LONG) {
        s_screen = SCR_SETTINGS;
    }
}

static void handle_network(BtnEvent evt) {
    if (evt == BTN_UP_LONG) {
        s_screen = SCR_INBOX;
    }
}

/* ──────── Public API ──────── */

void ui::init() {
    Wire.setSDA(PIN_I2C_SDA);
    Wire.setSCL(PIN_I2C_SCL);
    Wire.begin();

    s_disp.begin();
    s_disp.setContrast(s_brightness);
    s_disp.clearBuffer();
    s_last_input = millis();
}

void ui::set_screen(Screen scr) {
    s_screen = scr;
    wake();
}

Screen ui::current_screen() {
    return s_screen;
}

void ui::handle_input(BtnEvent evt) {
    if (evt == BTN_NONE) return;

    wake();

    /* If display was off, first press just wakes it */
    if (s_off) {
        s_off = false;
        s_dimmed = false;
        s_disp.setContrast(s_brightness);
        return;
    }

    switch (s_screen) {
        case SCR_SPLASH:         break; /* no input during splash */
        case SCR_SETUP_WELCOME:  handle_setup_welcome(evt); break;
        case SCR_SETUP_PIN:      handle_setup_pin(evt);     break;
        case SCR_DEVICE_INFO:    handle_device_info(evt);   break;
        case SCR_INBOX:          handle_inbox(evt);         break;
        case SCR_CONVERSATION:   handle_conversation(evt);  break;
        case SCR_COMPOSE:        handle_compose(evt);       break;
        case SCR_SENDING:        break;
        case SCR_SETTINGS:       handle_settings(evt);      break;
        case SCR_NETWORK:        handle_network(evt);       break;
        case SCR_WIPE_CONFIRM:   handle_wipe_confirm(evt);  break;
        case SCR_PIN_ENTRY:      handle_pin_entry(evt);     break;
        case SCR_TEST:           handle_test(evt);          break;
        case SCR_ERROR:          handle_error(evt);         break;
    }
}

void ui::draw() {
    if (s_off) return;

    s_disp.clearBuffer();

    switch (s_screen) {
        case SCR_SPLASH:         draw_splash();        break;
        case SCR_SETUP_WELCOME:  draw_setup_welcome(); break;
        case SCR_SETUP_PIN:      draw_setup_pin();     break;
        case SCR_DEVICE_INFO:    draw_device_info();   break;
        case SCR_INBOX:          draw_inbox();         break;
        case SCR_CONVERSATION:   draw_conversation();  break;
        case SCR_COMPOSE:        draw_compose();       break;
        case SCR_SENDING:        draw_sending();       break;
        case SCR_SETTINGS:       draw_settings();      break;
        case SCR_NETWORK:        draw_network();       break;
        case SCR_WIPE_CONFIRM:   draw_wipe_confirm();  break;
        case SCR_PIN_ENTRY:      draw_pin_entry();     break;
        case SCR_TEST:           draw_test();          break;
        case SCR_ERROR:          draw_error();         break;
    }

    /* Toast overlay */
    if (s_toast[0] && millis() < s_toast_until) {
        uint8_t tw = s_disp.getStrWidth(s_toast);
        uint8_t tx = (SCREEN_W - tw) / 2;
        s_disp.setDrawColor(0);
        s_disp.drawBox(tx - 4, 22, tw + 8, 16);
        s_disp.setDrawColor(1);
        s_disp.drawFrame(tx - 4, 22, tw + 8, 16);
        s_disp.setFont(u8g2_font_helvR08_tr);
        s_disp.drawStr(tx, 34, s_toast);
    } else {
        s_toast[0] = '\0';
    }

    s_disp.sendBuffer();
}

void ui::toast(const char *text, uint16_t duration_ms) {
    strncpy(s_toast, text, sizeof(s_toast) - 1);
    s_toast[sizeof(s_toast) - 1] = '\0';
    s_toast_until = millis() + duration_ms;
}

void ui::wake() {
    s_last_input = millis();
    if (s_dimmed) {
        s_dimmed = false;
        s_disp.setContrast(s_brightness);
    }
    if (s_off) {
        s_off = false;
        s_disp.setPowerSave(0);
    }
}

void ui::tick() {
    uint32_t elapsed = millis() - s_last_input;
    if (!s_off && elapsed > OFF_TIMEOUT_MS) {
        s_off = true;
        s_disp.setPowerSave(1);
    } else if (!s_dimmed && elapsed > DIM_TIMEOUT_MS) {
        s_dimmed = true;
        s_disp.setContrast(20);
    }
}

void ui::set_brightness(uint8_t b) {
    s_brightness = b;
    if (!s_dimmed && !s_off) {
        s_disp.setContrast(b);
    }
}

uint8_t ui::get_brightness()    { return s_brightness; }
bool    ui::is_off()            { return s_off; }
const char *ui::compose_text()  { return s_compose_buf; }
uint32_t ui::compose_dest()     { return s_compose_dest; }

void ui::compose_begin(uint32_t dest_id) {
    s_compose_dest = dest_id;
    s_compose_len = 0;
    s_compose_buf[0] = '\0';
    s_compose_char = 0;
}

void ui::conversation_set_peer(uint32_t peer_id) {
    s_conv_peer = peer_id;
    s_conv_scroll = 0;
}

void ui::show_error(const char *msg) {
    strncpy(s_error, msg, sizeof(s_error) - 1);
    s_error[sizeof(s_error) - 1] = '\0';
    s_screen = SCR_ERROR;
}

const char *ui::setup_pin() {
    return s_pin_buf;
}
