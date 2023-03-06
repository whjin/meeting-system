function initScreencast(options) {
  let localStream = null;
  let manageId = options.manageId;
  let roomId = options.roomId;
  let socket = options.socket;
  let peer = null;
  let socketId;

  createRtcConnect();

  function createRtcConnect() {
    if (!peer) {
      peer = new RTCPeerConnection(iceServersConfig);
      startCamera();
      peer.ontrack = (e) => {
        if (e && e.streams) {
          localStream = e.streams[0];
        }
      };

      peer.onicecandidate = (e) => {
        if (e && e.candidate) {
          let message = {
            manageId,
            roomId,
            candidate: e.candidate,
            socketId,
          };
          socket.emit("candidateToManage", message);
        }
      };
    }
  }

  // 启动摄像头
  function startCamera() {
    // 启动摄像头
    if (!localStream) {
      getLogitechCameraID((videoId) => {
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: {
              deviceId: videoId,
            },
          })
          .then((stream) => {
            localStream = stream;
            localStream.getTracks().forEach((track) => {
              peer.addTrack(track, localStream);
            });
          })
          .catch((e) => console.log(`getUserMedia() error: ${e.name}`));
      });
    }
  }

  function getLogitechCameraID(cb) {
    try {
      navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i];
          const label = deviceInfo.label;
          if (deviceInfo.kind == "videoinput") {
            // 外置摄像头为HD Pro , 一体机摄像头为HP 2.0MP
            if (
              label == "screen-capture-recorder" ||
              label == "罗技高清网络摄像机 C930c (046d:0891)"
            ) {
              videoId = deviceInfo.deviceId;
              cb(videoId);
              return;
            }
          }
        }
      });
    } catch (err) {
      notice("获取摄像头/麦克风失败!", "error");
    }
  }

  socket.on("connect", () => {
    socket.on("screencastOffer", (data) => {
      peer.setRemoteDescription(data.offer);
      peer
        .createAnswer({
          offerToReceiveAudio: 1,
          offerToReceiveVideo: 1,
        })
        .then(
          (answer) => {
            peer.setLocalDescription(answer);
            socketId = data.socketId;
            let message = {
              manageId,
              roomId,
              answer,
              socketId,
            };
            socket.emit("screencastAnswer", message);
          },
          (error) => {
            console.log("createAnswer: fail error " + error);
          }
        );
    });

    socket.on("candidateToLawyer", function (data) {
      if (data.candidate) {
        peer.addIceCandidate(data.candidate);
      }
    });
  });
}
