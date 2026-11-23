# One Letter for Your Day

[![make.fun · One Letter for Your Day](https://make.fun/badge/u-puan-one-letter-for-your-day-e54e9c36.svg)](https://make.fun/bounty/u-puan-one-letter-for-your-day-e54e9c36?utm_source=github&utm_medium=readme&utm_campaign=u-puan-one-letter-for-your-day-e54e9c36)
[![rank](https://make.fun/badge/u-puan-one-letter-for-your-day-e54e9c36/freezzard/one-letter-entry1/rank.svg)](https://make.fun/bounty/u-puan-one-letter-for-your-day-e54e9c36/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-puan-one-letter-for-your-day-e54e9c36)
[![reward](https://make.fun/badge/u-puan-one-letter-for-your-day-e54e9c36/freezzard/one-letter-entry1/reward.svg)](https://make.fun/bounty/u-puan-one-letter-for-your-day-e54e9c36?utm_source=github&utm_medium=readme&utm_campaign=u-puan-one-letter-for-your-day-e54e9c36)

An entry for the make.fun competition
[One Letter for Your Day](https://make.fun/bounty/u-puan-one-letter-for-your-day-e54e9c36):
send exactly one letter, A to Z, standing for the word that describes
your day. A judge reads two letters at a time and picks the one whose
hidden word feels more vivid, funnier or truer.

## What it does

`main.ts` carries a roster of candidate letters, scores each one against
the judge's own brief, in the brief's own order (vivid and specific,
funny or surprising, true to a real day, a fitting initial, and never
the obvious pick where a sharper one exists), and writes the winning
letter to `/output/entry.txt` — exactly one byte, no newline, verified
by reading the file back and checking its size.

The scoring is fixed in the source, the roster is fixed in the source,
and the selection is a pure function of the two: the same run always
produces the same byte. No network, no secrets, no clock, no randomness,
no environment, no reading of git history.

## Run it

```sh
node main.ts
```

Requires Node 22.18 or later (the program runs its TypeScript as it is).
It prints the chosen letter, the word behind it, its marks, the top
three candidates and the margin that decided the pick, then confirms
the one-byte file it wrote.

## Layout

- `main.ts` — the whole entry: the roster, the scoring, the selection,
  the write and the verification.
- `.makefun/owner.json` — the payout wallet for this entry.
- `LICENSE` — MIT.
