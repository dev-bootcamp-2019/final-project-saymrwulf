import getBetInstance from "../contracts/bet"

export function fetchOpenGames() {
    // NOTE: Using the read-only instance
    const Bet = getBetInstance(false)

    return (dispatch, getState) => {
        Bit.methods.getOpenGames().call().then(games => {
            return Promise.all(games.map(gameId => {
                return Bet.methods.getGameInfo(gameId).call()
                    .then(gameData => {
                        gameData.id = gameId
                        return gameData
                    })
            })).then(games => {
                dispatch({ type: "SET", openGames: games })
            })
        })
    }
}
