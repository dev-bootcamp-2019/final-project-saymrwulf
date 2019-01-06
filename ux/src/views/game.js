import React, { Component } from "react"
import { connect } from "react-redux"
import { Row, Col, Divider, Button, Spin, Icon, message, notification } from "antd"

import Media from "react-media"
import getBetInstance from "../contracts/bet"
import { getWebSocketWeb3, getInjectedWeb3 } from "../contracts/web3"
import LoadingView from "../views/loading"
import MessageView from "../views/message"

const CONTRACT_TIMEOUT = 1000 * 60 * 10 // 10 minutes by default

class GameView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            loadingGameInfo: true,
            confirmLoading: false,
            game: null
        }
    }

    componentDidMount() {
        this.setState({ loadingGameInfo: true })

        this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            // Check if we need to confirm the game
            return this.checkConfirmGame(game)
        }).then(() => {
            return this.revealWinner(game)
        }).catch(err => {
            this.setState({ loadingGameInfo: false })
        })

        const Bet = getBetInstance()

        this.acceptedEvent = Bet.events.GameAccepted({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameAccepted(event))
            .on('error', err => message.error(err && err.message || err))

        this.startedEvent = Bet.events.GameStarted({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameStarted(event))
            .on('error', err => message.error(err && err.message || err))

        this.endedEvent = Bet.events.GameEnded({
            filter: { opponent: this.props.accounts && this.props.accounts[0] },
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameEnded(event))
            .on('error', err => message.error(err && err.message || err))
    }

    componentWillUnmount() {
        this.acceptedEvent.unsubscribe()
        this.startedEvent.unsubscribe()
        this.endedEvent.unsubscribe()
    }

    // Events originated by the opponent

    onGameAccepted() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            notification.success({
                message: 'Game accepted',
                description: `${game.nick2} has accepted the game!`
            })
            return this.checkConfirmGame(game)
        })
    }

    onGameStarted() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            notification.success({
                message: 'Game confirmed',
                description: `${game.nick1} has confirmed the game!`
            })
        })
    }

    onGameEnded() {
        return this.fetchGameStatus().then(game => {
            this.setState({ game, loadingGameInfo: false })

            let type = 'info', message = "Game ended", description = ""

            if (game.player1 == this.props.accounts[0]) {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                    if (game.amount != "0") description += ". You can withdraw your initial bet."
                }
                else if (game.status == "11") {
                    type = "success"
                    description = "You have won the game!"
                    if (game.amount != "0") description += " You can withdraw the full amount."
                }
                else if (game.status == "12") {
                    type = "warning"
                    description = `${game.nick2} has won the game`
                }
                else return
            }
            else if (game.player2 == this.props.accounts[0]) {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                    if (game.amount != "0") description += ". You can withdraw your initial bet."
                }
                else if (game.status == "11") {
                    type = "warning"
                    description = `${game.nick1} has won the game`
                }
                else if (game.status == "12") {
                    type = "success"
                    description = "You have won the game!"
                    if (game.amount != "0") description += " You can withdraw the full amount."
                }
                else if (game.status == "11") {
                    type = "warning"
                    description = `${game.nick1} has won the game`
                }
                else return
            }
            else {
                if (game.status == "10") {
                    description = "The game has ended in draw"
                }
                else if (game.status == "11") {
                    description = `${game.nick1} has won the game`
                }
                else if (game.status == "12") {
                    description = `${game.nick2} has won the game`
                }
                else return
            }

            notification[type]({
                message,
                description
            })
        })
    }

    // Call helper

    fetchGameStatus() {
        const Bet = getBetInstance()

        const result = {}


        return Bet.methods.getGameInfo(this.props.match.params.id).call().then(gameInfo => {
            result.amount = gameInfo.amount
            result.nick1 = gameInfo.nick1
            result.nick2 = gameInfo.nick2
            result.status = gameInfo.status

            return Bet.methods.getGamePlayers(this.props.match.params.id).call()
        }).then(players => {
            result.player1 = players.player1
            result.player2 = players.player2

            return Bet.methods.getGameTimestamp(this.props.match.params.id).call()
        }).then(timestamp => {
            result.lastTransaction = timestamp * 1000

            return Bet.methods.getGameWithdrawals(this.props.match.params.id).call()
        }).then(withdrawals => {
            result.withdrawn1 = withdrawals.player1
            result.withdrawn2 = withdrawals.player2

            return result
        })
    }

    // Transactions

    checkConfirmGame(game) {
        if (this.state.confirmLoading || game.status != "0" || game.player2.match(/^0x0+$/) || game.player1 != this.props.accounts[0]) {
            return
        }

        let Bet = getBetInstance(true)

        let data = this.props.status.createdGames[this.props.match.params.id]
        if (!data) {
            return notification.error({
                message: 'Failed to confirm the game',
                description: 'The random number and the salt can\'t be found'
            })
        }

        this.setState({ confirmLoading: true })

        return Bet.methods.confirmGame(this.props.match.params.id, data.number, data.salt)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ confirmLoading: false })

                if (!tx.events.GameStarted || !tx.events.GameStarted.returnValues) {
                    throw new Error("The transaction failed")
                }

                notification.success({
                    message: 'Game confirmed',
                    description: 'The game is on. Good luck!',
                })
                this.props.dispatch({ type: "REMOVE_CREATED_GAME", id: game.id })

                return this.fetchGameStatus().then(game => {
                    this.setState({ game })
                })
            })
            .catch(err => {
                this.setState({ confirmLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to confirm the game',
                    description: msg
                })
            })
    }

    revealWinner(game) {
        if (this.state.confirmLoading || game.status != "0" || game.player2.match(/^0x0+$/) || game.player1 != this.props.accounts[0]) {
            return
        }

        let Bet = getBetInstance(true)

        let data = this.props.status.createdGames[this.props.match.params.id]
        if (!data) {
            return notification.error({
                message: 'Failed to reveal the winner',
                description: 'Failed to reveal the winnerrr'
            })
        }

        return Bet.methods.electWinner(this.props.match.params.id)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ confirmLoading: false })

                if (!tx.events.GameStarted || !tx.events.GameStarted.returnValues) {
                    throw new Error("The transaction failed")
                }

                notification.success({
                    message: 'Game ended with a Winner',
                    description: 'Game has ended with a Winner.',
                })
                //this.props.dispatch({ type: "REMOVE_CREATED_GAME", id: game.id })

                return this.fetchGameStatus().then(game => {
                    this.setState({ game })
                })
            })
            .catch(err => {
                this.setState({ confirmLoading: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to confirm the game',
                    description: msg
                })
            })
    }

    requestWithdrawal() {
        let Bet = getBetInstance(true)

        this.setState({ withdrawLoading: true })

        return Bet.methods.withdraw(this.props.match.params.id)
            .send({ from: this.props.accounts[0] })
            .then(tx => {
                this.setState({ withdrawLoading: false })

                notification.success({
                    message: "Success",
                    description: "The money has been withdrawn"
                })

                this.setState({ loadingGameInfo: true })

                return this.fetchGameStatus().then(game => {
                    this.setState({ game, loadingGameInfo: false })
                })
            })
            .catch(err => {
                this.setState({ withdrawLoading: false, loadingGameInfo: false })

                let msg = err.message.replace(/\.$/, "").replace(/Returned error: Error: MetaMask Tx Signature: /, "")
                notification.error({
                    message: 'Unable to complete the transaction',
                    description: msg
                })
            })
    }

    goBack() {
        document.location.hash = "#/"
    }

    // Render helpers

    getStatus() {
        if (!this.state.game || !this.props.accounts) return ""
        else if (this.state.game.status == "0") {
            if (this.state.game.player2.match(/^0x0+$/)) {
                return "Waiting for an opponent to accept the game"
            }
            else {
                if (this.state.game.player1 == this.props.accounts[0]) {
                    return "You need to confirm the game..."
                }
                else {
                    return `Waiting for ${this.state.game.nick1} to confirm the game`
                }
            }
        }
        else if (this.state.game.status == "1") {
            if (this.state.game.player1 == this.props.accounts[0]) {
                return "It's your turn"
            }
            else {
                return `Waiting for ${this.state.game.nick1}`
            }
        }
        else if (this.state.game.status == "2") {
            if (this.state.game.player2 == this.props.accounts[0]) {
                return "It's your turn"
            }
            else {
                return `Waiting for ${this.state.game.nick2}`
            }
        }
        else if (this.state.game.status == "10") {
            return "The game ended in draw"
        }
        else if (this.state.game.status == "11") {
            if (this.state.game.player1 == this.props.accounts[0]) {
                return "Congratulations! You are the winner"
            }
            else {
                return `${this.state.game.nick1} is the winner of this game`
            }
        }
        else if (this.state.game.status == "12") {
            if (this.state.game.player2 == this.props.accounts[0]) {
                return "Congratulations! You are the winner"
            }
            else {
                return `${this.state.game.nick2} is the winner of this game`
            }
        }
    }

    getTimeStatus() {
        let action = "", subject = "", message = ""
        let remaining = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()

        if (!this.state.game || !this.props.accounts) return "-"
        else if (this.state.game.status == "0") {
            if (this.state.game.player2.match(/^0x0+$/)) {
                subject = (this.state.game.player1 == this.props.accounts[0]) ? "You" : this.state.game.nick1
                action = "cancel the game"
            }
            else {
                subject = (this.state.game.player2 == this.props.accounts[0]) ? "You" : this.state.game.nick2
                action = "claim the game"
            }
        }
        else if (this.state.game.status == "1") {
            action = "claim the game"

            if (this.state.game.player2 == this.props.accounts[0]) {
                subject = "You"
            }
            else {
                subject = this.state.game.nick2
            }
        }
        else if (this.state.game.status == "2") {
            action = "claim the game"

            if (this.state.game.player1 == this.props.accounts[0]) {
                subject = "You"
            }
            else {
                subject = this.state.game.nick1
            }
        }
        else {
            return ""
        }

        remaining /= 1000 // in seconds

        if (remaining >= 120) {
            return `Remaining time: ${Math.round(remaining / 60)} minutes before ${subject} can ${action}`
        }
        else if (remaining >= 60) {
            return `Remaining time: About one minute before ${subject} can ${action}`
        }
        else if (remaining >= 0) {
            return `Remaining time: ${Math.round(remaining)} seconds before ${subject} can ${action}`
        }
        else {
            return `Out of time: ${subject} could ${action}`
        }
    }

    canWithdraw() {
        const remaining = (this.state.game.lastTransaction + CONTRACT_TIMEOUT) - Date.now()

        if (!this.state.game || !this.props.accounts) return false
        else if (this.state.game.player1 != this.props.accounts[0] &&
            this.state.game.player2 != this.props.accounts[0]) return false
        else if (this.state.game.status == "0") {
            if (remaining > 0) return false
            else if (this.state.game.player2.match(/^0x0+$/)) { // not accepted yet
                return this.state.game.player1 == this.props.accounts[0]
            }
            else { // not confirmed
                return this.state.game.player2 == this.props.accounts[0]
            }
        }
        else if (this.state.game.status == "1") {
            if (remaining > 0) return false
            else return this.state.game.player2 == this.props.accounts[0]
        }
        else if (this.state.game.status == "2") {
            if (remaining > 0) return false
            else return this.state.game.player1 == this.props.accounts[0]
        }
        else if (this.state.game.status == "10") {
            if (this.state.game.player1 == this.props.accounts[0] && !this.state.game.withdrawn1) {
                return true
            }
            else if (this.state.game.player2 == this.props.accounts[0] && !this.state.game.withdrawn2) {
                return true
            }
            return false
        }
        else if (this.state.game.status == "11") {
            if (this.state.game.withdrawn1) return false
            return this.state.game.player1 == this.props.accounts[0]
        }
        else if (this.state.game.status == "12") {
            if (this.state.game.withdrawn2) return false
            return this.state.game.player2 == this.props.accounts[0]
        }
        return false
    }

    // RENDER METHODS

    renderMobile() {
        let web3 = getWebSocketWeb3()

        return <Row>
            <Col md={24}>
                <div className="card">
                    <h1 className="light">Current game</h1>
                    <p id="status" className="light">{this.getStatus()}</p>
                    <p id="timer" className="light">{this.getTimeStatus()}</p>

                    <Divider />
                    <Divider />
                    {
                        (this.canWithdraw() && this.state.game && this.state.game.amount != 0) ? [
                            <Button id="withdraw" key="1" type="primary" className="width-100"
                                onClick={() => this.requestWithdrawal()}>Withdraw {web3.utils.fromWei(this.state.game.amount)} Ξ</Button>,
                            <br key="3" />,
                            <br key="4" />
                        ] : null
                    }
                    <Button id="back" type="primary" className="width-100" onClick={() => this.goBack()}>Go back</Button>
                </div>
            </Col>
        </Row>
    }

    renderDesktop() {
        // this.state.gameId
        let web3 = getWebSocketWeb3()

        return <Row gutter={48}>
            <Col md={12}>
                <div className="card">
                    <h1 className="light">Current game</h1>
                    <Divider />
                </div>
            </Col>
            <Col md={12}>
                <div className="card">
                    <h1 className="light">Game status</h1>
                    <Divider />
                    {
                        (this.state.loadingGameInfo || this.state.confirmLoading || this.state.withdrawLoading) ?
                            <div className="loading-spinner">Waiting  <Spin indicator={<Icon type="loading" style={{ fontSize: 14 }} spin />} /> </div> :
                            <div>
                                <p id="status" className="light">{this.getStatus()}</p>
                                <p id="timer" className="light">{this.getTimeStatus()}</p>
                                {
                                    this.state.game ? <p id="bet" className="light">Game bet: {web3.utils.fromWei(this.state.game.amount)} Ξ</p> : null
                                }

                                {
                                    (this.canWithdraw() && this.state.game && this.state.game.amount != 0) ? [
                                        <Divider key="0" />,
                                        <Button id="withdraw" key="1" type="primary" className="width-100"
                                            onClick={() => this.requestWithdrawal()}>Withdraw {web3.utils.fromWei(this.state.game.amount)} Ξ</Button>,
                                        <br key="3" />,
                                        <br key="4" />
                                    ] : null
                                }
                                <Button id="back" type="primary" className="width-100" onClick={() => this.goBack()}>Go back</Button>
                            </div>
                    }

                </div>
            </Col>
        </Row>
    }

    render() {
        if (this.state.loadingGameInfo) {
            return <LoadingView />
        }
        else if (!this.state.game || !this.state.game.player1 || this.state.game.player1.match(/^0x0+$/)) {
            return <MessageView message="It looks like the game does not exist" />
        }

        return <div id="game">
            <Media query="(max-width: 767px)">
                {
                    matches => matches ? this.renderMobile() : this.renderDesktop()
                }
            </Media>
        </div>
    }
}

export default connect(({ accounts, status }) => ({ accounts, status }))(GameView)
