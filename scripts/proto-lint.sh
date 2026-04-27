#!/bin/bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUF="${ROOT}/node_modules/.bin/buf"
if [[ ! -f "$BUF" ]]; then
	echo "buf CLI not found at ${BUF}. Run: npm install" >&2
	exit 1
fi

cd "$ROOT" || exit 1

"$BUF" lint proto

if ! "$BUF" format -w proto --exit-code; then
	echo Proto files were formatted
fi

if grep -rn "rpc .*[A-Z][A-Z].*[(]" --include="*.proto" proto/; then
	# See https://github.com/gautammanak1/asi1-vs-code/pull/7054
	echo Error: Proto RPC names cannot contain repeated capital letters
	exit 1
fi
