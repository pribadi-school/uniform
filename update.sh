#!/usr/bin/env bash
# Live update on cPanel: download the version GitHub already built and tested, then restart.
# Usage: bash ~/repositories/uniform/update.sh   (stock data in ~/seragam-data is never touched)
set -euo pipefail

# Everything runs inside main so bash has read the whole file before `git pull` can replace it.
main(){
 local app
 app="$(cd "$(dirname "$0")" && pwd)"
 cd "$app"
 echo "1/2 Downloading the new version..."
 git pull --ff-only
 echo "2/2 Restarting..."
 mkdir -p tmp && touch tmp/restart.txt
 # Stop the running copy so the next visit starts the new code.
 pkill -f "lsnode:$app" || true
 echo "Done. The new version loads on the next visit. Data in ~/seragam-data was not touched."
}
main "$@"
exit
