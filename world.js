let prev_player_y
let updateWorld = () => {
  let third = (map_len_y / 3) | 0,i,x
  let generate_invisible_part_of_the_map = when_over => {
    // start RENDER_DIST ahead (so the player doesn't see)
    // and then go on for 2/3 of the map.
    let y = (when_over + RENDER_DIST + 30) % map_len_y
    for (i = 0; i < third*2; i++) {
      y = y + 1
      if (y >= map_len_y) y = 0

      for (x=0;x<map_len_x;x++){map[y][x]=!(x>0&&x<map_len_x-1)}
      for (x = 3; --x>0;) {
        map[y][x] = random() > 0.85
      }
      map[y][4] = random() > 0.95
      map[y][map_len_x-5] = random() > 0.95
      for (x = map_len_x - 3; ++x<map_len_x;) {
        map[y][x] = random() > 0.85
      }
    }
  }
  if (prev_player_y==null) {
    // generate first chunks
    generate_invisible_part_of_the_map(third * 2)
  } else {
    for (let when_over of [third,third * 2,(third * 3)-4]) {
      if (prev_player_y < when_over && player_y > when_over) {
        generate_invisible_part_of_the_map(when_over)
      }
    }
  }
  prev_player_y = player_y
}

let map_collide_ray = (curX, curY, direction) => {
  let ix
  let iy
  let ix2
  let iy2
  let step = .1
  let dist = step
  let dirX = sin(direction) * step
  let dirY = cos(direction) * step

  for (; dist < RENDER_DIST; dist += step) {
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

    if (map_collide_point(ix, iy)) return [ix,iy,dist]
    if (map_collide_point(ix2, iy2)) return [ix2,iy2,dist]
  }

  return []
}

// sky above, gray below
let screen_y_of_horizon = () => (halfHeight - (-(canvasHeight * player_z) / RENDER_DIST)) | 0
let screen_y_at_distance = (z, distance) => {
  let relative_z = player_z - z
  let screenY = (relative_z + 2) / distance
  return (screenY * canvasHeight) + halfHeight
}
let screen_x_at_distance = (x, distance) => {
   let angle = (CURRENT_TURN * .3) // TODO how does "spread" apply here
   let relativeX = (x - player_x) * cos(angle) + (distance * sin(angle));

   let screenX = ((2 * tan(FOV / 2)) * (relativeX / distance));

   // The screen X position is calculated using the formula: sx = (2 * tan(FoV/2)) * ((x - origin) / distance)
   return ((screenX * canvasWidth) + halfWidth) | 0;
}

/** @returns {Array<[x, hit_x, hit_y, distance]>} */
let get_distance_buffer = () => {
  let x = 0
  return range(((canvasWidth + 20) / iter_step) | 0, () => {
    x += iter_step
    let turn = CURRENT_TURN * .3
    let spread = -abs(CURRENT_TURN * .05)
    let angle = lerp(-CURRENT_FOV - turn - spread, CURRENT_FOV - turn + spread, x/canvasWidth)
    let [hit_x, hit_y, distance] = map_collide_ray(player_x, player_y, angle)

    return [x, hit_x, hit_y, distance]
  });
}

let COLOR_stars
let COLOR_sky_gradient_start
let COLOR_sky_gradient_end
let COLOR_road_gradient_start
let COLOR_road_gradient_end
let COLOR_road_checkerboard
let COLOR_road_grid
let COLOR_tree_hue
let COLOR_wall_hue
let COLOR_tree_sat
let COLOR_wall_sat
let COLOR_tree_lum
let COLOR_wall_lum
let COLOR_abyss_color
let COLOR_text_nth_place
let COLOR_player_brightness
let COLOR_reset_all_colors = () => {
  COLOR_stars = 0
  COLOR_sky_gradient_start = 'yellow'
  COLOR_sky_gradient_end = 'purple'
  COLOR_road_gradient_start = 'blue'
  COLOR_road_gradient_end = 'purple'
  COLOR_road_checkerboard = null
  COLOR_road_grid = null
  COLOR_tree_hue = 86
  COLOR_wall_hue = 44
  COLOR_tree_sat = .9
  COLOR_wall_sat = .9
  COLOR_tree_lum = 0
  COLOR_wall_lum = 0
  COLOR_abyss_color = 'rgba(255,200,200,.4)'
  COLOR_text_nth_place = 'green'
  COLOR_player_brightness = 1
}
let _unused = COLOR_reset_all_colors()

let checkerboard_animation_step = 0

let stars = range(2000, () => {
  return [(random()-.5) * canvasWidth * 2, (random()-.5) * canvasWidth * 2]
})
let star_rotate_speed = -.002

let abyss_x1_gradual = gradually_change()
let abyss_w_gradual = gradually_change()
let drawWorld = () => {
  // Change FOV according to speed
  let target_fov =
    CURRENT_TURN != 0
      ? FOV
      : clamp(FOV, FOV_FAST, remap(default_mov_y, player_speed, FOV, FOV_FAST, delayed_mov_y))
  // (1-((1-clamp(0, 1, inv_lerp(default_mov_y, player_speed, delayed_mov_y))) ** 2)) * -.25
  CURRENT_FOV = lerp(CURRENT_FOV, target_fov, 0.1)
  let how_fast_are_we = inv_lerp(FOV, FOV_FAST, CURRENT_FOV)

  // sky above, gray below
  let z_center = (halfHeight - (-(canvasHeight * player_z) / RENDER_DIST))

  let wallHeight = distance => (canvasHeight * 3.1 + 8.1 * (1+how_fast_are_we)) / distance

  let first_wall_bottom=0
  let last_wall_bottom=0
  let first_wall_top=0
  let last_wall_top=0

  let distance_buffer = get_distance_buffer().map(([x, hit_x, hit_y, distance]) => {
    let height = wallHeight(distance) || 0
  
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

    return [x, hit_x, distance, z_offset, height]
  });

  let x_start
  let x_end
  let latch
  distance_buffer.map(([x, hit_x, distance]) => {
    if (!distance || distance > RENDER_DIST) {
      if (x_start == null) {
        x_start = x
        latch = true
      }
    } else if (latch === true) {
      latch = false
      x_end = x
    }
  });
  x_start ||= 0
  x_end ||= 0

  let abyss_h = wallHeight(RENDER_DIST)
  let abyss_x1 = x_start
  let abyss_y1 = (z_center - (abyss_h/2))|0

  // Draw the sky
  let sky_grad = ctx.createRadialGradient(
    halfWidth, abyss_y1 + 100, 500,
    halfWidth, abyss_y1 + 100, 40
  )
  sky_grad.addColorStop(0, COLOR_sky_gradient_start)
  sky_grad.addColorStop(1, COLOR_sky_gradient_end)
  ctx.fillStyle = sky_grad
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw stars
  if (COLOR_stars) {
    ctx.fillStyle = COLOR_stars
    for (let star of stars) {
      // Use this loop to rotate all stars as well to save space
      let [x, y] = vec_rotate_around(...star, halfWidth / 2, halfHeight - 100, star_rotate_speed)

      star[0] = x
      star[1] = y

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 1, y + 1)
      ctx.lineTo(x + 0, y + 2)
      ctx.lineTo(x - 1, y + 1)
      ctx.lineTo(x, y)
      ctx.fill()
    }
  }

  // Draw the road
  if (COLOR_road_checkerboard) {
    ctx.fillStyle = COLOR_road_checkerboard[0]
    ctx.fillRect(0, abyss_y1 + abyss_h, canvasWidth, canvasHeight)

    let is = 1
    let step = 3
    // Oscillate from 0 to [step] as we're moving forward
    let y_moving = step - ((checkerboard_animation_step += 1) % step)
    for (let y = (RENDER_DIST + 20) + y_moving; y > -2; y -= step) {
      for (let x = 0; x < map_len_x; x += step) {
        is = !is
        ctx.fillStyle = COLOR_road_checkerboard[+is]
        ctx.strokeStyle = 'red'

        ctx.beginPath();
        ctx.moveTo(
          screen_x_at_distance(x, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.lineTo(
          screen_x_at_distance(x, y_moving + y + step),
          screen_y_at_distance(-.5, y_moving + y + step),
        )
        ctx.lineTo(
          screen_x_at_distance(x + step, y_moving + y + step),
          screen_y_at_distance(-.5, y_moving + y + step),
        )
        ctx.lineTo(
          screen_x_at_distance(x + step, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.lineTo(
          screen_x_at_distance(x, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.fill()
      }
    }
  } else if (COLOR_road_grid) {
    ctx.fillRect(0, abyss_y1 + abyss_h, canvasWidth, canvasHeight)

    let is = 1
    let step = 3
    let y_moving = step - ((checkerboard_animation_step += 1) % step)
    for (let y = RENDER_DIST; y > 0; y -= step) {
      for (let x = 0; x < map_len_x; x += step) {
        is = !is
        ctx.strokeStyle = COLOR_road_grid

        ctx.beginPath();
        ctx.moveTo(
          screen_x_at_distance(x, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.lineTo(
          screen_x_at_distance(x, y_moving + y + step),
          screen_y_at_distance(-.5, y_moving + y + step),
        )
        ctx.lineTo(
          screen_x_at_distance(x + step, y_moving + y + step),
          screen_y_at_distance(-.5, y_moving + y + step),
        )
        ctx.lineTo(
          screen_x_at_distance(x + step, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.lineTo(
          screen_x_at_distance(x, y_moving + y),
          screen_y_at_distance(-.5, y_moving + y),
        )
        ctx.stroke()
      }
    }
  } else {
    let road_grad = ctx.createRadialGradient(
      x_start || x_end, abyss_y1 +200, 70,
      (x_start || x_end) - 10, abyss_y1 +200, 200,
    )
    road_grad.addColorStop(0, COLOR_road_gradient_start)
    road_grad.addColorStop(1, COLOR_road_gradient_end)
    ctx.fillStyle = road_grad
    ctx.beginPath();
    ctx.moveTo(abyss_x1, abyss_y1+abyss_h);
    ctx.lineTo(x_end || x_start, abyss_y1+abyss_h);
    ctx.lineTo(canvasWidth, (last_wall_bottom + last_wall_top) / 2);
    ctx.lineTo(canvasWidth*2, canvasHeight * 2);
    ctx.lineTo(-canvasWidth, canvasHeight * 2);
    ctx.lineTo(0, (first_wall_bottom + first_wall_top) / 2);
    ctx.fill();
  }

  for (let [x, hit_x, distance, z_offset, height] of distance_buffer) {
    let how_far = inv_lerp(RENDER_DIST, 0, distance)
    how_far = clamp(0, 1, how_far)

    ctx.fillStyle =
      hit_x === 0 || hit_x === map_len_x - 1
        ? `hsl(${COLOR_tree_hue}deg, ${COLOR_tree_sat*100}%, ${(lerp(.1,.3,how_far) + COLOR_tree_lum) * 100}%)`
        : `hsl(${COLOR_wall_hue}deg, ${COLOR_wall_sat*100}%, ${(lerp(.1,.3,how_far) + COLOR_wall_lum) * 100}%)`
    ctx.fillRect(x, z_offset, 4, height)
  }
  
  // Draw the abyss
  ctx.filter = 'blur(10px)'
  ctx.fillStyle = COLOR_abyss_color
  ctx.fillRect(
    abyss_x1_gradual(abyss_x1) - 5, 
    abyss_y1 - 5, 
    abyss_w_gradual(x_end - x_start) + 10, 
    (abyss_h|0) + 10
  )
  ctx.filter = 'none'

  /*
  // Draw debug fake 3D lines
  ctx.fillStyle = 'green'
  // (20, 2, 2)
  ctx.fillRect(screen_x_at_distance(5, 2), screen_y_at_distance(2, 2) - 1, 1, 1)
  // (20, 10, 2)
  ctx.fillRect(screen_x_at_distance(5, 10), screen_y_at_distance(2, 10) - 1, 1, 1)
  // (20, 20, 2)
  ctx.fillRect(screen_x_at_distance(5, 20), screen_y_at_distance(2, 20) - 1, 1, 1)
  // (20, 30, 2)
  ctx.fillRect(screen_x_at_distance(5, 30), screen_y_at_distance(2, 30) - 1, 1, 1)

  // (20, 2, 2)
  ctx.fillRect(screen_x_at_distance(5, 2), screen_y_at_distance(0, 2) - 1, 1, 1)
  // (20, 10, 2)
  ctx.fillRect(screen_x_at_distance(5, 10), screen_y_at_distance(0, 10) - 1, 1, 1)
  // (20, 20, 2)
  ctx.fillRect(screen_x_at_distance(5, 20), screen_y_at_distance(0, 20) - 1, 1, 1)
  // (20, 30, 2)
  ctx.fillRect(screen_x_at_distance(5, 30), screen_y_at_distance(0, 30) - 1, 1, 1)

  // (20, 2, 2)
  ctx.fillRect(screen_x_at_distance(15, 2), screen_y_at_distance(2, 2) - 1, 1, 1)
  // (20, 10, 2)
  ctx.fillRect(screen_x_at_distance(15, 10), screen_y_at_distance(2, 10) - 1, 1, 1)
  // (20, 20, 2)
  ctx.fillRect(screen_x_at_distance(15, 20), screen_y_at_distance(2, 20) - 1, 1, 1)
  // (20, 30, 2)
  ctx.fillRect(screen_x_at_distance(15, 30), screen_y_at_distance(2, 30) - 1, 1, 1)

  // (20, 2, 2)
  ctx.fillRect(screen_x_at_distance(15, 2), screen_y_at_distance(0, 2) - 1, 1, 1)
  // (20, 10, 2)
  ctx.fillRect(screen_x_at_distance(15, 10), screen_y_at_distance(0, 10) - 1, 1, 1)
  // (20, 20, 2)
  ctx.fillRect(screen_x_at_distance(15, 20), screen_y_at_distance(0, 20) - 1, 1, 1)
  // (20, 30, 2)
  ctx.fillRect(screen_x_at_distance(15, 30), screen_y_at_distance(0, 30) - 1, 1, 1)
  */
  
}