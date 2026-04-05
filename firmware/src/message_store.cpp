/*
 * PM-Chat Mesh Firmware — Message Store
 */
#include "message_store.h"
#include <string.h>
#include <Arduino.h>

static Message  s_msgs[MAX_MESSAGES];
static int      s_count = 0;
static uint32_t s_msg_counter = 0;

void msg_store::init() {
    memset(s_msgs, 0, sizeof(s_msgs));
    s_count = 0;
}

/* Find the oldest expired/read-burn message slot, or the oldest overall */
static int find_slot() {
    if (s_count < MAX_MESSAGES) {
        return s_count++;
    }

    /* Evict oldest expired message */
    uint32_t oldest_ts = UINT32_MAX;
    int oldest_idx = 0;
    for (int i = 0; i < MAX_MESSAGES; i++) {
        if (s_msgs[i].state == MSTATE_EXPIRED) return i;
        if (s_msgs[i].timestamp < oldest_ts) {
            oldest_ts = s_msgs[i].timestamp;
            oldest_idx = i;
        }
    }
    return oldest_idx;
}

int msg_store::add_incoming(uint32_t sender_id, uint32_t msg_id,
                            uint8_t flags, const char *text, uint8_t text_len) {
    /* Check for duplicate msg_id */
    for (int i = 0; i < s_count; i++) {
        if (s_msgs[i].msg_id == msg_id && s_msgs[i].sender_id == sender_id) {
            return -1;
        }
    }

    int idx = find_slot();
    Message &m = s_msgs[idx];
    memset(&m, 0, sizeof(Message));

    m.msg_id    = msg_id;
    m.sender_id = sender_id;
    m.dest_id   = 0;
    m.timestamp = millis();
    m.expire_at = m.timestamp + MSG_EXPIRE_MS;
    m.type      = PKT_TEXT;
    m.flags     = flags;
    m.state     = MSTATE_DELIVERED;
    m.incoming  = true;
    m.read      = false;
    m.retries   = 0;

    uint8_t copy_len = (text_len > MAX_TEXT_LEN) ? MAX_TEXT_LEN : text_len;
    memcpy(m.text, text, copy_len);
    m.text[copy_len] = '\0';
    m.text_len = copy_len;

    return idx;
}

int msg_store::queue_outgoing(uint32_t dest_id, const char *text,
                              uint8_t text_len, uint8_t flags) {
    int idx = find_slot();
    Message &m = s_msgs[idx];
    memset(&m, 0, sizeof(Message));

    m.msg_id    = ++s_msg_counter;
    m.sender_id = 0; /* filled by mesh::send_packet */
    m.dest_id   = dest_id;
    m.timestamp = millis();
    m.expire_at = m.timestamp + MSG_EXPIRE_MS;
    m.type      = PKT_TEXT;
    m.flags     = flags;
    m.state     = MSTATE_QUEUED;
    m.incoming  = false;
    m.read      = true;
    m.retries   = 0;
    m.next_retry = 0;

    uint8_t copy_len = (text_len > MAX_TEXT_LEN) ? MAX_TEXT_LEN : text_len;
    memcpy(m.text, text, copy_len);
    m.text[copy_len] = '\0';
    m.text_len = copy_len;

    return idx;
}

void msg_store::set_state(int idx, MsgState state) {
    if (idx >= 0 && idx < s_count) {
        s_msgs[idx].state = state;
    }
}

void msg_store::mark_read(int idx) {
    if (idx >= 0 && idx < s_count) {
        s_msgs[idx].read = true;
    }
}

const Message *msg_store::get(int idx) {
    if (idx < 0 || idx >= s_count) return nullptr;
    return &s_msgs[idx];
}

int msg_store::count() {
    return s_count;
}

int msg_store::unread_count() {
    int n = 0;
    for (int i = 0; i < s_count; i++) {
        if (s_msgs[i].incoming && !s_msgs[i].read &&
            s_msgs[i].state != MSTATE_EXPIRED) {
            n++;
        }
    }
    return n;
}

int msg_store::get_conversation(uint32_t peer_id, int *indices, int max_results) {
    int n = 0;
    for (int i = 0; i < s_count && n < max_results; i++) {
        if (s_msgs[i].state == MSTATE_EXPIRED) continue;
        if ((s_msgs[i].incoming && s_msgs[i].sender_id == peer_id) ||
            (!s_msgs[i].incoming && s_msgs[i].dest_id == peer_id)) {
            indices[n++] = i;
        }
    }
    return n;
}

int msg_store::get_peers(uint32_t *peer_ids, int max_results) {
    int n = 0;
    for (int i = 0; i < s_count && n < max_results; i++) {
        if (s_msgs[i].state == MSTATE_EXPIRED) continue;
        uint32_t pid = s_msgs[i].incoming ? s_msgs[i].sender_id : s_msgs[i].dest_id;
        if (pid == 0 || pid == BROADCAST_ID) continue;
        /* Check for duplicate peer ID */
        bool found = false;
        for (int j = 0; j < n; j++) {
            if (peer_ids[j] == pid) { found = true; break; }
        }
        if (!found) {
            peer_ids[n++] = pid;
        }
    }
    return n;
}

void msg_store::tick() {
    uint32_t now = millis();
    for (int i = 0; i < s_count; i++) {
        Message &m = s_msgs[i];
        if (m.state == MSTATE_EXPIRED) continue;

        /* Expire old messages */
        if (now > m.expire_at) {
            m.state = MSTATE_EXPIRED;
            continue;
        }

        /* Burn after reading */
        if ((m.flags & FLAG_BURN) && m.read && m.incoming) {
            m.state = MSTATE_EXPIRED;
            memset(m.text, 0, sizeof(m.text));
            continue;
        }

        /* Retry logic for outgoing */
        if (!m.incoming && m.state == MSTATE_QUEUED && m.retries < MSG_RETRY_MAX) {
            if (now >= m.next_retry) {
                m.state = MSTATE_SENDING;
            }
        }

        /* Mark as failed after max retries */
        if (!m.incoming && m.state == MSTATE_QUEUED && m.retries >= MSG_RETRY_MAX) {
            m.state = MSTATE_FAILED;
        }
    }
}

int msg_store::next_pending() {
    for (int i = 0; i < s_count; i++) {
        if (!s_msgs[i].incoming && s_msgs[i].state == MSTATE_SENDING) {
            return i;
        }
    }
    return -1;
}

void msg_store::clear() {
    for (int i = 0; i < s_count; i++) {
        memset(s_msgs[i].text, 0, sizeof(s_msgs[i].text));
    }
    memset(s_msgs, 0, sizeof(s_msgs));
    s_count = 0;
}

void msg_store::purge() {
    /* Compact: remove expired entries by shifting */
    int write = 0;
    for (int read_idx = 0; read_idx < s_count; read_idx++) {
        if (s_msgs[read_idx].state != MSTATE_EXPIRED) {
            if (write != read_idx) {
                memcpy(&s_msgs[write], &s_msgs[read_idx], sizeof(Message));
            }
            write++;
        }
    }
    if (write < s_count) {
        memset(&s_msgs[write], 0, (s_count - write) * sizeof(Message));
    }
    s_count = write;
}
