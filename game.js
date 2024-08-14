let identity = x=>x
let pipeFns = (f1, f2) => (...a) => f2(f1(...a))
let range = (n, cb) => Array.from({ length: n }, cb);
let MATH = Math;
let {floor, ceil, sin, cos, abs, round, min, max} = MATH;
let { height: canvasHeight, width: canvasWidth } = c;
let halfHeight = canvasHeight / 2
let halfWidth = canvasWidth / 2
/** @type {CanvasRenderingContext2D} */
let ctx = c.getContext('2d')

let TAU = MATH.PI * 2
let FORTY_FIVE_DEG_DIST = 0.707

let UPDATES_PER_SECOND = 42 // ~1000/24
let FOV = (1.5708 /* 90deg in radians */) / 2
let RENDER_DIST = 40

let player_x = 5
let player_y = 5
let player_z = 3
let player_natural_z = 1
let player_natural_z_deviation = 2
let player_ang = 0.25 * TAU
let player_speed = 1.7
let player_ang_speed = 0.35
let player_iframes = 0 // ++ and --. we may have iframes for 2 reasons

let player_inertia_x = 0.04
let player_inertia_y = 0.2
let player_inertia_z = 0.1

let player_far_from_ground_control = 0.4

let map =
`xx             x xx
xx               xx
xx            x  xx
xx               xx
xx               xx
xx               xx
xx               xx
xx               xx
xx               xx
xx               xx
xxx              xx
`.repeat(10).trim().split('\n').map(xs => xs.split('').map(x => x === 'x'))
let map_len_x = map[0].length
let map_len_y = map.length

// The player has no collision at the center of the track
let player_should_collide = () =>
  !(round(player_x) == round(map_len_x / 2) || player_iframes)

let map_collide_point = (x, y) => map[y][x];
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let lerp = (from, to, much) => from + ((to - from) * much)
let inv_lerp = (a, b, v) => (v - a) / (b - a)
let clamp = (a, b, v) => (v < a ? a : v > b ? b : v)
let wrap_around = (start, end, value) => {
  if (value < start) return end + (value - start)
  if (value > end) return start + (value - end)
  return value
}

let map_collide_ray = (origin_x, origin_y, direction) => {
  let curX = origin_x
  let curY = origin_y
  let ix
  let iy
  let ix2
  let iy2
  let dist = .10
  let dirX = cos(direction) * dist
  let dirY = sin(direction) * dist

  let i = 1e4;
  while (i--) {
    dist += .10
    if (dist > RENDER_DIST) break;

    curX += dirX
    curY += dirY

    curX = wrap_around(0, map_len_x - 1, curX)
    curY = wrap_around(0, map_len_y - 1, curY)

    ix = floor(curX)
    iy = floor(curY)
    ix2 = ceil(curX)
    iy2 = ceil(curY)

    if (ix2 >= map_len_x || iy2 >= map_len_y || ix < 0 || iy < 0) {
      break;
    }

    if (map_collide_point(ix, iy) || map_collide_point(ix2, iy2)) {
      return [curX, curY, dist]
    }
  }

  return []
}
let map_collide_line_segment = (player_x, player_y, mov_x, mov_y, delta=1/32) => {
  for (let i=0; i <= 1; i+=delta) {
    let collides_here = map_collide_point(
      lerp(player_x, mov_x, i) | 0,
      lerp(player_y, mov_y, i) | 0
    );
    if (collides_here) return 1;
  }
}

let vec_length = (x, y) => MATH.sqrt(x**2, y**2)
let vec_rotate = (x, y, ang) => [
  x * cos(ang) - y * sin(ang),
  x * sin(ang) + y * cos(ang)
]

let should_update_player = 1
let prev_mov_x = 0.6
let prev_mov_y = 0
let prev_mov_z = 0
let frames_in_natural_z = 0
let update = () => {
  if (should_update_player) {
    let mov_x = 1.2
    let mov_y = 0
    let mov_z = 0

    if (isKeyPressed('w')) mov_x += 1
    if (isKeyPressed('s')) mov_x -= 1

    if (isKeyPressed('a')) mov_y -= 1
    if (isKeyPressed('d')) mov_y += 1

    // jump
    let z_deviation = player_z - player_natural_z;
    if (isKeyPressed(' ') && frames_in_natural_z > 5) {
      mov_z = 3
      frames_in_natural_z = 0
    } else {
      // mov_z needs gravity+inertia
      if (player_z < 0.05) {
        player_z = abs(player_z);
        mov_z = abs(prev_mov_z) // go up pls
        prev_mov_z = abs(prev_mov_z) // go up pls
        frames_in_natural_z = 0
      }
      else if (abs(z_deviation) > player_natural_z_deviation) {
        mov_z = -z_deviation * .2
        frames_in_natural_z = 0
      } else {
        mov_z = -z_deviation * 0.1
        frames_in_natural_z++
      }

      mov_z = lerp(prev_mov_z, mov_z, player_inertia_z)
    }

    //if (isKeyPressed('ArrowRight')) player_ang += player_ang_speed
    //if (isKeyPressed('ArrowLeft')) player_ang -= player_ang_speed

    if (mov_x && mov_y) {
      mov_x *= (FORTY_FIVE_DEG_DIST + 1) / 2
      mov_y *= (FORTY_FIVE_DEG_DIST + 1) / 2
    }

    // Inertia
    mov_x = lerp(prev_mov_x, mov_x, player_inertia_x)
    mov_y = lerp(prev_mov_y, mov_y, player_inertia_y)

    prev_mov_x = mov_x
    prev_mov_y = mov_y
    prev_mov_z = mov_z

    ;([mov_x, mov_y] = vec_rotate(mov_x, mov_y, player_ang))

    // try new position to see how we feel
    mov_x = (mov_x * player_speed) + player_x
    mov_y = (mov_y * player_speed) + player_y
    mov_z = mov_z + player_z

    // Physics: the world wraps around
    mov_x = wrap_around(0, map_len_x - 1, mov_x)
    mov_y = wrap_around(0, map_len_y - 1, mov_y)

    let has_collided
    if (
      mov_x > 0 && mov_y > 0
      && mov_x < map_len_x && mov_y < map_len_y
      && (
        player_should_collide()
          ? !(has_collided = (
            map_collide_line_segment(player_x, player_y, mov_x+1, mov_y)
            || map_collide_line_segment(player_x, player_y, mov_x-1, mov_y)
            || map_collide_line_segment(player_x, player_y, mov_x, mov_y)
          ))
          : true
      )
    ) {
      player_x = mov_x
      player_y = mov_y
      player_z = mov_z
    }

    // Bounce the player to the center of the track
    if (has_collided) {
      should_update_player--
      player_iframes++
      // barrel roll into the center of the track
      (async () => {
        let end = Date.now() + 400
        while (Date.now() < end) {
          player_x = lerp(player_x, map_len_x / 2, 0.3)
          await sleep(UPDATES_PER_SECOND)
        }
        should_update_player++
        player_iframes--
      })()
    }
  }
}

let iter_step = 2
let draw = () => {
  let x = -10, y = -10, dist
  // sky above, gray below
  let z_center = (halfHeight  -  (-(canvasHeight * player_z) / RENDER_DIST))
  while ((y+=4) < canvasHeight) {
    dist = abs(y - z_center)
    dist = inv_lerp(0, z_center, dist)
    dist = lerp(.3, .6, dist)
    dist *= 100
    ctx.fillStyle = `hsl(88, ${dist}%, ${dist}%)`
    ctx.fillRect(0, y, canvasWidth, 10)
  }

  let wallHeight = distance => (canvasHeight * 3.1) / distance
  let x_start = 0
  let x_end = 0

  let first_wall_bottom=0
  let last_wall_bottom=0
  let first_wall_top=0
  let last_wall_top=0

  let distance_buffer = range(((canvasWidth + 20) / iter_step) | 0, () => {
    let angle = lerp(player_ang-FOV, player_ang+FOV, x/canvasWidth)
    let distance = map_collide_ray(player_x, player_y, angle)[2]
    let height = wallHeight(distance) || 0
    x += iter_step

    if (!distance || distance > RENDER_DIST) {
      if (x < halfWidth && !x_start) x_start = x + iter_step
      if (x > halfWidth) x_end = x + iter_step
    }
  
    // bend light so the game looks cooler
    for (let incr = 0.05; incr < 2; incr+=0.05) {
      if (height > canvasHeight * incr) height *= 1.03
    }

    let z_offset = -(canvasHeight * player_z) / distance
    z_offset = (halfHeight - (height / 2) - z_offset)|0

    last_wall_top = min(last_wall_top, z_offset)
    last_wall_bottom = max(last_wall_bottom, z_offset + height)
    first_wall_top ||= z_offset
    first_wall_bottom ||= z_offset + height

    return [x, distance, z_offset, height]
  });

  let abyss_h = wallHeight(RENDER_DIST)
  let abyss_x1 = x_start
  let abyss_y1 = (z_center - (abyss_h/2))|0

  // Draw the sky
  let sky_grad = ctx.createRadialGradient(
    halfWidth, abyss_y1 + 100, 500,
    halfWidth, abyss_y1 + 100, 40
  )
  sky_grad.addColorStop(0, 'yellow')
  sky_grad.addColorStop(1, 'purple')
  ctx.fillStyle = sky_grad
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw the road
  let road_grad = ctx.createRadialGradient(
    x_start || x_end, abyss_y1 +200, 70,
    (x_start || x_end) - 10, abyss_y1 +200, 200,
  )
  road_grad.addColorStop(0, 'blue')
  road_grad.addColorStop(1, 'purple')
  ctx.fillStyle = road_grad
  ctx.beginPath();
  ctx.moveTo(abyss_x1, abyss_y1+abyss_h);
  ctx.lineTo(x_end || x_start, abyss_y1+abyss_h);
  ctx.lineTo(canvasWidth, (last_wall_bottom + last_wall_top) / 2);
  ctx.lineTo(canvasWidth*2, canvasHeight * 2);
  ctx.lineTo(-canvasWidth, canvasHeight * 2);
  ctx.lineTo(0, (first_wall_bottom + first_wall_top) / 2);
  ctx.fill();

  // Draw the abyss
  if (x_start && x_end) {
    ctx.globalAlpha = 0.4
    ctx.fillStyle = 'black'
    ctx.fillRect(abyss_x1, abyss_y1, x_end - x_start, abyss_h|0)
    ctx.globalAlpha = 1
  }

  for (let [x, distance, z_offset, height] of distance_buffer) {
    let inv_distance = inv_lerp(0, RENDER_DIST, distance)

    inv_distance = clamp(0, distance, inv_distance)
    let col = lerp(255, 0, inv_distance)

    ctx.fillStyle = `rgb(${col}, ${col}, ${col})`
    ctx.fillRect(x, z_offset, 4, height)
  }

}

// START MUSIC AFTER INTERACTION
let resolveFirstHumanInteraction
let firstUserInteraction = new Promise((resolve) => {
    resolveFirstHumanInteraction = resolve
})

// INPUT
let keys = {}
let setKey = (truth) => (e) => {
    keys[e.key] = truth
}
onkeydown = pipeFns(setKey(1), resolveFirstHumanInteraction)
onkeyup = setKey()
onclick = resolveFirstHumanInteraction

let isKeyPressed = k => !!keys[k]

let start = () => {
  let doIt = () => (update(),draw(),setTimeout(doIt, UPDATES_PER_SECOND))
  doIt()
}
start()
