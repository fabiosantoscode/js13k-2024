
let game_position = 1

let updateGoal = () => {}
let drawGoal = () => {
    let nx = ['th','st¤','nd','rd']
    let th = nx[game_position] || nx[0]
    ctx.font = '20px sans-serif'
    ctx.font = "20px 'Comic Sans MS'"
    ctx.fillText(`${game_position}${th}`, 20, 20)
}