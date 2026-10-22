import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Lists the paintings for board:rips_flat's 'flip_art' back (public/images/rips_board/FlippedArt),
// so dropping a new image into that folder is enough — the board picks one of them at random.
export interface FlipArtResponse {
    files: string[];
}

const DIR = path.join(process.cwd(), 'public', 'images', 'rips_board', 'FlippedArt');
const IMAGE = /\.(png|jpe?g|webp)$/i;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<FlipArtResponse>
) {
    let names: string[] = [];
    try {
        names = fs.readdirSync(DIR).filter((n) => IMAGE.test(n)).sort();
    } catch {
        // Folder missing: the board falls back to its default painting.
    }
    res.status(200).json({ files: names.map((n) => `/images/rips_board/FlippedArt/${encodeURIComponent(n)}`) });
}
