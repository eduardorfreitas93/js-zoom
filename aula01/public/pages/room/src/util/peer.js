class PeerBuilder {
  constructor({ peerConfig }) {
    this.peerConfig = peerConfig

    const defaultFunctionValue = () => {}

    this.onError = defaultFunctionValue
    this.onCallReceived = defaultFunctionValue
    this.onConnectionOpened = defaultFunctionValue
    this.onPeerStreamRecived = defaultFunctionValue
    this.onCallError = defaultFunctionValue
    this.onCallClose = defaultFunctionValue
  }

  setOnCallError(fn) {
    this.onCallError(fn)

    return this
  }

  setOnCallClose(fn) {
    this.onCallClose(fn)

    return this
  }

  setOnError(fn) {
    this.onError = fn

    return this

  }
  setOnCallReceived(fn) {
    this.onCallReceived = fn

    return this
  }
  setOnConnectionOpened(fn) {
    this.onConnectionOpened = fn

    return this
  }
  setOnPeerStreamRecived(fn) {
    this.onPeerStreamRecived = fn

    return this
  }

  _prepareCallEvent(call) {
    call.on('stream', stream => this.onPeerStreamRecived(call, stream))
    call.on('error', error => this.onCallError(call, error))
    call.on('close', _ => this.onCallClose(call))

    this.onCallReceived(call)
  }

  // add o comportamento dos eventos de call para quem ligar, (sobrescrever o call do module Peer)
  _preparePeerInstanceFunction(peerModule) {
    class PeerCustomeModule extends peerModule {}

    const peerCall = PeerCustomeModule.prototype.call
    const context = this

    // sobrescrevendo call do Peer
    PeerCustomeModule.prototype.call = function (id, stream) {
      const call = peerCall.apply(this, [id, stream])

      // intercepta o call e adiciona todos os eventos de chamada para quem liga também
      context._prepareCallEvent(call)

      return call
    }

    return PeerCustomeModule
  }

  build() {
    // const peer = new Peer(...this.peerConfig)

    const PeerCustomeInstance = this._preparePeerInstanceFunction(Peer)
    const peer = new PeerCustomeInstance(...this.peerConfig)

    peer.on('error', this.onError)
    peer.on('call', this._prepareCallEvent.bind(this))

    return new Promise(resolve => peer.on('open', id => {
      this.onConnectionOpened(peer)

      return resolve(peer)
    }))
  }
}
