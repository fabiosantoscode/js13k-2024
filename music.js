let audioCtx = new AudioContext();

let drumTempo = (60_000 / (120 * 2)) / 2;

// A register to avoid Terser writing 'let' sometimes
let UNUSED_VAR;

let DRUM_VOLUME_MOD = 0.075;

let range = n => Array.from({ length: n })

let trimSplit = s => {
  return s.trim().split(/\s+/g)
}
let notes_names = trimSplit('_ c c# d d# e f f# g g# a a# b')
let getNoteFreq = (note, octave) => {
  note = notes_names.indexOf(note);
  return note && 32.7 * (2 ** (1/12)) ** ((note - 1) + (octave * 12));
};

let setValue = (thing, value) => {
  thing.value = value;
};

let instrument = (volume, waveShape) => {
  let oscillator = audioCtx.createOscillator();
  let gainNode = audioCtx.createGain();
  let frequency = oscillator.frequency;
  let gain = gainNode.gain;

  setValue(frequency, 0);
  setValue(gain, Math.log2(1 + 0.025 * volume));
  oscillator.type = waveShape;
  oscillator.start();
  oscillator.connect(gainNode).connect(audioCtx.destination);
  return [frequency, gain];
};

let playTabs = async (tabs) => {
  while (1) {
    for (let [tab, delay] of tabs) {
      sleep(delay).then(() => tab.next())
    }
    await sleep(drumTempo, 0);
  }
}

const drumWavePlan = async (plan, freqStart, freqEnd, frequency, gain, mod) => {
  for (UNUSED_VAR of plan) {
    setValue(frequency, lerp(freqStart, freqEnd, UNUSED_VAR[0]) * mod)
    setValue(gain, (UNUSED_VAR[1] || UNUSED_VAR[0]) * DRUM_VOLUME_MOD)
    await sleep(10)
  }
}

function* tabPlayer([frequency, gain], tempo, mod, tab) {
  for (;;) for (UNUSED_VAR of trimSplit(tab)) {
    let [,note, octave, count = 1] = UNUSED_VAR.match(/^(\w#?|_)(\d?)x?(\d+)?$/)
    if (note === 'x') {
      drumWavePlan([
        [1],
        [.75, .7],
        [.75, .7],
        [.7],
        [.57, .6],
        [.27, .6],
        [.17, .5],
        [.1, .4],
        [.1, .2],
        [0],
      ], 111, 255, frequency, gain, mod)
    } else if (note === 'o') {
      drumWavePlan([
        [.4],
        [.8],
        [1],
        [.75, .7],
        [.7],
        [.57, .6],
        [.27, .6],
        [.17, .5],
        [.1, .4],
        [.1, .2],
        [0],
      ], 15, 70, frequency, gain, mod)
    } else {
      let freq = getNoteFreq(note, octave);
      setValue(frequency, freq * mod);
    }

    for (UNUSED_VAR of range(tempo * count)) yield; 
  }
}

// Tab format:
// whitespace is irrelevant
// pauses: _x4 (pause 4x); _ (pause 1x)
// notes:  f#x2 (play f# 2x); f# (play f# 1x)
let motif = 'a3x4 c4x4 b3x4 a#3x4';
let response = 'a3x2 _ a3';

/*
// mechanical turk fight music
let tab =
`${motif} ${response} _x4 ${response} _x4
a3x4 c4x4 d#4x4 g3x4 ${response} _x4 ${response} _x4
${motif} ${response} _x4 ${response} _x4
a3x2 b3x2 c4x2 d4x2 e4x2 d4x2 g4x2 g3x2 a3x2 _ a3 _x4 ${response} _x4
${motif} ${motif}
a4 g4 f4 e4 f4 e4 d4 c4 b3 a3 g3 a3 b3 c4 g3 _ a3x8 ${response} _x4`;
let drumTab = `x _ o _ x _ o _ x _ o _ x x o _`
playTabs([
  [tabPlayer(instrument(0.3, 'square'), 2, 1, tab), 0],
  [tabPlayer(instrument(0.3), 2, 2, tab), 34],
  [tabPlayer(instrument(0.0, 'square'), 1, 1, drumTab), 34],
])
*/


// mechanical turk cafe music
let tab = ''
+ `_x2 _x2 d3x2 d3x2 e3x2 f3x2 d3x2 a3x6 d3x2 d3x2 e3x2 f3x2 d3x2 _x2 d3x4 d3x4 e3x2 f3x2 d3x2 a3x6 d3x2 e3x2 f3x2 d3x2 e3x2 _x2 `
+ `d3x3 c3x3 a2x2 d3x3 c3x3 a2x2 d3x3 c3x3 a2x2 d3x3 c3x3 c#3x2 d3x13 _x19 `
+ `d4x2 a3x2 d4x2 a3x2 d4x2 a3x2 d4x2 a3x2 c4x2 g3x2 c4x2 g3x2 c4x2 g3x2 c4x2 g3x2 b3x2 f#3x2 b3x2 f#3x2 b3x2 f#3x2 b3x2 g3x2 a3x8 _ _ a3 _ a3 _ a3 _ `
+ `d4x2 a3x2 d4x2 a3x2 d4x2 a3x2 d4x2 a3x2 c4x2 g3x2 c4x2 g3x2 c4x2 g3x2 f4x2 c#4x2 d4x2 a3x2 d4x2 a3x2 d4x2 a3x2 d4x2 c4x2 d4x8 _ _ d4 _ d4 _ d4 _`;
let tab2 = ''
+ `_x14 a2x6 _x12 d2x4 _x10 a2x6 _x12 `
+ `d4x2 _ d4x2 _ d4x2 c4x2 _ c4x2 _ c4x2 b3x2 _ b3x2 _ b3x2 a3x2 _ a3x2 _ a3x2 d4x13 _x19 `
+ `_x48 a2x8 _ _ a2 _ a2 _ a2 _ `
+ `_x48 d3x8 _ _ d3 _ d3 _ d3 _`;
let drumTab = `o o o x _ o o x _ o o x x _ x _`
playTabs([

  [tabPlayer(instrument(0.3, 'square'), 1, 1, tab), 34],
  [tabPlayer(instrument(0.3), 1, 2, tab), 64],
  [tabPlayer(instrument(0.1, 'sawtooth'), 1, 2, tab), 16],

  [tabPlayer(instrument(0.15, 'sawtooth'), 1, 4, tab2), 34],
  [tabPlayer(instrument(0.3), 1, 1, tab2), 64],

  [tabPlayer(instrument(0.0, 'square'), 2, 1, drumTab), 36],
])

