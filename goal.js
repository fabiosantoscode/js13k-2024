
/** There's a "turn" in the track */
let CURRENT_TURN = 0
let goal_nth_place = 13
let goal_target_turn = 0

let APPROACHING_RACER


let ordinal = place => {
    let nx = ['th','st','nd','rd']
    return place+(nx[place] || nx[0])
}
let round_n = (num, n) => Math.round(num / n) * n
let yield_time = function*(ms) {
    ms += Date.now()
    while (Date.now() < ms) {
        yield;
    }
}
// CHALLENGES
let challenge_hard_turn = function*() {
    // Turn left and right, try not to hit walls
    let turn_towards = random() > 0.5 ? 1 : -1
    yield* warn(turn_towards < 0 ? 'HARD LEFT' : 'HARD RIGHT')
    goal_target_turn = turn_towards
    yield* yield_time(5_000)
    goal_target_turn = 0
}
let challenge_jump = function*() {
    // receive a wall in front of you to jump over
    let start = Date.now()
    yield* warn('JUMP')
    let jump_wall_y = (player_y + RENDER_DIST + 2) | 0
    for (let i = 0; i < map_len_x; i++) {
        map[jump_wall_y][i] = true // create a wall
    }
    while (player_y < jump_wall_y && (Date.now() - start < 4_000)) {
        yield;
    }
    for (let i = 0; i < map_len_x; i++) {
        map[jump_wall_y][i] = false // tear down the wall
    }
}
let challenge_some_guy_in_front_of_you = function*() {
    if (goal_nth_place === 1) return; // no one is in front of us

    APPROACHING_RACER = [Math.round(random() * 3) + 8, player_y + RENDER_DIST + 2, 1]

    // Another pilot comes, and you have to hit them in the back to make sure you remain in 13th place
    yield* warn(`YOU APPROACH THE ${ordinal(goal_nth_place - 1)} CONTESTANT`)
    let end_at = Date.now() + 5_000
    while (1) {
        // CANCEL
        if (player_y > 900 || (Date.now() > end_at)) {
            console.log('canceled')
            break
        }
        // SUCCEED
        if (!player_iframes && abs(APPROACHING_RACER[0] - player_x) < 4 && abs(APPROACHING_RACER[1] - player_y) < 3 && abs(player_z - 4) < 8) {
            console.log('COLLISION SUCCESS')
            APPROACHING_RACER[2] = 2 // phase 2
            yield* yield_time(2_000)
            break
        }
        // FAIL
        if (player_y > APPROACHING_RACER[1] + 3) {
            goal_nth_place--
            console.log('MISSED THE GUY')
            break
        }
        yield;
    }

    APPROACHING_RACER = 0
}
let game_generator = function*() {
    let challenges = [challenge_some_guy_in_front_of_you, challenge_jump, challenge_hard_turn]

    for (let i = 0; i < 2; i++) {
        yield * yield_time(3_000); // normalcy time (decrease to increase difficulty)
        while (abs(player_y - map_len_y) < 400) {
            yield; // free normalcy because the map will wrap around and can break math
        }

        let chl = challenges[floor(random() * challenges.length)]
        yield * chl();
    }
}
let warn = function*(w) {
    warning = w
    yield* yield_time(800);
    warning = ''
}
let game_logic
let updateGoal = () => {
    if ((game_logic ||= game_generator()).next().done) {
        game_logic = 0
    }

    CURRENT_TURN = lerp(CURRENT_TURN, goal_target_turn, 0.05)
    if (goal_target_turn == 0 && abs(CURRENT_TURN) < 0.05) CURRENT_TURN = 0
}
let debug_info = () => {
    if (self.env === 'production') return ''
    return ` ${player_y.toFixed(2)}`
}
let warning = ''
let drawGoal = () => {
    ctx.fillStyle = warning ? (
        sin(GAME_TIME * 9) > 0 ? 'red' : 'yellow'
    ) : 'green'

    ctx.fillText(warning || ordinal(goal_nth_place) + debug_info(), halfWidth, 20)
}
