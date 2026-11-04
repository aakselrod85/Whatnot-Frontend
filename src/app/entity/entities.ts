export interface DayData {
    year: number
    month: number
    day: number
}

export interface Stream {
    date: DayData
    breaks: string[]
}

export interface Event {
    id: number
    index: number
    break_id: number

    customer: string
    price: number
    team: string
    is_giveaway: boolean
    note: string
    quantity: number
    giveaway_type: number
}

export interface EventData {
    customer: string
    price: number
    id: number
}

export interface PackageEvent extends Event {
    is_high_bid: boolean
}

export interface WNBreak {
    id: number
    day_id: number
    name: string
    start_date: string
    end_date: string
    is_deleted: boolean
    high_bid_team: string
    giveaway_team: string
    high_bid_floor: number
    series_id?: number | null
}

// `series.kind` (series-price-ranges-plan.md §1.1): `cards` is today's photo series (default —
// every row created before this existed is `cards`); `price_ranges` is the new show format whose
// contents are described by `SeriesPriceRange` rows instead of photos. Set at creation, never
// changes.
export type SeriesKind = 'cards' | 'price_ranges'

export interface Series {
    id: number
    name: string
    status: 'open' | 'closed'
    created_at: string
    is_deleted: boolean
    total_cards: number
    used_cards: number
    default_price: string
    kind: SeriesKind
}

// One row of a `price_ranges` series' contents (series-price-ranges-plan.md §1.2): "how many cards
// in this price band". Ordered by `price_from` ascending — there is no manual sort order, a range's
// position IS its price. `price_to: null` means open-ended ("$500+").
//
// Name collision warning: `PriceRange` (below) already exists and is the cobra board's per-channel
// tier threshold (`widget_board_price_ranges`) — unrelated to this. Do not conflate the two.
export interface SeriesPriceRange {
    id: number
    series_id: number
    price_from: number
    price_to: number | null
    count: number
    label: string
    sort_order: number
}

export interface SeriesPreset {
    id: number
    channel_id: number
    name: string
    series_ids: number[]
    created_at: string
}

export interface SeriesWithCount extends Series {
    unsold_count: number
    sold_count: number
}

export interface SeriesListPage {
    items: Series[]
    total: number
}

export type Bounds = { x: number; y: number; w: number; h: number }

export interface Photo {
    id: number
    series_id: number
    name: string
    team: string
    url: string
    thumbnail: string
    price: number
    is_sold: boolean
    created_at: string
    is_deleted: boolean
    rotation: number
    version: number // -1 legacy (url only), 1 = art_bounds set
    art_bounds: Bounds | null
    label_bounds: Bounds | null
    label_text: LabelText | null
}

export type LabelText = { kind: string; rows: [string, string][] }

export interface SeriesTeamTotal {
    team: string
    total_price: number
    price_left: number
}

export type StreamStatus = 'planned' | 'live' | 'ended' | 'verified'

export interface WNStream {
    id: number
    created_at: number
    name: string
    is_ended: boolean
    active_break_id: number | null
    whatnot_show_id: string | null
    whatnot_show_name: string | null
    status: StreamStatus
}

export interface StreamResponse extends WNStream {}

export interface GetStreamsResponse {
    streams: StreamResponse[]
    total: number
}

export interface GetChannelsChannel extends WNChannel {
}

export interface GetChannelsResponse {
    channels: GetChannelsChannel[]
}

export interface GetBreaksByDayResponse {
    breaks: WNBreak[]
}

export type SelectedBreak = string

export interface AddBreakResponse {
    id: number
}

export interface GetEventsByBreakResponse {
    events: Event[]
}

export interface WNChannel {
    id: number
    name: string
    active_stream_id: number | null
    default_high_bid_floor: number
    default_high_bid_team: string
}

export interface GetStreamUsernamesResponse {
    usernames: string[]
}

export const NoCustomer = '?'
export const GiveawayTypeNone = 0
export const GiveawayTypePack = 1
export const GiveawayTypeSlab = 2

//Obs Manage
export interface TeamLogos {
    sceneName: string
    logos: TeamLogo[]
}
export interface TeamLogo {
    team: string
    obsItem: ObsItem
}
export interface TeamAnimation {
    team: string
    obsItem: ObsItem
}
export interface TeamAnimations {
    sceneName: string
    animations: TeamAnimation[]
}
export interface SimpleAnimation {
    obsItem: ObsItem;
    id: number
}
export interface SimpleAnimations {
    sceneName: string
    animations: SimpleAnimation[]
}
export const EmptyID = '0'
export const EmptyName = ''

export interface ObsItem {
    name: string
    uuid: string
}

export interface RawObsItem extends ObsItem{
    inputKind: string
}

export const EmptyObsItem: ObsItem = {name: EmptyName, uuid: EmptyID}

export interface ObsScene extends ObsItem{
}

export const ReportUserFailed = 'failed'

export interface ReportUser {
    buyer: string
    product_name: string
    product_quantity: string
    cancelled_or_failed: string
}

export interface PriceRange {
    id: number
    channel_id: number
    tier_id: string
    price_from: number
}

export interface WidgetPreset {
    id: number
    channel_id: number
    name: string
    value: string
}

export interface PackageUsersData {
    data: Map<string, PackageUserData>
}

export interface PackageUserData {
    totalQuantity: number
    auctionQuantity: number
    giveawayQuantity: number
    giveawayTypes: Map<number, number>
}

// OBS layout data spine (src/app/obs/layout/useLayoutData.tsx) — generic value shapes for the
// circle widgets and the cards board settings, shared with their existing per-widget pages.
export interface CircleWidgetValue {
    price?: string | number
    amount?: string | number
    name?: string | number
    [key: string]: string | number | undefined
}

export interface CountSettings {
    show_percentage: boolean
}

export interface CardsBoardSettings {
    orientation: string
    show_horizontal_row: boolean
    show_only_available_teams: boolean
}

// A row recorded by `/api/layout/image/upload` for every image an operator uploads through the
// `imageBox` element (obs-image-box-plan.md §6) — lets the controls page offer a Gallery of
// previously-uploaded images instead of re-uploading. `width`/`height` are the image's pixel
// dimensions (0 if unknown), `size_bytes` the file size.
export interface LayoutImage {
    id: number
    channel_id: number
    name: string
    url: string
    width: number
    height: number
    size_bytes: number
    created_at: string
}

export interface WhatnotShow { id: string; title: string; status: string; scheduled_start_at: string | null; ended_at: string | null }
export interface WhatnotShowsResponse { shows: WhatnotShow[]; next_cursor?: string; has_more?: boolean }
export interface WhatnotBreakOrder { order_id: string; team: string; username: string; price: number; created_at: string }
export interface WhatnotBreakOrders { name: string; orders: WhatnotBreakOrder[] }
export interface WhatnotGiveawayOrder { order_id: string; title: string; username: string; created_at: string }
export interface WhatnotUnparsedOrder { order_id: string; title: string; username: string; price: number; created_at: string }
export interface WhatnotOrdersResponse { show: WhatnotShow; orders_scanned: number; breaks: WhatnotBreakOrders[]; giveaways: WhatnotGiveawayOrder[]; unparsed: WhatnotUnparsedOrder[] }

export type ReconciliationStatus = 'running' | 'applied' | 'needs_manual' | 'failed' | 'dry_run'
export interface ReconciliationToAdd { team: string; username: string; price: number }
export interface ReconciliationExtraEvent { team: string; customer: string; event_id: number }
export interface ReconciliationBreakReport {
    wn_name: string; break_id: number; break_name: string; matched_by: 'name' | 'number' | 'none' | 'manual' | 'skipped'
    matched: number; to_fix: number; to_fix_price: number
    to_add?: ReconciliationToAdd[]; extra: ReconciliationExtraEvent[]
}
export interface ShowReconciliationReport {
    show: {id: string; title: string}
    orders_scanned: number
    blocking: number
    breaks: ReconciliationBreakReport[]
    giveaways: {
        to_add: number
        items?: {order_id: string; title: string; username: string; created_at: string; break_id: number; break_name: string; placed_by: 'auto' | 'manual' | 'none'; status: 'matched' | 'missing' | 'unplaced'}[] // absent on older runs
        unplaced: {order_id: string; title: string; username: string}[]
        extra: {break_id: number; customer: string; event_id: number}[]
    }
    unparsed: {title: string; username: string}[]
}
export interface ReconciliationManualMap {
    breaks?: Record<string, number> // Whatnot break name -> break id, or -1 to skip
    giveaways?: Record<string, number> // order id -> break id
}
export interface ShowReconciliation {
    id: number; stream_id: number; show_id: string; trigger: string; status: ReconciliationStatus
    started_at: string; finished_at: string | null; error: string | null
    orders: WhatnotOrdersResponse | null
    report: ShowReconciliationReport | null
    manual_map: ReconciliationManualMap | null
}
export interface ShowReconciliationSummary { fixed: number; price_fixed: number; added: number; events_added?: number; blocking: number }
export interface ShowReconciliationListItem {
    id: number; trigger: string; status: ReconciliationStatus
    started_at: string; finished_at: string | null; error: string | null
    summary: ShowReconciliationSummary
    manual_map: ReconciliationManualMap | null
}
