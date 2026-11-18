// Turns teams.json (one row per NFL team: its nfl/nba/mlb/nhl/soccer partners) into the cells the
// board draws. teams.json is imported into the bundle, so editing it changes the board after a
// page reload in dev (or after the next deploy in production) — nothing else to update.

import { TeamIconSrc } from '@/app/common/teams'
import rawTeams from './teams.json'

type TeamRow = { nfl: string; nba?: string; mlb?: string; nhl?: string; soccer?: string }

// `noSeparators`: the lines are one phrase broken over several lines, so no separator between them.
export type BreakdownCell = { key: string; logo: string; lines: string[]; noSeparators?: boolean }

const MISC = 'Miscellaneous'

// Line order inside a cell, as on the card: NFL, NBA, MLB, NHL, soccer.
const LEAGUE_ORDER = ['nfl', 'nba', 'mlb', 'nhl'] as const

// City -> short code, as printed on the card ("Baltimore Ravens" -> "BAL Ravens"). A name whose
// city is not listed is shown exactly as written in teams.json.
const CITY_CODES: Record<string, string> = {
    'Arizona': 'AZ', 'Phoenix': 'PHX', 'Atlanta': 'ATL', 'Calgary': 'CGY', 'Baltimore': 'BAL',
    'Sacramento': 'SAC', 'New Jersey': 'NJ', 'Buffalo': 'BUF', 'Toronto': 'TOR', 'Carolina': 'CAR',
    'Charlotte': 'CHA', 'Chicago': 'CHI', 'Cincinnati': 'CIN', 'Winnipeg': 'WIN', 'Cleveland': 'CLE',
    'Columbus': 'COL', 'Dallas': 'DAL', 'Texas': 'TX', 'Denver': 'DEN', 'Colorado': 'CO',
    'Detroit': 'DET', 'Green Bay': 'GB', 'Milwaukee': 'MIL', 'Vancouver': 'VAN', 'Houston': 'HOU',
    'Indianapolis': 'IND', 'Indiana': 'IND', 'Ottawa': 'OTT', 'Jacksonville': 'JAX',
    'San Diego': 'SD', 'Edmonton': 'EDM', 'Kansas City': 'KC', 'Oklahoma City': 'OKC',
    'St. Louis': 'STL', 'Las Vegas': 'LV', 'Vegas': 'LV', 'Utah': 'UTA', 'Los Angeles': 'LA',
    'Anaheim': 'ANA', 'Miami': 'MIA', 'Florida': 'FL', 'Minnesota': 'MIN', 'New England': 'NE',
    'Boston': 'BOS', 'New Orleans': 'NO', 'Montreal': 'MTL', 'New York': 'NY', 'Brooklyn': 'BK',
    'Philadelphia': 'PHI', 'Pittsburgh': 'PIT', 'San Antonio': 'SA', 'San Francisco': 'SF',
    'Golden State': 'GS', 'San Jose': 'SJ', 'Seattle': 'SEA', 'Portland': 'POR', 'Tampa Bay': 'TB',
    'Orlando': 'ORL', 'Tennessee': 'TEN', 'Nashville': 'NSH', 'Memphis': 'MEM', 'Washington': 'WAS',
}

// Longest city first, so "New York" wins over a shorter prefix and "Las Vegas" over "Vegas".
const CITIES = Object.keys(CITY_CODES).sort((a, b) => b.length - a.length)

export function shortName(full: string): string {
    const name = full.trim()
    for (const city of CITIES) {
        if (name.startsWith(city + ' ')) return `${CITY_CODES[city]} ${name.slice(city.length + 1)}`
    }
    return name
}

const TEAMS = rawTeams as TeamRow[]

/**
 * Every cell of the board: NFL teams alphabetically by their full name in teams.json
 * ("Arizona Cardinals" … "Washington Commanders"), Miscellaneous always last.
 * `toppsDynasty` adds the soccer line.
 */
export function buildCells(toppsDynasty: boolean): BreakdownCell[] {
    return [...TEAMS]
        .filter((t) => typeof t.nfl === 'string' && t.nfl.trim() !== '')
        .sort((a, b) => {
            const am = a.nfl === MISC
            const bm = b.nfl === MISC
            if (am !== bm) return am ? 1 : -1
            return a.nfl.localeCompare(b.nfl, 'en')
        })
        .map((t) => {
            if (t.nfl === MISC) return { key: MISC, logo: TeamIconSrc(MISC), lines: ['Managers', 'regardless', 'of team'], noSeparators: true }
            const lines = LEAGUE_ORDER.map((l) => t[l]).filter((v): v is string => !!v && v.trim() !== '')
            if (toppsDynasty && t.soccer && t.soccer.trim() !== '') lines.push(t.soccer)
            return { key: t.nfl, logo: TeamIconSrc(t.nfl), lines: lines.map(shortName) }
        })
}
