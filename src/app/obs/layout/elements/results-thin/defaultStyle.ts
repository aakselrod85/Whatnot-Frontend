// The 'default' style's setting for the running nickname (see scrollStyle.ts for the timings).
//
// The clipping mask: the nickname is visible only inside it, anything outside is cut off. By
// default it is exactly the text area (between the icon and the cell's inner right edge). Canvas
// px; positive = that edge moves outward (text shows further out), negative = inward. The
// nickname's START position does not move when the left edge does, only the mask grows.
export const DEFAULT_THIN_TEXT_MASK_EXTEND = { left: 0, right: 0 } as const

// Width of the soft fade at the left and right edge of the mask above, while the nickname does
// not fit and runs. Canvas px. 0 = hard cut.
export const DEFAULT_THIN_TEXT_FADE = 8
