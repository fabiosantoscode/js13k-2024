
let game_position = 1

/** There's a "turn" in the track */
let CURRENT_TURN = 0
let JUMP_DISTANCE = 0
let target_turn = 0

let yield_time = function*(ms) {
    ms += Date.now()
    while (Date.now() < ms) {
        yield;
    }
}
// CHALLENGES
let hard_turn = function*() {
    // Turn left and right, try not to hit walls
    let turn_towards = random() > 0.5 ? 1 : -1
    yield* warn(turn_towards < 0 ? 'HARD LEFT' : 'HARD RIGHT')
    target_turn = turn_towards
    yield* yield_time(5_000)
    target_turn = 0
}
let jump = function*() {
    // receive a wall in front of you to jump over
    let start = Date.now()
    yield* warn('JUMP')
    JUMP_DISTANCE = player_y + RENDER_DIST + 2
    while (player_y < JUMP_DISTANCE && (Date.now() - start < 4_000)) {
        yield;
    }

    JUMP_DISTANCE = 0;
}
let game_generator = function*() {
    let challenges = [jump, hard_turn]

    for (let i = 0; i < 2; i++) {
        yield * yield_time(3_000); // normalcy time (decrease to increase difficulty)
        while (abs(player_y - map_len_y) < 200) {
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
    game_logic ||= game_generator();

    if (game_logic.next().done) {
        game_logic = null
    }

    CURRENT_TURN = lerp(CURRENT_TURN, target_turn, 0.05)
    if (target_turn == 0 && abs(CURRENT_TURN) < 0.05) CURRENT_TURN = 0
}
let warning = ''
let drawGoal = () => {
    let nx = ['th','st¤','nd','rd']
    let th = nx[game_position] || nx[0]
    ctx.font = '20px sans-serif'
    ctx.font = "20px 'Comic Sans MS'"

    ctx.fillStyle = warning ? (
        sin(GAME_TIME * 9) > 0 ? 'red' : 'yellow'
    ) : 'green'

    ctx.fillText(warning || `${game_position}${th} ${player_y}`, 20, 20)
}
