#!/usr/bin/env python3
import os
import sys
import time
import socket
import subprocess
import argparse
import base64
import http.server
import socketserver
import threading

def get_latest_mtime(directory):
    latest = 0
    for root, _, files in os.walk(directory):
        for f in files:
            path = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(path)
                if mtime > latest:
                    latest = mtime
            except OSError:
                pass
    return latest

def check_and_build():
    dist_dir = "dist"
    src_dir = "src"
    
    needs_build = False
    if not os.path.exists(dist_dir) or not os.path.exists(os.path.join(dist_dir, "index.html")):
        needs_build = True
        print("Build output (dist/) not found. Rebuilding...")
    else:
        src_mtime = get_latest_mtime(src_dir)
        dist_mtime = os.path.getmtime(os.path.join(dist_dir, "index.html"))
        if src_mtime > dist_mtime:
            needs_build = True
            print("Source files modified since last build. Rebuilding...")
            
    if needs_build:
        print("Running 'npm run build'...")
        res = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
        if res.returncode != 0:
            print("Error: Build failed!")
            print(res.stderr)
            sys.exit(1)
        print("Build completed successfully.")
    else:
        print("Build output (dist/) is up-to-date. Skipping rebuild.")

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

class SilentHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress server logs to keep console clean
        pass

def run_static_server(port):
    class Handler(SilentHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory="dist", **kwargs)
            
    server = socketserver.TCPServer(("127.0.0.1", port), Handler)
    
    # Start server in thread
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    return server

def generate_card(port, card_type, card_format, variation, output_path):
    from playwright.sync_api import sync_playwright
    
    url = f"http://localhost:{port}/?test_card={card_type}&format={card_format}&variation={variation}"
    print(f"Generating {card_type} ({card_format}, variation={variation}) -> {output_path}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Determine viewport size based on card format to match target high-res output
        vw, vh = 1080, 1080
        if card_format == "story":
            vw, vh = 1080, 1920
        elif card_format == "portrait":
            vw, vh = 1080, 1440

        page = browser.new_page(viewport={"width": vw, "height": vh})
        page.goto(url)
        
        # Wait for either the HTML card or fallback canvas to load
        has_html_card = False
        try:
            page.wait_for_selector("#obsidian-card-capture", timeout=5000)
            has_html_card = True
            print("Found HTML card element (#obsidian-card-capture).")
        except Exception:
            page.wait_for_selector("canvas", timeout=15000)
            print("Found Canvas element fallback.")
        
        # Wait a little longer for fonts and images to render completely
        print("Waiting for fonts & images to render...")
        time.sleep(3.5)
        
        if has_html_card:
            # Capture the page directly since the viewport matches the card format exactly
            img_bytes = page.screenshot(animations="disabled")
        else:
            # Extract the exact-resolution PNG directly from the canvas element
            data_url = page.evaluate("document.querySelector('canvas').toDataURL('image/png')")
            if "," in data_url:
                base64_data = data_url.split(",")[1]
            else:
                base64_data = data_url
            img_bytes = base64.b64decode(base64_data)
        
        # Save output image
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(img_bytes)
            
        print(f"✅ Success! Captured screenshot saved to {output_path} ({len(img_bytes)} bytes)")
        browser.close()

def main():
    parser = argparse.ArgumentParser(description="Render FitAI Share Cards to PNG statically")
    parser.add_argument("--type", choices=["day", "meal", "recipe"], default="day", help="Card type to render")
    parser.add_argument("--format", choices=["story", "portrait", "square"], default="story", help="Card format")
    parser.add_argument("--variation", type=int, default=0, help="Variation index")
    parser.add_argument("--output", default="card_samples/day_obsidian_metrics_3_4.png", help="Output PNG path")
    args = parser.parse_args()

    # 1. Build the production files if necessary
    check_and_build()
    
    # 2. Find a free port and spin up the Python static server
    port = find_free_port()
    server = run_static_server(port)
    
    try:
        # 3. Use Playwright to capture the canvas
        generate_card(port, args.type, args.format, args.variation, args.output)
    finally:
        # 4. Clean shutdown of the server
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    main()
