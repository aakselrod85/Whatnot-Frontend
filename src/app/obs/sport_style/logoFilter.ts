/** Sports' crisp black edge, shared by priced sports tiles and RIPS marble tiles. */
export function sportsLogoFilter(height: number): string {
    const px = Math.max(1, Math.round(height * 0.035))
    const outline = [`${px}px 0`, `-${px}px 0`, `0 ${px}px`, `0 -${px}px`]
        .map((offset) => `drop-shadow(${offset} 0 rgba(0,0,0,0.9))`).join(' ')
    const shadow = Math.round(height * 0.03)
    return `${outline} drop-shadow(0 ${shadow}px ${shadow}px rgba(0,0,0,0.5))`
}
