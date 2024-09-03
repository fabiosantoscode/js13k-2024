let identity = x=>x
let range = (n, cb) => Array.from({ length: n }, cb);
let {floor, ceil, round, sin, cos, tan, abs, min, max, random} = Math;
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
let sleep = ms => makePromise(resolve => setTimeout(resolve, ms))
let round_n = (num, n) => round(num / n) * n
let floor_n = (num, n) => floor(num / n) * n
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

let vec_length = (x, y) => Math.sqrt(x**2, y**2)
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
let setKey = (truth) => (e) => keys[e.key] = truth
onkeydown = setKey(1)
onkeyup = setKey()
for (let button of document.all){
  let k = button.getAttribute('key')
  if (k) {
    button.onpointerdown = e => {
      e.preventDefault()
      keys[k] = 1
      button.setPointerCapture(e.pointerId)
    }
    button.onpointerup = e => {
      e.preventDefault()
      keys[k] = 0
      button.releasePointerCapture(e.pointerId)
    }
  }
}

let isKeyPressed = k => !!keys[k]

let game_start_time

let update = () => {
  game_start_time||=Date.now()
  GAME_TIME = Date.now() - game_start_time
  GAME_TIME_SECS += FRAME_DELTA_S
  updateWorld()
  updateApproachingRacer()
  updatePlayer()
  updateGoal()
}

let iter_step = 2
let draw = () => {
  ctx.lineJoin = 'round'
  drawMultiPhase()
  drawWorld()
  drawApproachingRacer()
  drawPlayer()
  drawGoal()
}

let doFrame = () => {
  let start = Date.now()
  update()
  draw()
  // Our update(); draw(); produced time, let's offset it
  let till_next_frame = max(0, FRAME_DELTA_MS - (Date.now() - start))
  setTimeout(doFrame, till_next_frame)
}

// MUSIC, FULLSCREEN, ETC, NEED INTERACTION
let firstUserInteraction = makePromise((resolve) => {
    c.onclick = resolve
})

ctx.font = "20px 'Comic Sans MS', sans-serif"
ctx.textAlign = 'center'

// START FRAMING (in minified mode, just sleep 1 frame).
if (self.env === 'production') {
  firstUserInteraction.then(doFrame)
  ctx.fillStyle = 'purple'
  ctx.fillText('CLICK TO START', halfWidth, halfHeight)
} else {
  onload = () => {
    doFrame()
  }
}
