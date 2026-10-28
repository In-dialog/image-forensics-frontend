#!/bin/bash
set -euo pipefail

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
runtime_directory="$project_directory/.runtime"
action="${1:-install}"
if [ "$#" -gt 0 ]; then shift; fi
dry_run=0
preflight=0
pause_at_end=1
no_browser=0
temporary_directory=""

for option in "$@"; do
  case "$option" in
    --dry-run) dry_run=1 ;;
    --preflight) preflight=1 ;;
    --no-pause) pause_at_end=0 ;;
    --no-browser) no_browser=1 ;;
    *) printf 'Unknown option: %s\n' "$option" >&2; exit 1 ;;
  esac
done
case "$action" in install|start) ;; *) printf 'Choose install or start.\n' >&2; exit 1 ;; esac

assert_private_runtime() {
  for directory in "$runtime_directory" "$runtime_directory/node" "$runtime_directory/npm-cache"; do
    if [ -L "$directory" ] || { [ -e "$directory" ] && [ ! -d "$directory" ]; }; then
      printf 'Unsafe runtime location: %s must be an ordinary directory, not a link or file. Its contents were not changed.\n' "$directory" >&2
      return 1
    fi
  done
}

finish() {
  result_code=$?
  if [ -n "$temporary_directory" ] && [ -d "$temporary_directory" ]; then
    case "$temporary_directory" in
      "$runtime_directory"/download-*)
        if assert_private_runtime && [ ! -L "$temporary_directory" ] && [ "$(dirname "$temporary_directory")" = "$runtime_directory" ]; then
          rm -rf -- "$temporary_directory"
        else
          printf 'Temporary files were left untouched because the runtime location changed.\n' >&2
        fi ;;
      *) printf 'Unexpected temporary directory; leaving it untouched.\n' >&2 ;;
    esac
  fi
  if [ "$result_code" -ne 0 ]; then
    printf '\nSETUP STOPPED. Read the message above, fix it, then open Install again.\n' >&2
  fi
  if [ "$pause_at_end" -eq 1 ] && [ "$dry_run" -eq 0 ] && [ "$preflight" -eq 0 ] && [ -t 0 ]; then
    printf '\nPress Enter to close this window.'
    read -r _reply || true
  fi
}
trap finish EXIT

assert_private_runtime
printf '\nIMAGE FORENSICS ANALYSIS - WEBSITE\nFolder: %s\n' "$project_directory"
if [ "$(uname -s)" != Darwin ]; then printf 'Use this launcher on macOS. On Windows, open Install.cmd.\n' >&2; exit 1; fi
architecture="$(uname -m)"
if [ "$architecture" = x86_64 ] && [ "$(sysctl -in sysctl.proc_translated 2>/dev/null || true)" = 1 ]; then architecture=arm64; fi
case "$architecture" in x86_64) architecture=x64 ;; arm64) ;; *) printf 'A 64-bit Intel or Apple Silicon Mac is required.\n' >&2; exit 1 ;; esac
os_version="$(sw_vers -productVersion)"
os_major="${os_version%%.*}"
os_minor="${os_version#*.}"
os_minor="${os_minor%%.*}"
if [ "$os_major" -lt 13 ] || { [ "$os_major" -eq 13 ] && [ "$os_minor" -lt 5 ]; }; then
  printf 'macOS 13.5 or newer is required. Update macOS before installing.\n' >&2; exit 1
fi
printf 'Computer: macOS %s (%s)\n' "$os_version" "$architecture"
free_kb="$(df -Pk "$project_directory" | awk 'NR==2 {print $4}')"
printf 'Free disk: %s GB (allow at least 4 GB for installation)\n' "$((free_kb / 1048576))"

test_runtime() {
  [ -x "$1" ] || return 1
  "$1" -e "const fs=require('fs'),p=require('path');const d=p.dirname(process.execPath);process.exit(process.versions.node.split('.')[0]==='24'&&fs.existsSync(p.join(d,'../lib/node_modules/npm/bin/npm-cli.js'))?0:1)" >/dev/null 2>&1
}
node_executable="$runtime_directory/node/bin/node"
if ! test_runtime "$node_executable"; then
  node_executable="$(command -v node || true)"
  if ! test_runtime "$node_executable"; then node_executable=""; fi
fi
if [ "$dry_run" -eq 1 ] || [ "$preflight" -eq 1 ]; then
  printf '\nOFFLINE CHECK: no files changed, downloads, installations, or server starts.\n'
  if [ -n "$node_executable" ]; then printf 'Node.js 24 with npm: %s\n' "$node_executable"
  else printf 'Node.js 24 will be downloaded from https://nodejs.org, checksum-verified, and kept in .runtime/node.\n'; fi
  if [ "$action" = install ]; then
    printf '1. Prepare Node.js 24 if needed (no administrator or Git required).\n2. Install exact package-lock.json dependencies with npm ci.\n3. Preserve saved data and local settings; build the local website.\n4. Open Start.command when ready. Backend and AI models install separately.\n'
  else printf 'Would start the installed website at http://127.0.0.1:3100.\n'; fi
  if [ "$free_kb" -lt 4194304 ]; then printf 'Not enough disk space: move this folder to a drive with at least 4 GB free.\n'; fi
  exit 0
fi

if [ -z "$node_executable" ]; then
  if [ "$action" = start ]; then printf 'The website runtime is not installed. Open Install.command first.\n' >&2; exit 1; fi
  if [ "$free_kb" -lt 4194304 ]; then printf 'At least 4 GB free space is required. Move this folder to another drive.\n' >&2; exit 1; fi
  printf '[Runtime] Downloading Node.js 24 LTS for this Mac. No system installation is needed.\n'
  assert_private_runtime
  mkdir -p "$runtime_directory"
  temporary_directory="$(mktemp -d "$runtime_directory/download-XXXXXXXX")"
  curl --fail --location --proto '=https' --tlsv1.2 --retry 2 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -o "$temporary_directory/SHASUMS256.txt"
  archive_name="$(awk -v platform="darwin-$architecture" '$2 ~ ("^node-v24\\.[0-9]+\\.[0-9]+-" platform "\\.tar\\.gz$") {print $2}' "$temporary_directory/SHASUMS256.txt")"
  if [ -z "$archive_name" ] || [ "$(printf '%s\n' "$archive_name" | wc -l | tr -d ' ')" != 1 ]; then
    printf 'Could not identify one official Node.js archive for this Mac.\n' >&2; exit 1
  fi
  release_version="${archive_name#node-}"
  release_version="${release_version%-darwin-*}"
  curl --fail --location --proto '=https' --tlsv1.2 --retry 2 "https://nodejs.org/dist/$release_version/$archive_name" -o "$temporary_directory/$archive_name"
  expected_hash="$(awk -v filename="$archive_name" '$2 == filename {print $1}' "$temporary_directory/SHASUMS256.txt")"
  actual_hash="$(shasum -a 256 "$temporary_directory/$archive_name" | awk '{print $1}')"
  if [ "$expected_hash" != "$actual_hash" ]; then printf 'The Node.js download did not pass its checksum. Nothing was installed. Try Install again.\n' >&2; exit 1; fi
  printf '[Runtime] Checksum verified. Preparing the private runtime.\n'
  tar -xzf "$temporary_directory/$archive_name" -C "$temporary_directory"
  expanded="$temporary_directory/${archive_name%.tar.gz}"
  if ! test_runtime "$expanded/bin/node"; then printf 'The downloaded runtime could not run on this Mac.\n' >&2; exit 1; fi
  assert_private_runtime
  if [ -e "$runtime_directory/node" ]; then rm -rf -- "$runtime_directory/node"; fi
  mv "$expanded" "$runtime_directory/node"
  node_executable="$runtime_directory/node/bin/node"
fi
if [ "$no_browser" -eq 1 ]; then
  "$node_executable" "$project_directory/install/setup.mjs" "$action" --no-browser
else
  "$node_executable" "$project_directory/install/setup.mjs" "$action"
fi
