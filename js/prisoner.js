let room = location.pathname.split("/")[2];

//切换页面
let prisonerVideo = document.getElementsByClassName("prisonerVideo")[0];
let scanBox = document.getElementsByClassName("scanBox")[0];
let signBox = document.getElementsByClassName("signBox")[0];

const localVideo = document.getElementsByClassName("bigVideo")[1];
const remoteVideo = document.getElementsByClassName("bigVideo")[0];
localVideo.onloadeddata = () => {
  localVideo.play();
};
remoteVideo.onloadeddata = () => {
  remoteVideo.play();
};

let offerState = false;

let repeatJoin = false;
let repeatOffer = false;
let repeatAnswer = false;

let peer = null;
let localStream = null;
const PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
!PeerConnection && message.error("浏览器不支持WebRTC！");

let message = {
  roomId: room,
  name: "",
  idCard: "",
  role: "prisoner",
};

/*与服务端建立socket连接*/
const socket = io(socketUrl + ":3000");

socket.onerror = () => message.error("信令通道创建失败！");

createRtcConnect();

function createRtcConnect() {
  peer = new PeerConnection(iceServersConfig);

  peer.ontrack = (e) => {
    if (e && e.streams) {
      remoteVideo.srcObject = e.streams[0];
      localStream = e.streams[0];
      countdownSwitch && prisonerTimeing && prisonerTimeing.start();
    }
  };

  peer.onicecandidate = (e) => {
    if (e && e.candidate) {
      socket.emit("icecandidate", e.candidate, message.roomId);
    }
  };

  peer.oniceconnectionstatechange = (e) => {
    let state = peer.iceConnectionState;
    console.log(state, offerState);
    if (state == "disconnected") {
      notice("当前网络已断开，请稍候...", "error");
      if (localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach((track) => track.stop());
      }
      if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      }
    }
  };
}

function createOffer() {
  createRtcConnect();
  startLive().then(() => {
    peer
      .createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      })
      .then((offer) => {
        offerState = true;
        if (offer) {
          peer.setLocalDescription(offer);
          socket.emit("offer", offer, message.roomId);
        }
      });
  });
}

function createAnswer(offer) {
  createRtcConnect();
  startLive().then(() => {
    peer.setRemoteDescription(offer);
    peer
      .createAnswer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      })
      .then((answer) => {
        if (answer) {
          peer.setLocalDescription(answer);
          socket.emit("answer", answer, message.roomId);
        }
      });
  });
}

socket.on("connect", () => {
  startLive();

  socket.emit("joinRoom", {
    room,
    port: location.port,
  });

  socket.on("setRemotePort", (port) => {
    location.port = port;
  });

  // 三合一 0-律师会见 1-家属会见
  socket.on("getMeetingType", (type) => {
    localStorage.setItem("meetingType", type);
    handleMeetingType();
    setPrisonerTitle();
  });

  if (!offerState) {
    socket.emit("create_or_join", {
      role: message.role,
      room: message.roomId,
    });
  } else {
    createOffer();
  }

  socket.on("join_room", (room) => {
    console.log("join_room", offerState);
    message.roomId = room;
    if (!repeatJoin) {
      repeatJoin = true;
      createOffer();
      setTimeout(() => {
        repeatJoin = false;
      }, 1500);
    }
  });

  socket.on("offer", (offer) => {
    console.log("offer", offerState);
    if (!repeatOffer) {
      repeatOffer = true;
      if (offer) {
        createAnswer(offer);
      }
      setTimeout(() => {
        repeatOffer = false;
      }, 1500);
    }
  });

  socket.on("answer", (answer) => {
    console.log("answer", offerState);
    if (!repeatAnswer) {
      repeatAnswer = true;
      if (answer) {
        peer.setRemoteDescription(answer);
      }
      setTimeout(() => {
        repeatAnswer = false;
      }, 1500);
    }
  });

  socket.on("icecandidate", (candidate) => {
    if (offerState && candidate) {
      peer.addIceCandidate(candidate);
    }
  });

  socket.on("startScreen", function (code) {
    askVideotape("start");
  });

  socket.on("endScreen", function (code) {
    askVideotape("end");
  });

  // 获取笔录
  socket.on("receiveNote", (res) => {
    prisonerVideo.style.display = "none";
    signBox.style.display = "inline-block";
    scanBox.style.display = "none";
    bigVideo2.className = "bigVideo prisonVideo";
    um.setContent(res.content);
    let eduiEditorBody = document.getElementsByClassName("edui-editor-body")[0];
    eduiEditorBody.scrollTop = Math.round(
      eduiEditorBody.scrollHeight * res.scrollPercentage
    );
  });
  // 获取Base64图片
  socket.on("receivePhoto", (res) => {
    prisonerVideo.style.display = "none";
    signBox.style.display = "none";
    scanBox.style.display = "inline-block";
    bigVideo2.className = "bigVideo prisonVideo";
    let highMeterPhoto = document.getElementById("highMeterPhoto");
    highMeterPhoto.src = res.content;
  });
  // 退出
  socket.on("receiveQuit", (res) => {
    prisonerVideo.style.display = "inline-block";
    signBox.style.display = "none";
    scanBox.style.display = "none";
    bigVideo2.className = "bigVideo";
    countdownSwitch && prisonerTimeing && prisonerTimeing.reset();
  });
  // 切回视频
  socket.on("receiveVideo", (res) => {
    prisonerVideo.style.display = "inline-block";
    signBox.style.display = "none";
    scanBox.style.display = "none";
    bigVideo2.className = "bigVideo";
  });
  // 滚动
  socket.on("receiveScroll", (res) => {
    let eduiEditorBody = document.getElementsByClassName("edui-editor-body")[0];
    eduiEditorBody.scrollTop = Math.round(
      eduiEditorBody.scrollHeight * res.scrollPercentage
    );
  });
});

function handleMeetingType() {
  let title = document.querySelector("title");
  let prisonerTitle = document.querySelector(".prisonerTitle");
  let meetingType = localStorage.getItem("meetingType");
  if (meetingType == 0) {
    title.innerText = "律师会见系统";
    prisonerTitle.innerText = "律师视频";
  }
  if (meetingType == 1) {
    title.innerText = "家属会见系统";
    prisonerTitle.innerText = "家属视频";
  }
}

function setPrisonerTitle() {
  let iframe = document.getElementById("iframeTime").contentWindow;
  let title = iframe.document.querySelector(".title");
  let meetingType = localStorage.getItem("meetingType");
  if (meetingType == 0) {
    title.innerText = "律师远程会见系统";
  }
  if (meetingType == 1) {
    title.innerText = "家属远程会见系统";
  }
}

if (loginVerification == 1) {
  let view = document.getElementById("view");
  let prisonerLogin = document.getElementById("prisonerLogin");
  view.style.display = "none";
  prisonerLogin.style.display = "block";
  let roomId = document.getElementById("roomId");
  let name = document.getElementById("name");
  let idCard = document.getElementById("idCard");
  window.onload = function () {
    /*拿到预约信息*/
    $.ajax({
      type: "post",
      url: socketUrl + ":8100/sysmgr/meetVideoMessage/queryMeetPersonInfo",
      headers: {
        "X-Access-Token": Cookies.get("token"),
      },
      async: true,
      contentType: "application/json",
      dataType: "json",
      data: '{"room":"' + room + '"}',
      success: function (str) {
        if (str.state.code == 200) {
          message = {
            roomId: room,
            name: str.data.prisonerName,
            idCard: str.data.prisonerRoom,
          };
          /*填入信息*/
          roomId.innerHTML = message.roomId;
          name.innerHTML = message.name;
          idCard.innerHTML = message.idCard;
          distinguishFace();
        } else {
          message = {
            roomId: room,
            name: "",
            idCard: "",
          };
          roomId.innerHTML = message.roomId;
          name.innerHTML = message.name;
          idCard.innerHTML = message.idCard;
        }
      },
      error: function () {
        notice(
          "浏览器版本过低，请升级您的浏览器。\\r\\n浏览器要求：IE10+/Chrome14+/FireFox7+/Opera11+",
          "warn"
        );
      },
    });
  };
  // 获取新消息
  socket.on("receiveNewMessage", function (res) {
    message = {
      roomId: room,
      name: res.data.prisonerName,
      idCard: res.data.prisonerRoom,
    };
    /*填入信息*/
    roomId.innerHTML = message.roomId;
    name.innerHTML = message.name;
    idCard.innerHTML = message.idCard;
    distinguishFace();
  });
  //识别人脸
  function distinguishFace() {
    /*开始识别人脸*/
    let spin = document.getElementsByClassName("spin")[0];
    spin.style.display = "block";
    let spin2 = document.getElementsByClassName("spin2")[0];
    spin2.style.display = "block";
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    let tracker = new tracking.ObjectTracker("face");
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracking.track("#video", tracker, {
      camera: true,
    });
    let flag = true;
    tracker.on("track", function (event) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      event.data.map(function (rect) {
        context.strokeStyle = "#a64ceb";
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });
      if (event.data.length) {
        if (flag) {
          flag = false;
          let canvas2 = document.getElementById("canvas2");
          let context2 = canvas2.getContext("2d");
          context2.drawImage(video, 0, 0, 250, 350);
          let new_img = document.createElement("img");
          new_img.setAttribute("crossOrigin", "anonymous");
          new_img.src = canvas2.toDataURL("image/jpg");
          const formData = new FormData();
          let data = dataURLtoFile(new_img.src);
          formData.append("file", data);
          formData.append("room", message.roomId);
          $.ajax({
            type: "post",
            url:
              socketUrl +
              ":8100/sysmgr/meetVideoMessage/prisonerFaceRecognition",
            headers: {
              "X-Access-Token": Cookies.get("token"),
            },
            async: true,
            contentType: false,
            processData: false,
            data: formData,
            success: function (str) {
              if (str.data !== "False") {
                notice("识别成功", "success");
                meetVideoMessage(message.roomId, 1, 1);
                spin.style.display = "none";
                spin2.style.display = "none";
                document.getElementById("view").style.display = "block";
                document.getElementById("prisonerLogin").style.display = "none";
              } else {
                flag = true;
              }
            },
          });
        }
      }
    });
  }
}

/*律师视频*/
let bigVideo1 = document.getElementsByClassName("bigVideo")[0];

/*音量控制*/
// let voice1 = document.getElementsByClassName("voice")[0];
// let volumeBox1 = document.getElementsByClassName("volumeBox")[0];
// let volumeBar1 = document.getElementsByClassName("volumeBar")[0];
// let volume1 = document.getElementsByClassName("volume")[0];
// bigVideo1.volume = 1;
// volume1.style.height = "100px";
// voice1.onclick = () => {
//   clickVoice(bigVideo1, voice1);
// };
// voice1.onmouseover = () => {
//   volumeBox1.style.display = "block";
// };
// volumeBox1.onmouseover = () => {
//   volumeBox1.style.display = "block";
// };
// voice1.onmouseout = () => {
//   volumeBox1.style.display = "none";
// };
// volumeBox1.onmouseout = () => {
//   volumeBox1.style.display = "none";
// };
// volumeBar1.onmousedown = (ev) => {
//   changeVoice(ev, bigVideo1, voice1, volume1, volumeBar1);
// };

/*在押人员视频*/
let bigVideo2 = document.getElementsByClassName("bigVideo")[1];
// 初始音量
// bigVideo2.volume = 0;

/*编辑器*/
const um = UM.getEditor("editor", {
  initialStyle: ".edui-editor-body .edui-body-container p{margin:16px 0;}",
});
um.setDisabled("fullscreen");
disableBtn("enable");

function disableBtn(str) {
  let div = document.getElementById("editor");
  let btns = UM.dom.domUtils.getElementsByTagName(div, "button");
  for (let i = 0, btn; (btn = btns[i++]); ) {
    if (btn.id == str) {
      UM.dom.domUtils.removeAttributes(btn, ["disabled"]);
    } else {
      $(btn).attr("disabled", true).addClass("disabled");
    }
  }
}
