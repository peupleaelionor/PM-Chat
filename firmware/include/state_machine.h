/*
 * PM-Chat Mesh Firmware — System State Machine
 * Controls overall firmware state transitions.
 */
#ifndef STATE_MACHINE_H
#define STATE_MACHINE_H

#include "config.h"

namespace fsm {

/* Initialise state machine. */
void init();

/* Get current system state. */
SystemState state();

/* Transition to a new state. */
void transition(SystemState new_state);

/* Main tick — runs the current state logic.
 * Called every loop iteration. */
void tick();

/* Signal that a message was received. */
void on_message_received();

/* Signal that sending is complete (success or fail). */
void on_send_complete(bool success);

/* Signal an error. */
void on_error(const char *msg);

/* Signal that setup is complete. */
void on_setup_complete();

/* Signal that PIN entry was correct. */
void on_pin_accepted();

/* Request panic wipe. */
void panic_wipe();

} // namespace fsm

#endif
