// Backdrop art for `board:rips_flat`: the blue board in its gold frame, no marble surround. Always
// stretched to the element's box (RipsFlatBoard.css), whatever the tile set.
//
// `RIPS_BOARD_INSET` is how far the cell area sits in from every edge of the art, in art px — kept
// in art px rather than box px so it scales with the stretched frame. Not a setting. MUST be
// re-checked against the gold frame's inner edge if the art is replaced.

export const RIPS_BOARD_ART = {src: '/images/rips_board/BoardSeparate.png', w: 1473, h: 354} as const

export const RIPS_BOARD_INSET = 5
