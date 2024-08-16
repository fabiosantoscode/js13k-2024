let player_x = 9
let player_y = 5
let player_z = 3
let player_natural_z = 1
let player_natural_z_deviation = 2
let player_speed = 1.7
let player_iframes = 0 // ++ and --. we may have iframes for 2 reasons

let player_inertia_x = 0.04
let player_inertia_y = 0.2
let player_inertia_z = 0.1

let player_far_from_ground_control = 0.4

let default_mov_y = 1.2
let prev_mov_x = 0
let prev_mov_y = 0.6
let prev_mov_z = 0
let frames_in_natural_z = 0
let player_lunge_forward_as_a_result_of_hitting_a_wall_speed = 5

let sideways_force_from_turns_gradual = gradually_change(0, 0.05)

let updatePlayer = () => {
  if (player_iframes) return

  let mov_y = default_mov_y
  let mov_x = 0
  let mov_z = 0

  if (isKeyPressed('w')) mov_y += 1
  // if (isKeyPressed('s')) mov_y -= .5 // brakes

  if (isKeyPressed('a')) mov_x -= 1
  if (isKeyPressed('d')) mov_x += 1

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

  let sideways_force_from_turns = sideways_force_from_turns_gradual(CURRENT_TURN * .5)
  mov_x -= sideways_force_from_turns * prev_mov_y

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
          map_collide_line_segment(player_x, player_y, mov_x, mov_y)
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
    player_iframes++
    // barrel roll into the center of the track
    (async () => {
      let end = Date.now() + 1000
      while (Date.now() < end) {
        player_x = lerp(player_x, map_len_x / 2, 0.3)
        player_y += player_lunge_forward_as_a_result_of_hitting_a_wall_speed
        player_y = wrap_around(0, map_len_y - 1, player_y)
        await sleep(FRAME_DELTA_MS)
      }
      player_iframes--
    })()
  }
}

let hovering = 0
let burning = 0
let delayed_mov_x = prev_mov_x
let delayed_mov_y = prev_mov_y
let delayed_mov_z = prev_mov_z
let shaking = 0
let shaking_intensity_period = 0

let gradual_shadow_alpha = gradually_change(1, 0.8)
let gradual_current_turn = gradually_change(0)

let draw_hull = ([tip, botLeft, botRight, top], color_left, color_right, color_highlight, color_back, lineWidth) => {
  let drawTriangle = (color, lineColor, a, b, c) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(...a)
    ctx.lineTo(...b)
    ctx.lineTo(...c)
    ctx.lineTo(...a)
    ctx.fill()

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = lineColor
    ctx.beginPath()
    ctx.moveTo(...a)
    ctx.lineTo(...b)
    ctx.lineTo(...c)
    ctx.lineTo(...a)
    ctx.stroke()
    ctx.lineWidth = 1
  }

  // right triangle is facing us, draw it in front
  if (top[0] < tip[0]) {
    // left
    drawTriangle(color_left, color_highlight, tip, top, botLeft)

    // right
    drawTriangle(color_right, color_highlight, tip, top, botRight)
  } else {
    // right
    drawTriangle(color_right, color_highlight, tip, top, botRight)

    // left
    drawTriangle(color_left, color_highlight, tip, top, botLeft)
  }

  // back
  drawTriangle(color_back, 'brown', top, botLeft, botRight)
}

let shrink_hull = (hull_coords, scale) => {
  let midpoint_x=0, midpoint_y=0;

  hull_coords.forEach(([x, y]) => {
    midpoint_x += x
    midpoint_y += y
  })

  midpoint_x /= hull_coords.length
  midpoint_y /= hull_coords.length

  hull_coords.forEach((cx) => {
    let at_origin = cx[0] - midpoint_x;
    at_origin *= scale
    cx[0] = midpoint_x + at_origin;
    at_origin = cx[1] - midpoint_y;
    at_origin *= scale
    cx[1] = midpoint_y + at_origin;
  })
}

let move_hull = (hull_coords, move_x, move_y) => {
  return hull_coords.forEach((cx) => {
    cx[0] = (cx[0] + move_x) | 0
    return cx[1] = (cx[1] + move_y) | 0
  })
}

let create_hull = (center_x, center_y, prev_mov_x, global_turn) => {
  let tip = [center_x + 1, center_y - 15]
  let botLeft = [center_x - 30, center_y + 20]
  let botRight = [center_x + 30, center_y + 20]
  let top = [center_x - 1, center_y - 2]

  let t = global_turn
  tip[0] += t * 20
  botLeft[1] -= t * 5
  botRight[1] += t * 5

  // Wiggle as we move X
  tip[0] += prev_mov_x * 32
  tip[1] += abs(prev_mov_x) * 7
  top[0] -= prev_mov_x * 5 * 2
  top[1] -= abs(prev_mov_x) * 5
  if (prev_mov_x < 0) {
    // when turning left
    botLeft[0] -= prev_mov_x * 25
    botRight[1] += prev_mov_x * 25
    botLeft[1] -= prev_mov_x * 25
  }
  if (prev_mov_x > 0) {
    botRight[0] -= prev_mov_x * 25
    botLeft[1] -= prev_mov_x * 25
    botRight[1] += prev_mov_x * 25
  }

  return [tip, botLeft, botRight, top]
}

let drawPlayer = () => {
  // shake our guy with a sin()
  shaking = shaking += 8
  shaking_intensity_period += 0.1
  hovering += abs(abs(prev_mov_y) - abs(prev_mov_x)) * 0.1
  // burn intensity is 2 components, one is how much harder we're accelerating, and the other is how much we're accelerating in general
  let burn_intensity = clamp(0, 10, 
    (clamp(0, 1, prev_mov_y - default_mov_y) * 4)
    + (clamp(0, 1, prev_mov_y - delayed_mov_y) * 6)
  ) / 10 // 0..=1
  burning += burn_intensity

  let HULL = create_hull(halfWidth, canvasHeight - 30, prev_mov_x, gradual_current_turn(CURRENT_TURN))
  let [tip, botLeft, botRight, top] = HULL

  // for sfx
  delayed_mov_x = lerp(delayed_mov_x, prev_mov_x, 0.1)
  delayed_mov_y = lerp(delayed_mov_y, prev_mov_y, 0.1)
  delayed_mov_z = lerp(delayed_mov_z, prev_mov_z, 0.1)

  // Lower tip as we move faster
  tip[1] += (prev_mov_y - default_mov_y) * 5
  // Buttclench as we move faster
  botLeft[0] += (delayed_mov_y - default_mov_y) * 8
  botRight[0] -= (delayed_mov_y - default_mov_y) * 8

  // shake the tip when we go fast
  let how_fast_to_shake = 1 + (delayed_mov_y - prev_mov_y) * 2
  let how_much_to_shake = clamp(0, 1, remap(default_mov_y + 0.3, player_speed, 0, 1, delayed_mov_y)) * 0.5 * (sin(shaking_intensity_period) + 0.8)/2
  tip[0] += cos(shaking * how_fast_to_shake + 10) * how_much_to_shake
  tip[1] -= cos(shaking * how_fast_to_shake + 10) * how_much_to_shake * .5

  // Raise the tip, lower the bottom, when we jump
  tip[1] -= prev_mov_z * 5
  top[1] += prev_mov_z * 8
  botLeft[1] += prev_mov_z * 4
  botRight[1] += prev_mov_z * 4

  // Lower us when moving X, raise us when moving Y
  for (let coords of HULL) {
    let vertical_offset = -(abs(delayed_mov_x) * 2) + (((delayed_mov_y - default_mov_y)) * 9)
    coords[1] += vertical_offset
    // Periodic hovering, but only if offset isn't too harsh
    coords[1] -= lerp(0, sin(hovering) * 4, inv_lerp(0, 4, abs(vertical_offset)))
    // Shake our player when they go fast like sonic
    coords[0] += sin(shaking * how_fast_to_shake) * how_much_to_shake

    // Some rounding+noise
    coords[0] = (round(coords[0] * (5/6))) * (6/5)
    coords[1] = (round(coords[1] * (5/6))) * (6/5)    
  }

  // Cast a shadow
  ctx.fillStyle = 'rgba(44,0,44,0.8)'
  ctx.filter = `blur(${4}px)`
  ctx.globalAlpha = gradual_shadow_alpha(+(player_z < 2))
  ctx.beginPath()
  ctx.moveTo(tip[0], lerp(tip[1], canvasHeight, 0.8) - 10)
  ctx.lineTo(botLeft[0], lerp(botLeft[1], canvasHeight, 0.8) + 3)
  ctx.lineTo(botRight[0], lerp(botRight[1], canvasHeight, 0.8) + 3)
  ctx.fill()
  ctx.filter = `none`
  ctx.globalAlpha = 1

  let colorOverride
  let colorOverride2
  if (player_iframes) {
    if (sin(GAME_TIME_SECS * 30) > 0) return

    colorOverride = 'yellow'
    colorOverride2 = 'red'
  }

  move_hull(HULL, (canvasWidth / 20) * current_turn_gradual(CURRENT_TURN), abs(current_turn_gradual(CURRENT_TURN)) * -2)
  draw_hull(HULL, colorOverride||'green', colorOverride||'gray', colorOverride2||'purple', colorOverride||'black', 1.5)

  draw_hull_burninators(HULL, false, 1, burn_intensity)
}

let current_turn_gradual = gradually_change(0, 0.01)

// Draws the burninators. Destroys hull data
let draw_hull_burninators = ([tip, botLeft, botRight, top], just_one, scale, burn_intensity) => {
  // Go a third of the hull's height down
  let bottom_y = (botLeft[1] + botRight[1]) / 2
  top[1] += abs(top[1] - bottom_y) / 2

  let burnNumber = f => {
    for (let i = 0.1; i < 1; i+=0.1) if (f > i) f *= 1.1
    return f * 0.15
  }

  // BURNINATOR
  let drawBurninator = (is_main) => {
    if (burn_intensity > 0.5 && is_main) {
      ctx.fillStyle = 'yellow'
      ctx.globalAlpha = burn_intensity > 0.5
        ? sin(burning * 1.5) > (random() - 0.5)
        : (10 * burnNumber(burn_intensity + random())) ** 2
      ctx.beginPath()
      ctx.arc(...top, burnNumber(burn_intensity + random()) * 20 * scale, 0, TAU)
      ctx.fill()

      ctx.globalAlpha *= 0.6
      ctx.filter = 'blur(15px)'
      ctx.fillRect(top[0] - 20, top[1] - 10, 40 * scale, 20 + 20 * burnNumber(burn_intensity) * scale)
      ctx.filter = 'none'
      ctx.globalAlpha = 1
    }
  
    top[1] -= 1
    ctx.fillStyle = 'orange'
  
    ctx.globalAlpha = burn_intensity > 0.5
      ? sin(burning * 1.5) > (random() - 0.5)
      : (10 * burn_intensity) ** 2
    ctx.beginPath()
    ctx.arc(...top, burnNumber(burn_intensity + random()) * 14 * scale, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1

    top[1] -= 1

    ctx.fillStyle = prev_mov_y > default_mov_y ? 'red' : 'purple'
    ctx.globalAlpha = burnNumber(burn_intensity + random()) > 0.5
      ? sin(burning * 1.5) > (random() - 0.5)
      : (10 * burnNumber(burn_intensity + random())) ** 2
    ctx.beginPath()
    ctx.arc(...top, burnNumber(burn_intensity + random()) * 10 * scale, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  drawBurninator(true)

  if (just_one) return

  // SMALLER BOTTOM BURNERS
  burn_intensity *= .1
  top[1] += 10 * scale
  let center = [...top]

  // BOTTOM LEFT BURNER
  top = lerp_vec(center, botLeft, .5)
  drawBurninator(false)

  // BOTTOM RIGHT BURNER
  top = lerp_vec(center, botRight, .5)
  drawBurninator(false)
}