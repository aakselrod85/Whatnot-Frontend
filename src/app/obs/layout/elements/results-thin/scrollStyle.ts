// Timings of the running nickname, shared by ALL styles of `resultsThin` (default, rips, sports).
// A nickname that does not fit runs left like a ticker; a second copy follows the first, so there
// is always text coming in from the right. All running names of a board move in step
// (nameScrollSync.ts): they set off together, each slides by its own length, the short ones wait at
// the start position for the longest one, and only after it has arrived and PAUSE is over do all
// of them set off again. Lives here in code on purpose, not in the element's settings. The left /
// right position of the clipping mask is a per-style setting (defaultStyle.ts, ripsStyle.ts,
// sportsStyle.ts).

/** Speed, canvas px per second. Constant while moving, so every name moves at the same speed
 *  whatever its length (a longer name just takes longer for a full pass). */
export const SCROLL_SPEED = 10

/** Empty space, canvas px, between the END of one copy of the name and the START of the next. */
export const SCROLL_GAP_PX = 15

/** How long everything stands still before the very first round, ms. The same wait comes back
 *  whenever a name appears, changes or is resized (the board restarts together). */
export const SCROLL_START_PAUSE_MS = 2000

/** The wait between rounds, ms: counted from the moment the LONGEST name has arrived at its start
 *  position; then all names set off again at once. */
export const SCROLL_PAUSE_MS = 2000
