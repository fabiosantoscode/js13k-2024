// Multi-phase rendering. Some things take a while to render. I'm not optimizing them. Instead I'll render them less often.
let multi_phase_canvases = [
  new OffscreenCanvas(canvasWidth, canvasHeight),
  new OffscreenCanvas(canvasWidth, canvasHeight),
]

let PHASE_SKY = 0
let PHASE_ABYSS = 1

let multi_phase_ctx = phase => multi_phase_canvases[phase].getContext('2d')

let current_phase = 0
let drawMultiPhase = () => {
  current_phase = +!current_phase
}

let if_multiphase_draw = (phase_no, cb) => {
  // cb(ctx); return // uncomment to remove optimization
  if (phase_no === current_phase) {
    let old_ctx = ctx
    ctx = multi_phase_canvases[phase_no].getContext('2d')
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    cb()
    ctx = old_ctx
  }

  ctx.drawImage(multi_phase_canvases[phase_no], 0, 0)
}
