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
        this.usersRecordings = new Map()
    }

    static initialize(deps) {
        const instance = new Business(deps)
        return instance._init()
    }

    async _init() {
        // precisa passar o .bind porque a função não é uma clouser, então eu preciso pegar o context (this) da business
        this.view.configureRecordButton(this.onRecordPressed.bind(this))

        this.currentStream = await this.media.getCamera()

        this.socket = this.socketBuilder
          .setOnUserConnected(this.onUserConnected())
          .setOnUserDisconnected(this.onUserDisconnected())
          .build()

      // não precisa passar o .bind porque as funções são clouser
        this.currentPeer = await this.peerBuilder
          .setOnError(this.onPeerError())
          .setOnConnectionOpened(this.onPeerConnectionOpened())
          .setOnCallReceived(this.onPeerCallReceived())
          .setOnPeerStreamRecived(this.onPeerStreamRecived())
          .setOnCallError(this.onPeerCallError())
          .setOnCallClose(this.onPeerCallClose())
          .build()

        this.addVideoStream(this.currentPeer.id)
    }

    addVideoStream(userId, stream = this.currentStream) {
        const recorderInstance = new Recorder(userId, stream)

        this.usersRecordings.set(recorderInstance.filename, recorderInstance)

        if (this.recordingEnable) {
          recorderInstance.startRecording()
        }

        const isCurrentId = false
        this.view.renderVideo({
            userId,
            muted: true,
            stream,
            isCurrentId
        })
    }

    // closure func
    onUserConnected() {
        return userId => {
            console.log('user connected!', userId)
            // Toda vez que um usuario se conectar no socket, todos os usuarios ligam para esse novo usuario
            this.currentPeer.call(userId, this.currentStream)
        }
    }

    onUserDisconnected() {
        return userId => {
            console.log('user disconnected!', userId)

          if (this.peers.has(userId)) {
            this.peers.get(userId).call.close()
            this.peers.delete(userId)
          }

          this.view.setParticipants(this.peers.size)
          this.view.removerVideoElement(userId)
        }
    }

    onPeerError () {
      return error => {
        console.error('error on peer', error);
      }
    }

    onPeerConnectionOpened () {
      return peer => {
        const id = peer.id
        this.socket.emit('join-room', this.room, id)
      }
    }

    onPeerCallReceived () {
        return call => {
          console.log('answering call', call);
          // Responder call, quando alguem ligar, ele responde com o stream do video
          call.answer(this.currentStream)
        }
    }

    // Quando ele recebe o stream de video/audio ele add o video na tela
    onPeerStreamRecived () {
      return (call, stream) => {
        const callerId = call.peer
        this.addVideoStream(callerId, stream)

        this.peers.set(callerId, { call })

        this.view.setParticipants(this.peers.size)
      }
    }

  onPeerCallError() {
      return (call, error) => {
        console.log('an call error ocurred!', error);
        this.view.removerVideoElement(call.peer)
      }
  }

  onPeerCallClose() {
    return (call) => {
      console.log('an call close!');
    }
  }

  onRecordPressed(recordingEnable) {
      this.recordingEnable = recordingEnable
    console.log('pressionou', recordingEnable)

    for(const [key, value] of this.usersRecordings) {
      if (this.recordingEnable) {
        value.startRecording()
        continue;
      }
      this.stopRecordig(key)
    }
  }

  // se um usuario entrar e sair da call durante uma gravação precisamos parar as gravações anteriores dele
  async stopRecordig(userId) {
      const usersRecording = this.usersRecordings

    for (const [key, value] of usersRecording) {
      const isContextUser = key.includes(userId)

      if(!isContextUser) continue;

      const rec = value
      const isRecordingActive = rec.recordingActive

      if(!isRecordingActive) continue;

      await rec.stopRecordig()
    }
  }
}
