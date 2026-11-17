#!/usr/bin/env python3
"""The game on http://localhost:8777, with caching turned off so a reload always shows the latest files.

    python3 tools/serve.py [port]
"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        # Never answer "304 Not Modified": drop the headers a browser uses to ask for one.
        for name in ("If-Modified-Since", "If-None-Match"):
            del self.headers[name]
        return super().send_head()


root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
print(f"Lågan on http://localhost:{port} (no caching)")
http.server.ThreadingHTTPServer(("", port), functools.partial(NoCache, directory=root)).serve_forever()
