
let approaching_racer_speed = default_mov_y - 0.2

// (see goal.js) an approaching racer. You must kick them in the back so they get more speed
let updateApproachingRacer = () => {
    if (!APPROACHING_RACER) return

    let phase = APPROACHING_RACER[2]
    if (phase == 1) APPROACHING_RACER[1] += approaching_racer_speed * 1.5
    // phase 2 is being kicked back forward
    else APPROACHING_RACER[1] += approaching_racer_speed * 15
}
let drawApproachingRacer = () => {
    if (!APPROACHING_RACER) return

    // WHERE IS OUR GUY
    let [racer_x, racer_y] = APPROACHING_RACER

    if (racer_y < player_y) return

    let distance = abs(player_y - APPROACHING_RACER[1])

    let size = ((1 * canvasHeight) / distance)|0

    if (size < 3) return

    // range: -1..1
    let screen_x = (inv_lerp(
        -map_len_x, map_len_x,
        racer_x - player_x,
    )-.5)*2
    // scale screen_x towards the screen center
    let dist_scale = remap(
        -1, RENDER_DIST,
        1, 0.2,
        distance
    ) * .8
    dist_scale = clamp(0, 2, dist_scale)
    screen_x *= dist_scale

    // range: 0..1
    screen_x = remap(-1, 1, 0, 1, screen_x)

    screen_x = remap(0, 1, 0, canvasWidth, screen_x)

    // Draw the halo (?)
    ctx.filter = `blur(${size}px)`
    ctx.fillStyle = 'red'
    ctx.fillRect((screen_x - (size/2)), screen_y_at_distance(distance) - (size/2), size, size)
    ctx.filter = 'none'

    // Draw the hull
    let hull = create_hull(screen_x, screen_y_at_distance(distance) - 6, 0, 0)
    let game_s = GAME_TIME / 1000
    move_hull(hull, sin(game_s / 2) * 1, sin(game_s * 3) * 4)
    shrink_hull(hull, dist_scale)
    // Lower the tip. It's far from you
    hull[0][1] += 7 - (4 * (distance / RENDER_DIST))
    draw_hull(hull, 'white', 'white', sin(game_s * 15) > 0.3 ? 'red' : 'yellow', 'black', dist_scale)
    draw_hull_burninators(hull, true, dist_scale, 1)
}