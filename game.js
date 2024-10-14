let identity = x=>x
let range = (n, cb) => Array.from({ length: n }, cb);
let { Math, setTimeout: setTimeout_native } = self;
let {floor, ceil, round, sin, cos, tan, abs, min, max, random, sqrt, log2} = Math;
let canvasHeight = 180
let canvasWidth = 320
let halfHeight = canvasHeight / 2
let halfWidth = canvasWidth / 2
/** @type {CanvasRenderingContext2D} */
let ctx = c.getContext('2d')

let TAU = 6.3 // ~ Math.PI * 2
let FORTY_FIVE_DEG_DIST = 0.6

let FPS = 24
let FRAME_DELTA_S = .042 // ~1/24
let FRAME_DELTA_MS = 42 // ~1000/24
let FOV = .8 // (1.5708 /* 90deg in radians */) / 2
let CURRENT_FOV = FOV
let FOV_FAST = FOV * 2
let RENDER_DIST = 40
let GAME_TIME = 0.1 // TODO remove this, use just GAME_TIME_SECS
let GAME_TIME_SECS = 0.1


let map_len_x = 20
let map_len_y = 1000
let map = range(map_len_y, _=>range(map_len_x, (_, i)=>i==0||i==19))

let map_collide_point = (x, y) => {
  return map[y][x]
};
let makePromise = cb => new Promise(cb)
let sleep = ms => makePromise(resolve => game_set_timeout(resolve, ms))
let sleep_native = ms => makePromise(resolve => setTimeout_native(resolve, ms))
let round_n = (num, n) => round(num / n) * n
let lerp = (from, to, much) => from + ((to - from) * much)
let lerp_vec = ([from_x,from_y], [to_x,to_y], much) => [lerp(from_x, to_x, much), lerp(from_y, to_y, much)]
let inv_lerp = (a, b, v) => (v - a) / (b - a)
let remap = (fromMin, fromMax, toMin, toMax, v) => {
  let f = inv_lerp(fromMin, fromMax, v)
  return lerp(toMin, toMax, f)
}
let clamp = (a, b, v) => (v < a ? a : v > b ? b : v)
let wrap_around = (start, end, value) => {
  if (value < start) return end + (value - start)
  if (value > end) return start + (value - end)
  return value
}
let gradually_change = (value, inertia = 0.1) => {
  return (newvalue) => {
    value = value == null ? newvalue : lerp(value, newvalue, inertia)
    return value
  }
}

let map_collide_line_segment = (player_x, player_y, mov_x, mov_y, delta=1/32) => {
  for (let i = 0; i <= 1; i+=delta) {
    let collides_here = map_collide_point(
      round(lerp(player_x, mov_x, i)),
      round(lerp(player_y, mov_y, i))
    );
    if (collides_here) return 1;
  }
}

let vec_length = (x, y) => sqrt(x**2, y**2)
let vec_rotate = (x, y, ang) => [
  x * cos(ang) - y * sin(ang),
  x * sin(ang) + y * cos(ang),
]
let vec_rotate_around = (x, y, origin_x, origin_y, ang) => {
  x -= origin_x
  y -= origin_y

  ;([x, y] = vec_rotate(x, y, ang))

  return [x + origin_x, y + origin_y,]
}

// INPUT
let keys = {}
let preventKeyDefault = truth => e => {
  if (['KeyW', 'KeyA', 'KeyD', 'Escape', 'Space'].includes(e.code)) {
    e.preventDefault()
    keys[e.code] = truth
  }
}
onkeydown = preventKeyDefault(1)
onkeyup = preventKeyDefault(0)
for (let buttonGroup of document.querySelectorAll('[keys]')){
  let touchButtons = [...buttonGroup.querySelectorAll('[key]')]
  let touchButtonKeys = []
  for (let button of touchButtons) {
    let k = button.getAttribute('key')
    touchButtonKeys.push(k)

    let down = 0

    button.onpointerdown = e => {
      e.preventDefault()
      down = keys[k] = 1
      button.setPointerCapture(e.pointerId)
    }
    button.onpointerup = e => {
      e.preventDefault()
      for (let b of touchButtonKeys) keys[b] = down = 0
      button.releasePointerCapture(e.pointerId)
    }
    // Allow for rollover. One can start pressing right and then drag to the left and the ship should go left.
    button.onpointermove = e => {
      e.preventDefault()
      if (!down) return

      for (let b of touchButtonKeys) keys[b] = 0

      // Find which button is under the pointer and touch that key instead of all others
      let keyUnderPointer = touchButtons
        .find(b => {
          let box = b.getBoundingClientRect()
          return (
            box.left < e.clientX
            && box.right > e.clientX
            && box.top < e.clientY
            && box.bottom > e.clientY
          )
        })
        ?.getAttribute('key')

      if (keyUnderPointer) {
        down = keys[keyUnderPointer] = 1
      }
    }
  }
}

let game_start_time

let game_set_timeout = (cb, time = 0) => {
  if (currently_paused) {
    on_unpause.push(() => {
      game_set_timeout(cb, time)
    })
  } else {
    let end_at_time = game_now() + time
    let onEnd = () => {
      let time_left = end_at_time - game_now()
      if (time_left <= 0) cb()
      setTimeout_native(onEnd, time_left)
    }
    setTimeout_native(onEnd)
  }
}
let game_now = () => {
  return (Date.now() - pause_cumulative_time)
};

let update = () => {
  game_start_time ||= game_now()
  GAME_TIME = game_now() - game_start_time
  GAME_TIME_SECS += FRAME_DELTA_S
  updateWorld()
  updateApproachingRacer()
  updatePlayer()
  updateGoal()
}

let iter_step = 2
let draw = () => {
  drawMultiPhase()
  drawWorld()
  drawApproachingRacer()
  drawPlayer()
  drawGoal()
}

let default_loop = () => {
  update()
  draw()
  return true
}

let doFrame = () => {
  let start = Date.now()

  pause_loop() || default_loop()

  // Our update(); draw(); produced time, let's offset it
  let till_next_frame = max(0, FRAME_DELTA_MS - (Date.now() - start))
  setTimeout_native(doFrame, till_next_frame)
}

ctx.font = "20px Calibri,sans-serif"
ctx.textAlign = 'center'
ctx.lineJoin = 'round'

// MUSIC, FULLSCREEN, ETC, NEED INTERACTION
if (self.env === 'production') {
  ctx.fillStyle = 'purple'
  ctx.fillText('CLICK TO START', halfWidth, halfHeight)
  c.onclick = CLICK.onclick = () => {
    c.onclick = CLICK.onclick = null
    musicInitialize()
    musicStartMainTheme()
    initialize_pause()
    doFrame()
    onCanvasClickFullscreen()
  }
} else {
  // IN DEV WE JUST START THEM ANYWAY
  c.onclick = () => {
    c.onclick = null
    musicInitialize()
    musicStartMainTheme()
  }
  onload = () => {
    onload = null
    initialize_pause()
    doFrame()
  }
}
