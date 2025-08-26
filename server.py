#!/usr/bin/env python3
"""
Simple HTTP server for testing the Carcleaning010 website locally
Run with: python server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Custom logging to show only successful requests
        if not args[1].startswith('404'):
            super().log_message(format, *args)

def main():
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("=" * 60)
    print("Carcleaning010 Website Server")
    print("=" * 60)
    print(f"Serving files from: {script_dir}")
    print(f"Local URL: http://localhost:{PORT}/")
    print("=" * 60)
    print("Available pages:")
    print(f"  * Home: http://localhost:{PORT}/")
    print(f"  * Over Ons: http://localhost:{PORT}/over-ons.html")
    print(f"  * Op Locatie: http://localhost:{PORT}/op-locatie.html") 
    print(f"  * Diensten: http://localhost:{PORT}/diensten.html")
    print(f"  * Projecten: http://localhost:{PORT}/projecten.html")
    print(f"  * Contact: http://localhost:{PORT}/contact.html")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    # Check if required files exist
    required_files = ['index.html', 'styles.css', 'script.js']
    missing_files = [f for f in required_files if not Path(f).exists()]
    
    if missing_files:
        print(f"ERROR: Missing files: {', '.join(missing_files)}")
        input("Press Enter to exit...")
        sys.exit(1)
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("Server started successfully!")
            print()
            
            # Open browser automatically after a short delay
            try:
                import threading
                import time
                def open_browser():
                    time.sleep(1.5)  # Wait for server to fully start
                    webbrowser.open(f'http://localhost:{PORT}')
                
                threading.Thread(target=open_browser, daemon=True).start()
                print("Opening browser automatically...")
            except Exception as e:
                print(f"Could not auto-open browser: {e}")
                print(f"Please manually open: http://localhost:{PORT}")
            
            httpd.serve_forever()
            
    except OSError as e:
        if "already in use" in str(e).lower():
            print(f"ERROR: Port {PORT} is already in use!")
            print("Solutions:")
            print("  * Close other servers running on this port")
            print("  * Wait a moment and try again")
            print("  * Use a different port: python -m http.server 8001")
        else:
            print(f"Server error: {e}")
        input("Press Enter to exit...")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("Server stopped by user")
        print("Thank you for testing Carcleaning010 website!")
        print("=" * 60)
        httpd.shutdown()

if __name__ == "__main__":
    main()