#!/bin/bash
echo "Starting Carcleaning010 Website..."
echo ""
cd "$(dirname "$0")"
echo "Opening website at http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Try to open browser
if command -v open &> /dev/null; then
    open http://localhost:8000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000
elif command -v start &> /dev/null; then
    start http://localhost:8000
fi

python3 -m http.server 8000 || python -m http.server 8000