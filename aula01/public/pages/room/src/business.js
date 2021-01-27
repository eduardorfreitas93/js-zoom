class Business {
    constructor({ room, media, view, socketBuilder, peerBuilder }) {
        this.room = room
        this.media = media
        this.view = view

        this.socketBuilder = socketBuilder
        this.peerBuilder = peerBuilder

        this.currentStream = {}
        this.socket = {}
        this.currentPeer = {}

        this.peers = new Map()
    }

    static initialize(deps) {
        const instance = new Business(deps)
        return instance._init()
    }

    async _init() {
        this.currentStream = await this.media.getCamera()

        this.socket = this.socketBuilder
          .setOnUserConnected(this.onUserConnected())
          .setOnUserDisconnected(this.onUserDisconnected())
          .build()

        this.currentPeer = await this.peerBuilder
          .setOnError(this.onPeerError())
          .setOnConnectionOpened(this.onPeerConnectionOpened())
          .setOnCallReceived(this.onPeerCallReceived())
          .setOnPeerStreamRecived(this.onPeerStreamRecived())
          .build()

        this.addVideoStream('test01')
    }

    addVideoStream(userId, stream = this.currentStream) {
        const isCurrentId = false
        this.view.renderVideo({
            userId,
            muted: true,
            stream,
            isCurrentId
        })
    }

    // closure func
    onUserConnected = function() {
        return userId => {
            console.log('user connected!', userId)
            // Toda vez que um usuario se conectar no socket, todos os usuarios ligam para esse novo usuario
            this.currentPeer.call(userId, this.currentStream)
        }
    }

    onUserDisconnected = function() {
        return userId => {
            console.log('user disconnected!', userId)
        }
    }

    onPeerError = function () {
      return error => {
        console.error('error on peer', error);
      }
    }

    onPeerConnectionOpened = function () {
      return peer => {
        const id = peer.id
        this.socket.emit('join-room', this.room, id)
      }
    }

    onPeerCallReceived = function () {
        return call => {
          console.log('answering call', call);
          // Responder call, quando alguem ligar, ele responde com o stream do video
          call.answer(this.currentStream)
        }
    }

    // Quando ele recebe o stream de video/audio ele add o video na tela
    onPeerStreamRecived = function () {
      return (call, stream) => {
        const callerId = call.peer
        this.addVideoStream(callerId, stream)

        this.peers.set(callerId, { call })

        this.view.setParticipants(this.peers.size)
      }
    }
}
