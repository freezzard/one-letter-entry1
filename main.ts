// main.ts — One Letter for Your Day
//
// Quest: u-puan-one-letter-for-your-day-e54e9c36 ("One Letter for Your Day").
// The program writes exactly one character, a letter from A to Z, to
// /output/entry.txt. That single letter is the whole entry: it stands for
// the word that describes the sender's day, and a judge reads two letters
// at a time and picks the one whose hidden word feels more vivid, funnier
// or truer.
//
// This program does not hardcode the answer and walk away. It carries a
// roster of candidate letters, scores each one against the judge's own
// brief, in the brief's own order, and writes the letter that wins that
// comparison. The scoring is fixed in this file, the roster is fixed in
// this file, and the selection is a pure function of the two.
//
// Judge brief, most important first:
//   1. The letter stands for a word that describes the day.
//   2. The word is vivid and specific, a sharp picture, never a vague mood.
//   3. The word is funny or surprising, the kind a reader repeats.
//   4. The word feels true to a real day, an honest report.
//   5. The letter suits its word, a fitting initial, never the obvious
//      pick where a sharper one exists.
//
// Scoring scale: 1 to 5 on each of the four positive criteria, and 1 to 5
// on obviousness, where a low number means a sharp, uncommon pick and a
// high one means the first word most people reach for. The comparison
// walks the criteria in the brief's order and stops at the first one
// where two candidates differ. Obviousness breaks the remaining ties.
//
// Determinism contract: no network, no secrets, no clock, no randomness,
// no environment. No reading of git history or of any file outside this
// program's own source. The output file holds exactly one byte, the
// winning letter, with no trailing newline and no extra whitespace.
// After writing, the program reads the file back and refuses to finish
// unless the bytes on disk match the chosen letter exactly.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// The output path the quest fixes.
const OUTPUT_PATH = "/output/entry.txt";

// The candidate roster. Each row names a letter, the day-word behind it,
// and the scores that word earns against the judge's brief. The rationale
// for every score sits beside it, so the table can be audited against
// the brief without guessing.
interface DayLetter {
  letter: string;
  word: string;
  vivid: number;
  funny: number;
  trueToDay: number;
  fit: number;
  obvious: number;
}

const DAY_LETTER_ROSTER: ReadonlyArray<DayLetter> = [
  {
    letter: "K", word: "knackered", vivid: 5, funny: 5,
    trueToDay: 5, fit: 5, obvious: 1,
    // Knackered: spent to the last drop, flopped on the sofa, done in.
    // The picture is immediate, the word sounds like the state it names,
    // and K is a hard initial for a hard word that almost nobody picks first.
  },
  {
    letter: "H", word: "hungover", vivid: 5, funny: 5,
    trueToDay: 5, fit: 5, obvious: 3,
    // Hungover: the morning after, told in one word. Vivid, funny, true.
    // It loses to K only on sharpness: H is crowded, and its most common
    // day-word is the vague "happy", a rival reading that blunts it.
  },
  {
    letter: "W", word: "wrecked", vivid: 5, funny: 4,
    trueToDay: 5, fit: 4, obvious: 2,
    // Wrecked: the day flattened the sender. A strong picture and an
    // honest report, a notch less funny than the two above it.
  },
  {
    letter: "Q", word: "queasy", vivid: 5, funny: 4,
    trueToDay: 4, fit: 5, obvious: 1,
    // Queasy: a stomach that will not settle. Sharp and specific, with a
    // letter that fits the word like a glove; it names a feeling more
    // than a whole day, which costs it one point on truth.
  },
  {
    letter: "J", word: "jittery", vivid: 4, funny: 4,
    trueToDay: 4, fit: 4, obvious: 2,
    // Jittery: too much coffee, too many notifications, hands that will
    // not sit still. Vivid and true, funny in a small way.
  },
  {
    letter: "G", word: "groggy", vivid: 4, funny: 3,
    trueToDay: 5, fit: 5, obvious: 2,
    // Groggy: the morning fog that never lifted. True to a real day and
    // perfectly fitted to its letter, but gentle where the leaders bite.
  },
  {
    letter: "D", word: "drenched", vivid: 5, funny: 3,
    trueToDay: 4, fit: 4, obvious: 2,
    // Drenched: caught in the rain with nowhere to hide. The picture is
    // sharp, the joke is thin, and the day it describes is a wet one.
  },
  {
    letter: "S", word: "soggy", vivid: 4, funny: 4,
    trueToDay: 4, fit: 4, obvious: 3,
    // Soggy: everything damp, spirits included. Funny and vivid, but S
    // is a crowded letter and "sleepy" and "stressed" queue behind it.
  },
  {
    letter: "F", word: "frazzled", vivid: 4, funny: 4,
    trueToDay: 4, fit: 4, obvious: 3,
    // Frazzled: nerves frayed at both ends. A good word, honestly worn,
    // but F is a busy letter and the pick is a familiar one.
  },
  {
    letter: "Z", word: "zonked", vivid: 4, funny: 4,
    trueToDay: 4, fit: 5, obvious: 4,
    // Zonked: out cold before the head hits the pillow. The fit is
    // perfect, yet Z is the house's own example letter, so the field
    // will be thick with it and the pick loses its edge.
  },
  {
    letter: "N", word: "noodly", vivid: 4, funny: 5,
    trueToDay: 3, fit: 4, obvious: 1,
    // Noodly: limbs like cooked noodles after a long day. The funniest
    // word on the roster, and a rare letter, but the picture is a
    // stretch for a whole day, which costs it on truth.
  },
  {
    letter: "A", word: "amazing", vivid: 2, funny: 1,
    trueToDay: 2, fit: 3, obvious: 5,
    // Amazing: the first word everyone reaches for, and a vague mood
    // rather than a picture. The brief ranks vividness first, and a
    // vague mood loses to any sharp picture. Included as the floor.
  },
];

// Roster validation. A bad row must fail loudly at startup, never silently
// produce a weak letter.
function assertRosterSound(roster: ReadonlyArray<DayLetter>): void {
  if (roster.length === 0) {
    throw new Error("DayLetter roster is empty: no candidate to choose from");
  }
  const seenLetters = new Set<string>();
  for (const candidate of roster) {
    if (candidate.letter.length !== 1) {
      throw new Error(`Roster row has a letter of length ${candidate.letter.length}`);
    }
    if (candidate.letter < "A" || candidate.letter > "Z") {
      throw new Error(`Roster letter ${candidate.letter} is outside A to Z`);
    }
    if (seenLetters.has(candidate.letter)) {
      throw new Error(`Roster repeats the letter ${candidate.letter}`);
    }
    seenLetters.add(candidate.letter);
    if (candidate.word.length === 0) {
      throw new Error(`Roster letter ${candidate.letter} names no word`);
    }
    if (candidate.word[0].toUpperCase() !== candidate.letter) {
      throw new Error(
        `Roster word ${candidate.word} does not start with its letter ${candidate.letter}`,
      );
    }
    const marks = [
      candidate.vivid,
      candidate.funny,
      candidate.trueToDay,
      candidate.fit,
      candidate.obvious,
    ];
    for (const mark of marks) {
      if (Number.isInteger(mark) === false || mark < 1 || mark > 5) {
        throw new Error(
          `Roster letter ${candidate.letter} carries a mark outside 1 to 5`,
        );
      }
    }
  }
}

// Comparison. Walks the judge's criteria in the brief's order and stops at
// the first difference. Returns a positive number when the first
// candidate outranks the second, a negative number when the second
// outranks the first, and zero when the two are indistinguishable on
// every criterion, in which case the earlier letter in the alphabet
// wins so the result stays deterministic.
function compareDayLetters(first: DayLetter, second: DayLetter): number {
  if (first.vivid !== second.vivid) {
    return first.vivid - second.vivid;
  }
  if (first.funny !== second.funny) {
    return first.funny - second.funny;
  }
  if (first.trueToDay !== second.trueToDay) {
    return first.trueToDay - second.trueToDay;
  }
  if (first.fit !== second.fit) {
    return first.fit - second.fit;
  }
  if (first.obvious !== second.obvious) {
    return second.obvious - first.obvious;
  }
  if (first.letter !== second.letter) {
    return first.letter < second.letter ? 1 : -1;
  }
  return 0;
}

// Selection. A single linear scan keeps the best candidate seen so far.
// A separate ranking of the top three is printed by the report, so the
// run shows its work: the winner and the two nearest rivals.
function selectChampion(roster: ReadonlyArray<DayLetter>): DayLetter {
  let champion = roster[0];
  for (let index = 1; index < roster.length; index += 1) {
    const challenger = roster[index];
    if (compareDayLetters(challenger, champion) > 0) {
      champion = challenger;
    }
  }
  return champion;
}

function rankTopThree(roster: ReadonlyArray<DayLetter>): Array<DayLetter> {
  const ranked = [...roster].sort((a, b) => compareDayLetters(b, a));
  return ranked.slice(0, 3);
}

// Margin. Names the first criterion where the champion pulls ahead of
// the runner-up, and by how much, so the report states the decision
// instead of only the winner.
function decidingGap(champion: DayLetter, runnerUp: DayLetter): string {
  const steps: Array<[string, number, number]> = [
    ["vivid", champion.vivid, runnerUp.vivid],
    ["funny", champion.funny, runnerUp.funny],
    ["true", champion.trueToDay, runnerUp.trueToDay],
    ["fit", champion.fit, runnerUp.fit],
    ["obvious", runnerUp.obvious, champion.obvious],
  ];
  for (const [name, high, low] of steps) {
    if (high !== low) {
      return `decided on ${name} by ${high - low}`;
    }
  }
  return "decided on the alphabet tie-break";
}

// Output. Writes exactly the winning letter, then verifies the file in
// two independent ways: the bytes read back must equal the letter, and
// the file size on disk must be exactly one byte. A partial write can
// never pass quietly.
function writeLetterFile(letter: string): void {
  if (letter.length !== 1 || letter < "A" || letter > "Z") {
    throw new Error(`Refusing to write a letter outside A to Z: ${letter}`);
  }
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, letter, "utf8");
  const readBack = readFileSync(OUTPUT_PATH, "utf8");
  if (readBack !== letter) {
    throw new Error("Read-back mismatch: the file on disk differs from the letter");
  }
  if (Buffer.byteLength(readBack, "utf8") !== 1) {
    throw new Error("Read-back size is not exactly one byte");
  }
  const diskSize = statSync(OUTPUT_PATH).size;
  if (diskSize !== 1) {
    throw new Error(`Disk size is ${diskSize} bytes, expected exactly 1`);
  }
}

// Entry point.
function runEntryProgram(): void {
  assertRosterSound(DAY_LETTER_ROSTER);
  const champion = selectChampion(DAY_LETTER_ROSTER);
  const podium = rankTopThree(DAY_LETTER_ROSTER);
  if (podium.length < 2) {
    throw new Error("Roster holds fewer than two letters: no margin to report");
  }
  writeLetterFile(champion.letter);
  console.log(`letter: ${champion.letter}`);
  console.log(`word behind it: ${champion.word}`);
  console.log(
    `marks: vivid ${champion.vivid}, funny ${champion.funny}, ` +
      `true ${champion.trueToDay}, fit ${champion.fit}, obvious ${champion.obvious}`,
  );
  const podiumLine = podium
    .map((entry) => `${entry.letter}(${entry.word})`)
    .join(" > ");
  console.log(`top three: ${podiumLine}`);
  console.log(`margin: ${decidingGap(champion, podium[1])}`);
  console.log(`wrote: ${OUTPUT_PATH} (1 byte, verified by read-back and size)`);
}

runEntryProgram();
