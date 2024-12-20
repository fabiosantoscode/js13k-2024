
/** There's a "turn" in the track */
let CURRENT_TURN = 0
let goal_nth_place = 13
let goal_target_turn = 0
let goal_target_turn_sharpness = 1 // 1: smoothly turn. 2: sharply turn
let PLAYER_NO_COLLIDE = 0
/** 0..1 */
let DIFFICULTY = 0
let LEVEL = 1
let ENDING_CUTSCENE = 0

let APPROACHING_RACER

let ordinal = place => {
    if (ENDING_CUTSCENE) {
        return ''
    } else {
        let nx = ['th','st','nd','rd']
        return place+(nx[place] || nx[0])
    }
}
let yield_time = function*(ms) {
    ms += game_now()
    while (game_now() < ms) yield;
}
let yield_space = function*(distance) {
    distance += player_y_nowrap
    while (player_y_nowrap < distance) yield;
}
// CHALLENGES
let current_challenge
let challenge_hard_turn = function*() {
    yield // Grep NOTE_WAIT_1
    // Turn left and right, try not to hit walls
    let turn_towards = random() > 0.5 ? 1 : -1
    yield* warn(turn_towards < 0 ? 'HARD LEFT' : 'HARD RIGHT')
    goal_target_turn = turn_towards
    goal_target_turn_sharpness = 2
    yield* yield_space(100)
    goal_target_turn_sharpness = 2
    goal_target_turn = 0
    yield* yield_space(10)
}
let challenge_jump = function*() {
    // receive a wall in front of you to jump over
    let start = game_now()
    yield* warn('JUMP')
    let jump_wall_y = (player_y + RENDER_DIST + 2) | 0
    for (let i = 0; i < map_len_x; i++) {
        map[jump_wall_y][i] = true // create a wall
    }
    while (player_y < jump_wall_y && (game_now() - start < 4_000)) {
        yield;
    }
    for (let i = 0; i < map_len_x; i++) {
        map[jump_wall_y][i] = false // tear down the wall
    }
}
let challenge_some_guy_in_front_of_you = function*() {
    if (goal_nth_place === 1) return; // no one is in front of us

    APPROACHING_RACER = [player_x > 10 ? 7 : 13, player_y + RENDER_DIST + 2, 1]

    // Another pilot comes, and you have to hit them in the back to make sure you remain in 13th place
    yield* warn(`${ordinal(goal_nth_place - 1)} CONTESTANT`)
    let cancel_at = game_now() + 8_000
    while (1) {
        // CANCEL
        if (player_y > 900 || (game_now() > cancel_at)) {
            // Cancel this (just to avoid infinite loop and math issues due to wrapping)
            break
        }
        // SUCCEED
        if (hasApproachingRacerBeenHit()) {
            APPROACHING_RACER[2] = 2 // phase 2 - be kicked forward
            yield* screen_message_success('SUCCESS')
            yield* yield_space(45)
            break
        }
        // FAIL
        if (hasApproachingRacerBeenSurpassed()) {
            goal_nth_place--
            yield* screen_message_success('FAILURE')
            throw {
                resetLevel: ['KICK THEM FORWARD', 'TRY AGAIN', 'FINISH IN 13TH PLACE']
            }
            break
        }
        yield;
    }

    APPROACHING_RACER = 0
}
let DEBUG_skip_to_level
let DEBUG_force_challenge
if (self.env !== 'production') {
    let level = +new URLSearchParams(location.search).get('level')
    if (level) DEBUG_skip_to_level = level
    
    let chall = new URLSearchParams(location.search).get('challenge')
    if (chall) DEBUG_force_challenge = chall
}
let transition_level = function*(on_finish_cutscene) {
    if (DEBUG_skip_to_level > LEVEL) {
      COLOR_reset_all_colors()
      on_finish_cutscene && on_finish_cutscene()
      return
    }
    PLAYER_NO_COLLIDE++

    let cutscene_fadeout = game_now() + 2500
    let cutscene_end = game_now() + 4000
    while (cutscene_end > game_now()) {
        let y = (player_y + RENDER_DIST + 10) | 0
        let y_end = y + 50
        while (y++ < y_end && y < map_len_y) {
            map[y][0] = true
            map[y][1] = true
            map[y][2] = true
            map[y][3] = true
            map[y][4] = true
            map[y][15] = true
            map[y][16] = true
            map[y][17] = true
            map[y][18] = true
            map[y][19] = true
        }

        let fadeout_point = abs(game_now() - cutscene_fadeout);
        let f_fadeout_point = round_n(fadeout_point, 250) / 1000
        if (f_fadeout_point <= 1) {
            if (on_finish_cutscene && f_fadeout_point == 0) {
                COLOR_reset_all_colors()
                on_finish_cutscene()
                on_finish_cutscene = 0
            }
            c.style.opacity = f_fadeout_point
            c.style.filter = `saturate(${lerp(100, 250, 1 - f_fadeout_point)}%)`
        }

        yield
    }

    PLAYER_NO_COLLIDE--
}
let level_generator = function*(level_length, no_jump) {
    if (self.env !== 'production') {
        if (DEBUG_skip_to_level > LEVEL) {
            return
        }
    }

    RETRY_WHEN_DEAD: while (1) {
        let this_level_ends_at = player_y_nowrap + level_length

        try {
            let challenges =
                //[challenge_some_guy_in_front_of_you]
                [challenge_some_guy_in_front_of_you, challenge_hard_turn]
            if (!no_jump) challenges.push(challenge_jump)

            if (self.env !== 'production') {
                if (DEBUG_force_challenge) {
                    challenges = DEBUG_force_challenge === 'hard_turn' ? [challenge_hard_turn] :
                        DEBUG_force_challenge === 'some_guy' ? [challenge_some_guy_in_front_of_you] :
                        DEBUG_force_challenge === 'jump' ? [challenge_jump] :
                            (() => {
                                throw new Error(DEBUG_force_challenge + ' unknown')
                            })()
                }
            }

            // Yield at the start so we can appreciate the scenery
            yield* yield_space(200);

            while (1) {
                if (
                // make sure we have space to do the challenge before the wrap around
                abs(player_y - map_len_y) > map_len_y - 600
                // no challenges during the cutscene
                && !ENDING_CUTSCENE
                ) {
                    let chl = challenges[floor(random() * challenges.length)];
                    current_challenge = chl
                    yield * chl();
                    current_challenge = null
                }

                yield * yield_space(90); // meters of track which are between challenges (decrease to increase difficulty)
                let distance_till_next_level = this_level_ends_at - player_y_nowrap
                if (distance_till_next_level < 200) {
                    return
                }
            }
        } catch (e) {
            current_challenge = null
            goal_target_turn = 0

            let {resetLevel} = e
            if (resetLevel) {
                COLOR_void++
                ENDING_CUTSCENE++
                for (let msg of resetLevel) yield* screen_message_failure(msg, 4000)
                ENDING_CUTSCENE--
                COLOR_void--
                continue
            } else {
                throw e
            }
        }
    }
}
let game_generator = (function*() {
    // yield; // Don't start yet (`game_generator` is called immediately)

    // Make sure we are ready
    if (self.env === 'production') {
      yield* yield_space(100);

      yield* screen_message_success('Press A/D to move', 4000);
      yield* screen_message_success('Press space to jump', 4000);
      yield* screen_message_success('Or tap buttons below', 4000);
      yield* screen_message_success('Please Finish In 13th Place', 4000);
    }

    // DIFFICULTY = 0 - starts at zero
    // transition_level(() => {}) // do nothing here because it's the first level.
    yield* level_generator(1500)

    // Neon night
    yield* transition_level(() => {
        COLOR_stars = 'rgba(255,255,255,.6)'
        COLOR_sky_gradient_start = '#37c'
        COLOR_sky_gradient_end = '#600'
        COLOR_road_gradient_start = '#133'
        COLOR_road_gradient_end = 'brown'
        COLOR_road_checkerboard = null
        COLOR_tree_hue = 320
        COLOR_wall_hue = 230
        COLOR_abyss_color = 'rgba(180,50,150,.4)'
        COLOR_player_brightness = 1.8
    });
    DIFFICULTY = 2 / 6
    LEVEL = 2
    yield* level_generator(1500)

    // Macintosh plus
    yield* transition_level(() => {
        COLOR_stars = null
        COLOR_sky_gradient_start = '#ff899c'
        COLOR_sky_gradient_end = '#ff899c'
        COLOR_sky_shapes = 1
        COLOR_road_gradient_start = null
        COLOR_road_gradient_end = null
        COLOR_road_checkerboard = ['#d79', '#122']
        COLOR_road_grid = null
        COLOR_tree_hue = 195.0
        COLOR_wall_hue = 34.0
        COLOR_tree_sat = .02
        COLOR_wall_sat = .24
        COLOR_tree_lum = .5
        COLOR_wall_lum = .4
        COLOR_abyss_color = '#e1a1fe'
        COLOR_text_nth_place = '#87e7c0'
        COLOR_player_brightness = 1.8
        COLOR_wall_randomness_biome = 8
    });
    DIFFICULTY = 3 / 6
    LEVEL = 3
    yield* level_generator(2000)

    // Digital red
    yield* transition_level(() => {
        COLOR_stars = 'red'
        COLOR_road_gradient_start = 0
        COLOR_road_gradient_end = 0
        COLOR_road_grid = 'green'
        COLOR_road_checkerboard = null
        COLOR_tree_hue = 0
        COLOR_tree_lum = .3
        COLOR_wall_hue = 145
        COLOR_wall_lum = .1
        COLOR_player_brightness = 0
    });
    DIFFICULTY = 4 / 6
    LEVEL = 4
    yield* level_generator(2000)

    // Rainbow road
    yield* transition_level(() => {
        COLOR_moon = '#ddd'
        COLOR_road_rainbow = ['#c83898', '#c89058', '#c8c020', '#08c828', '#18c0d8', '#6060e8', '#b008e8']
        COLOR_stars = 'white'
        COLOR_sky_gradient_end = 'black'
        COLOR_sky_gradient_start = 'black'
        COLOR_wall_sat = 86
        COLOR_wall_lum = .2
        COLOR_wall_hue = 250
        COLOR_tree_sat = 0
        COLOR_tree_lum = .1
        COLOR_player_brightness = 2
        COLOR_wall_hidden = 1
        COLOR_wall_randomness_biome = 9
    });
    DIFFICULTY = 5 / 6
    LEVEL = 5
    yield* level_generator(2500, 1 /* forbid jumps on rainbow road */)

    // Trippy black void
    yield* transition_level(() => {
        ENDING_CUTSCENE++
        // Full circle. Colors were set by COLOR_reset_all_colors
        COLOR_void = 1 // Black void effect
    })
    DIFFICULTY = 6 / 6
    LEVEL = 6

    if (goal_nth_place === 13) {
        yield* screen_message_success('Congratulations', 4000);
        yield* yield_time(400);
        yield* screen_message_success('You have Finish In 13th Place', 4000);
        yield* yield_time(400);
        yield* screen_message_success('You have failed Successfully', 4000);
        yield* yield_time(400);
        yield* screen_message_success('You have worked hard and', 4000);
        yield* yield_time(400);
        yield* screen_message_success('now the quadrillionaire', 4000);
        yield* yield_time(400);
        yield* screen_message_success('bought another space yacht', 4000);
    } else if (goal_nth_place === 1) {
        /* this is impossible now 
        yield* screen_message_success("Congratulations", 4000);
        yield* yield_time(400);
        yield* screen_message_success("You have Finish In 1th Place", 4000);
        yield* yield_time(400);
        yield* screen_message_success("You have failed by Succeeding", 4000);
        yield* yield_time(400);
        yield* screen_message_success("You have worked hard and", 4000);
        yield* yield_time(400);
        yield* screen_message_success("You are in racing hall of fame", 4000);
        yield* yield_time(400);
        yield* screen_message_success("And also DEAD ...", 4000);
        yield* yield_time(400);
        yield* screen_message_success("Should have Finish In 13th Place", 4000);
        */
    } else {
        /* this is impossible now 
        yield* screen_message_failure('Unfortunately', 4000);
        yield* yield_time(400);
        yield* screen_message_failure('You have failed by succeeding', 4000);
        yield* yield_time(400);
        yield* screen_message_failure('Next time', 4000);
        yield* yield_time(400);
        yield* screen_message_failure('Please Finish In 13th Place', 4000);
        */
    }

    yield* yield_time(2000);
    yield* screen_message_success("SPECIAL THANKS TO", 4000);
    yield* yield_time(400);
    yield* screen_message_success("Gina Vasile", 4000);
    yield* yield_time(400);
    yield* screen_message_success("Antonio \"Toni\" Saraiva", 4000);
    yield* yield_time(400);
    yield* screen_message_success("IgorFIE & Dosaki", 4000);
    yield* yield_time(400);

    yield* level_generator(0)
    yield* transition_level(() => {
        // Full circle. Colors were set by COLOR_reset_all_colors
        // Though first, we go into a trippy black void
        // Black void effect
        COLOR_void = 0
        ENDING_CUTSCENE--
    });


    DIFFICULTY = 6 / 6
    LEVEL = 6

    // TODO yield* ending()
})()
/** Generate a permanently changing CURRENT_TURN */
let permacurve_generator = (function* () { while (1) {
    yield;

    if (current_challenge !== challenge_hard_turn) {
        let current_turn_end_time = GAME_TIME_SECS + lerp(0.5, 6, random())
        let target_turn = lerp((goal_target_turn/2) - .6, (goal_target_turn/2) + .6, random())
        goal_target_turn_sharpness = lerp(0.3, 1.5, random()) // how suddenly does this turn go into this angle

        while (GAME_TIME_SECS < current_turn_end_time) {
            yield

            if (current_challenge === challenge_hard_turn) {
                // Reset state for challenge_hard_turn to take over
                // NOTE_WAIT_1: challenge_hard_turn yields 1 frame, so there's no chance this will interfere
                goal_target_turn = 0
                goal_target_turn_sharpness = 1
                break
            } else {
                goal_target_turn = target_turn
            }
        }
    }

} })()
let warn = function*(w, time) {
    warning = w;
    yield* yield_time(time||800);
    warning = '';
}
let screen_message_success = function*(w, time) {
    success = w;
    yield* yield_time(time||800);
    success = '';
}
let screen_message_failure = function*(w, time) {
    failure = w;
    yield* yield_time(time||800);
    failure = '';
}
let updateGoal = () => {
    game_generator.next();
    permacurve_generator.next();

    // Maintain CURRENT_TURN
    CURRENT_TURN = lerp(CURRENT_TURN, goal_target_turn, 0.05 * goal_target_turn_sharpness);
    if (goal_target_turn == 0 && abs(CURRENT_TURN) < 0.05) CURRENT_TURN = 0;
};
let debug_info = () => {
    if (self.env === 'production') return '';
    return ` ${game_now()}`;
};
let warning = '';
let success = '';
let failure = '';
let drawGoal = () => {
    let text_y = 20

    if (ENDING_CUTSCENE) {
        warning = '';
        text_y = 60
    }
    ctx.fillStyle =
        warning ? (sin(GAME_TIME * 9) > 0 ? 'red' : 'yellow')
        : failure ? (sin(GAME_TIME * 9) > 0 ? 'red' : 'purple')
        : success ? (sin(GAME_TIME * 9) > 0 ? 'purple' : 'blue')
        : COLOR_text_nth_place;

    ctx.fillText(warning || success || failure || ordinal(goal_nth_place) + debug_info(), halfWidth, text_y);
};
