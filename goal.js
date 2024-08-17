
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
    while (Date.now() < ms) yield;
}
let yield_space = function*(distance) {
    distance += player_y_nowrap
    while (player_y_nowrap < distance) yield;
}
// CHALLENGES
let challenge_hard_turn = function*() {
    // Turn left and right, try not to hit walls
    let turn_towards = random() > 0.5 ? 1 : -1
    yield* warn(turn_towards < 0 ? 'HARD LEFT' : 'HARD RIGHT')
    goal_target_turn = turn_towards
    yield* yield_space(200)
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

    APPROACHING_RACER = [player_x > 10 ? 5 : 15, player_y + RENDER_DIST + 2, 1]

    // Another pilot comes, and you have to hit them in the back to make sure you remain in 13th place
    yield* warn(`YOU APPROACH THE ${ordinal(goal_nth_place - 1)} CONTESTANT`)
    let cancel_at = Date.now() + 8_000
    while (1) {
        // CANCEL
        if (player_y > 900 || (Date.now() > cancel_at)) {
            console.log('canceled')
            break
        }
        // SUCCEED
        if (!player_iframes && abs(APPROACHING_RACER[0] - player_x) < 4 && abs(APPROACHING_RACER[1] - player_y) < 3 && abs(player_z - 2) < 2) {
            APPROACHING_RACER[2] = 2 // phase 2 - be kicked forward
            yield* screen_message_success('SUCCESS')
            yield* yield_space(45)
            break
        }
        // FAIL
        if (player_y > APPROACHING_RACER[1] + 3) {
            goal_nth_place--
            yield* screen_message_success('FAILURE')
            break
        }
        yield;
    }

    APPROACHING_RACER = 0
}
let game_generator = function*() {
    let challenges =
        //[challenge_some_guy_in_front_of_you]
        [challenge_some_guy_in_front_of_you, challenge_jump, challenge_hard_turn]

    for (let i = 0; i < 2; i++) {
        yield * yield_space(90); // normalcy time (decrease to increase difficulty)
        while (abs(player_y - map_len_y) < 400) {
            yield; // free normalcy because the map will wrap around and can break math
        }

        let chl = challenges[floor(random() * challenges.length)];
        yield * chl();
    }
}
let warn = function*(w) {
    warning = w;
    yield* yield_time(800);
    warning = '';
}
let screen_message_success = function*(w) {
    success = w;
    yield* yield_time(800);
    success = '';
}
let screen_message_failure = function*(w) {
    failure = w;
    yield* yield_time(800);
    failure = '';
}
let game_logic;
let updateGoal = () => {
    if ((game_logic ||= game_generator()).next().done) {
        game_logic = 0;
    }

    CURRENT_TURN = lerp(CURRENT_TURN, goal_target_turn, 0.05);
    if (goal_target_turn == 0 && abs(CURRENT_TURN) < 0.05) CURRENT_TURN = 0;
};
let speed_info = () => {
    return ` ${(prev_mov_y * FPS).toFixed(2)}`;
};
let debug_info = () => {
    if (self.env === 'production') return '';
    return ` ${player_y.toFixed(2)}`;
};
let warning = '';
let success = '';
let failure = '';
let drawGoal = () => {
    ctx.fillStyle =
        warning ? (
            sin(GAME_TIME * 9) > 0 ? 'red' : 'yellow'
        )
        : failure ? sin(GAME_TIME * 9) > 0 ? 'red' : 'purple'
        : success ? sin(GAME_TIME * 9) > 0 ? 'purple' : 'blue'
        : 'green';

    ctx.fillText(warning || success || failure || ordinal(goal_nth_place) + speed_info() + debug_info(), halfWidth, 20);
};
