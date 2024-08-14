let drawWorld = () => {
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
    let angle = lerp(-FOV, FOV, x/canvasWidth)
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
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(abyss_x1, abyss_y1, x_end - x_start, (abyss_h|0) + 2)
  }

  for (let [x, distance, z_offset, height] of distance_buffer) {
    let inv_distance = inv_lerp(0, RENDER_DIST, distance)

    inv_distance = clamp(0, distance, inv_distance)
    let col = lerp(255, 0, inv_distance)

    ctx.fillStyle = `rgb(${col}, ${col}, ${col})`
    ctx.fillRect(x, z_offset, 4, height)
  }
}