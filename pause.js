// Pause loop

let currently_paused = 0
let pause_cumulative_time = 0
let on_unpause = []

let set_paused = (should_pause) => {
  if (!should_pause && currently_paused) {
    let total = Date.now() - currently_paused
    pause_cumulative_time += total
    currently_paused = 0
    for (let cb of on_unpause) {
      setTimeout_native(cb)
    }
    on_unpause = []
  } else if (should_pause && !currently_paused) {
    if (self.env !== 'production') {
      console.assert(on_unpause.length == 0)
    }
    currently_paused = Date.now()
    on_unpause = []
  }
}

let pause_loop = () => {
  if (keys.Escape) {
    keys.Escape = 0
    set_paused(!currently_paused)
  }
  if (!currently_paused) return false; // go to main loop instead

  update_pause();
  draw_pause();

  return true;
}

let initialize_pause = () => {
  onblur = () => { set_paused(1) }
  onfocus = () => { set_paused(0) }
}
let update_pause = () => {}
let draw_pause = () => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = 'red'
  ctx.fillText('paused', 50, 50)
}
