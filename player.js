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

let should_update_player = 1
let prev_mov_x = 0.6
let prev_mov_y = 0
let prev_mov_z = 0
let frames_in_natural_z = 0
let updatePlayer = () => {
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