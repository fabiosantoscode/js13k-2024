
let approaching_racer_speed = default_mov_y - 0.2

// (see goal.js) an approaching racer. You must kick them in the back so they get more speed
let hasApproachingRacerBeenHit = () =>
    APPROACHING_RACER && !player_iframes && abs(APPROACHING_RACER[0] - player_x) < 2 && abs(APPROACHING_RACER[1] - player_y) < 2 && abs(player_z - 2) < 2
let hasApproachingRacerBeenSurpassed = () =>
    player_y > APPROACHING_RACER[1]
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

    if (distance > RENDER_DIST + 20) return

    let vertical_hover = sin(GAME_TIME_SECS * 2) / 4
    // range: -1..1
    let screen_x = screen_x_at_distance(racer_x, distance)
    let screen_x_tip = screen_x_at_distance(racer_x, distance + 1.5)
    let screen_y = screen_y_at_distance(vertical_hover + 2 + vertical_hover, distance)
    // scale screen_x towards the screen center
    let dist_scale = remap(
        -2, RENDER_DIST,
        1, 0.2,
        distance
    ) * .8
    dist_scale = clamp(0, 2.5, dist_scale)

    // Draw the halo (?)
    ctx.filter = `blur(${size}px)`
    ctx.fillStyle = 'red'
    ctx.fillRect((screen_x - (size/2)), screen_y - (size/2), size, size)
    ctx.filter = 'none'

    // Draw the hull
    let hull = create_hull(screen_x, screen_y, 0, 0)
    hull[0][0] = screen_x_tip
    shrink_hull(hull, dist_scale * remap(0, 20, 1, .8, abs(screen_x - screen_x_tip)), dist_scale)
    // Lower the tip. It's far from you
    hull[0][1] += 7 - (4 * (distance / RENDER_DIST))
    draw_hull(hull, 'white', 'white', sin(GAME_TIME_SECS * 15) > 0.3 ? 'red' : 'yellow', 'black', dist_scale)
    draw_hull_burninators(hull, true, dist_scale, 1)
}