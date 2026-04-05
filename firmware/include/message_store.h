/*
 * PM-Chat Mesh Firmware — Message Store
 * In-RAM message storage with outgoing queue and retry logic.
 */
#ifndef MESSAGE_STORE_H
#define MESSAGE_STORE_H

#include "config.h"
#include "packet.h"

struct Message {
    uint32_t msg_id;
    uint32_t sender_id;
    uint32_t dest_id;
    uint32_t timestamp;       /* millis() when created/received */
    uint32_t expire_at;       /* millis() when message expires */
    uint32_t next_retry;      /* millis() for next send attempt */
    uint8_t  type;
    uint8_t  flags;
    uint8_t  state;           /* MsgState */
    uint8_t  retries;
    char     text[MAX_TEXT_LEN + 1];
    uint8_t  text_len;
    bool     incoming;        /* true = received, false = sent */
    bool     read;            /* has been opened/viewed */
};

namespace msg_store {

/* Initialise message store. */
void init();

/* Add an incoming message (already decrypted). Returns index or -1. */
int add_incoming(uint32_t sender_id, uint32_t msg_id, uint8_t flags,
                 const char *text, uint8_t text_len);

/* Queue an outgoing message. Returns index or -1. */
int queue_outgoing(uint32_t dest_id, const char *text, uint8_t text_len,
                   uint8_t flags);

/* Mark message as sent/delivered/failed. */
void set_state(int idx, MsgState state);

/* Mark message as read. */
void mark_read(int idx);

/* Get message by index. Returns nullptr if invalid. */
const Message *get(int idx);

/* Get total message count. */
int count();

/* Get unread count. */
int unread_count();

/* Get messages for a specific peer (for conversation view).
 * Returns count, fills indices[] with message indices. */
int get_conversation(uint32_t peer_id, int *indices, int max_results);

/* Get unique peer IDs from message history.
 * Returns count, fills peer_ids[]. */
int get_peers(uint32_t *peer_ids, int max_results);

/* Process retries and expiration. Call every loop iteration. */
void tick();

/* Get next message that needs sending. Returns index or -1. */
int next_pending();

/* Clear all messages. */
void clear();

/* Remove expired and burn-after-read messages. */
void purge();

} // namespace msg_store

#endif
