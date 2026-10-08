"""Renders the board:rips_flat marble tiles to public/images/rips_tiles/{veined,clean}/<Team>.png
and their backdrop to public/images/rips_board/board_tiles.png.

tiles.html draws every tile on a canvas; this serves the repo over a local HTTP server (a canvas
fed from file:// images is tainted and cannot be exported), loads tiles.html?export=<size>&set=<set>
in headless Chrome, and writes out the data URLs the page dumps into <pre id="export">.

Usage, from Whatnot-Frontend/:  python3 scripts/rips-tiles/export.py [--size 264] [--chrome PATH]
"""
import argparse
import base64
import functools
import html
import http.server
import json
import os
import re
import subprocess
import threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'images', 'rips_tiles')
MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def main():
    ap = argparse.ArgumentParser()
    # 4x the live cell (66 px on the 1080x250 board), so the browser only ever scales down
    ap.add_argument('--size', type=int, default=264)
    ap.add_argument('--chrome', default=MAC_CHROME if os.path.exists(MAC_CHROME) else 'google-chrome')
    args = ap.parse_args()

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]

    try:
        for tile_set in ('veined', 'clean'):
            url = f'http://127.0.0.1:{port}/scripts/rips-tiles/tiles.html?export={args.size}&set={tile_set}'
            dom = subprocess.run(
                [args.chrome, '--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', url],
                capture_output=True, text=True, check=True,
            ).stdout
            m = re.search(r'<pre id="export">(\{.*?\})</pre>', dom, re.S)
            if not m:
                raise SystemExit(f'{tile_set}: no export block in the page (did the images load?)')
            tiles = json.loads(html.unescape(m.group(1)))
            os.makedirs(os.path.join(OUT, tile_set), exist_ok=True)
            for team, data_url in tiles.items():
                with open(os.path.join(OUT, tile_set, f'{team}.png'), 'wb') as f:
                    f.write(base64.b64decode(data_url.split(',', 1)[1]))
            print(f'{tile_set}: {len(tiles)} tiles at {args.size}px')
        # the backdrop that goes with them: board.png with the inset frame redrawn to match
        url = f'http://127.0.0.1:{port}/scripts/rips-tiles/tiles.html?export=board'
        dom = subprocess.run(
            [args.chrome, '--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', url],
            capture_output=True, text=True, check=True,
        ).stdout
        m = re.search(r'<pre id="export">(\{.*?\})</pre>', dom, re.S)
        if not m:
            raise SystemExit('board: no export block in the page')
        data_url = json.loads(html.unescape(m.group(1)))['board_tiles']
        with open(os.path.join(ROOT, 'public', 'images', 'rips_board', 'board_tiles.png'), 'wb') as f:
            f.write(base64.b64decode(data_url.split(',', 1)[1]))
        print('board: rips_board/board_tiles.png')
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
