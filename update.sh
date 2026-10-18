#!/usr/bin/env bash
# The live copy on cPanel runs the `deploy` branch, which GitHub builds and tests after every push to main.
# This copy of update.sh only exists for checkouts still on main (the old setup): it switches them to `deploy`
# once, then runs deploy's own update.sh. Usage stays: bash ~/repositories/uniform/update.sh
set -euo pipefail

# Everything runs inside main so bash has read the whole file before git replaces it.
main(){
 local app
 app="$(cd "$(dirname "$0")" && pwd)"
 cd "$app"
 if [ "$(git rev-parse --abbrev-ref HEAD)" != "deploy" ]; then
  echo "One-time switch to the version GitHub builds (deploy branch)..."
  git fetch origin deploy
  # Local edits here are only npm's package-lock changes; the old build folder is replaced by the deploy branch's.
  git checkout -- .
  rm -rf dist
  git checkout -B deploy --track origin/deploy
 fi
 exec bash "$app/update.sh"
}
main "$@"
exit
