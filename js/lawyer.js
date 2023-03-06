let room = localStorage.getItem("roomNo");

// 存储图片base64
let base64Img = [];
// 图片编辑器
let cro;
// 选择照片的idx
let highPhotoIdx = -1;
// 选择的照片
let highPhoto;
let mian_bg = document.getElementsByClassName("mian_bg")[0];
let bigImg = document.getElementsByClassName("bigImg")[0];

// 挂断开关
if (hangupSwitch) {
  document.getElementById("hangUp").style.display = "block";
} else {
  document.getElementById("hangUp").style.display = "none";
}

const localVideo = document.getElementsByClassName("bigVideo")[1];
const remoteVideo = document.getElementsByClassName("bigVideo")[0];
localVideo.onloadeddata = () => {
  localVideo.play();
};
remoteVideo.onloadeddata = () => {
  remoteVideo.play();
};

let faceTimer = null;
let faceState = false;

let offerState = false;

let repeatJoin = false;
let repeatOffer = false;
let repeatAnswer = false;

// 登录律师端后对应的管理后台
let manageId = localStorage.getItem("unitCode") || 0;
let roomName = localStorage.getItem("roomName") || "";
let organizeName = localStorage.getItem("organizeName") || "";
if (organizeName) {
  chatDialog.setTitle(organizeName);
}

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
  role: "lawyer",
};

/*与服务端建立socket连接*/
const socket = io(socketUrl + ":3000");

socket.onerror = () => message.error("信令通道创建失败！");

initScreencast &&
  initScreencast({
    socket,
    roomId: room,
    manageId: manageId.toString(),
  });

createRtcConnect();

// 初始化高拍仪摄像头
load();

// 开始录屏
screen("start");

function createRtcConnect() {
  peer = new PeerConnection(iceServersConfig);

  peer.ontrack = (e) => {
    if (e && e.streams) {
      remoteVideo.srcObject = e.streams[0];
      localStream = e.streams[0];
    }
  };

  peer.onicecandidate = (e) => {
    if (e && e.candidate) {
      socket.emit("icecandidate", e.candidate, room);
      startFaceTimer();
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
  clearInterval(faceTimer);
  startLive();

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

  /**
   * socket监听管理后台发来的信息
   * msgInfo内容与sendMessage发送的内容相同
   */
  socket.on("sendToLawyer", (res) => {
    if (res.roomId == message.roomId) {
      chatDialog.showChatDialog();
      chatDialog.addAdverseMessage(res.messageInfo);
    }
  });

  socket.on("hangUp", function () {
    hangUp();
  });
});

window["isSendNote"] = false; // 获取签名前必须推送文档给在押端
function showBigPhoto(ev) {
  mian_bg.style.display = "block";
  bigImg.src = ev.src;
  cutPhoto(bigImg, ev);
}

function cutPhoto(ev, smallEv) {
  /*先把上次的图片编辑注销*/
  if (cro) {
    cro.destroy();
  }
  const cropper = new Cropper(ev, {
    minCropBoxWidth: 152,
    minCropBoxHeight: 52,
    background: false,
  });
  cro = cropper;
  /*确认裁剪*/
  let confirm = document.getElementsByClassName("confirm")[0];
  confirm.onclick = function () {
    ev.src = cropper.getCroppedCanvas().toDataURL("image/jpeg");
    base64Img[smallEv.dataset.id] = ev.src;
    smallEv.src = ev.src;
    cropper.destroy();
    mian_bg.style.display = "none";
    /*确定裁剪后重新选择该图片*/
    chooseBigPhoto(smallEv, false);
  };
  /*退出弹窗*/
  let bigImgOut = document.getElementById("bigImgOut");
  bigImgOut.onclick = function () {
    mian_bg.style.display = "none";
    /*确定裁剪后重新选择该图片*/
    chooseBigPhoto(smallEv, false);
  };
  /*左旋*/
  let leftScale = document.getElementsByClassName("leftScale")[0];
  leftScale.onclick = function () {
    cropper.rotate(-90);
  };
  /*右旋*/
  let rightScale = document.getElementsByClassName("rightScale")[0];
  rightScale.onclick = function () {
    cropper.rotate(90);
  };
}
/*删除\增加图片重新遍历*/
function deleteAndAddImg(idx = -1) {
  // 先清空原来的
  let node = document.getElementById("highMeterPhoto");
  node.innerHTML = `<select id="resoultion" style="display: none;">
									<option value="0">3664*2744</option>
								</select>`;
  let string;
  for (let i = 0; i < base64Img.length; i++) {
    string = `<div class="scanSmall scanFile" style="position: absolute;top:${
      134 * i
    }px">
                            <div>
                            	<img class="CameraPhoto image" data-id="${i}" src="${
      base64Img[i]
    }" style="width: 100%;height: 100%;" onmousedown="chooseBigPhoto(this)" />
                            </div>
                            <p>
                                <span class="number">${i + 1}</span>
                            </p>
                        </div>`;
    node.insertAdjacentHTML("beforeend", string);
  }
  if (idx == -1) {
    /*重新遍历后选择照片为空*/
    highPhotoIdx = -1;
  }
}
/*选择照片*/
function chooseBigPhoto(el, move = true) {
  /*选择*/
  let elementStyle = document.getElementsByClassName("scanFile");
  for (let i = 0; i < elementStyle.length; i++) {
    elementStyle[i].style.border = "1px solid rgba(0,0,0,0)";
  }
  el.parentElement.parentElement.style.border = "1px solid #4EA5CC";
  highPhotoIdx = el.dataset.id;
  highPhoto = el;
  /*拖动*/
  if (move) {
    let ev = window.event || arguments.callee.caller.arguments[0];
    ev.stopPropagation() ? ev.stopPropagation() : (ev.cancelBubble = true);
    //兼容去除默认(必须)
    ev.preventDefault ? ev.preventDefault() : (returnValue = false);
    ev = ev || window.event;
    //鼠标位置-物体离定位位置左/上距离
    let y = ev.clientY - el.parentElement.parentElement.offsetTop;
    document.onmousemove = function (ev) {
      ev = ev || window.event;
      let top = ev.clientY - y;
      el.parentElement.parentElement.style.top = top + "px";
      if (parseInt(el.parentElement.parentElement.style.top) <= 0) {
        el.parentElement.parentElement.style.top = "0px";
      }
      if (
        parseInt(el.parentElement.parentElement.style.top) >=
        (base64Img.length - 1) * 134
      ) {
        el.parentElement.parentElement.style.top =
          (base64Img.length - 1) * 134 + "px";
      }
      document.onmouseup = function () {
        for (let i = 0; i < base64Img.length; i++) {
          if (
            parseInt(el.parentElement.parentElement.style.top) >=
              i * 134 - 10 &&
            parseInt(el.parentElement.parentElement.style.top) <= i * 134 + 10
          ) {
            base64Img.splice(highPhotoIdx, 1);
            base64Img.splice(i, 0, el.src);
            deleteAndAddImg();
            /*选择*/
            for (let j = 0; j < elementStyle.length; j++) {
              elementStyle[j].style.border = "1px solid rgba(0,0,0,0)";
            }
            elementStyle[i].style.border = "1px solid #4EA5CC";
            highPhotoIdx = i;
            highPhoto = elementStyle[i].children[0].children[0];
            break;
          } else if (i == base64Img.length - 1) {
            deleteAndAddImg(highPhotoIdx);
            elementStyle[highPhotoIdx].style.border = "1px solid #4EA5CC";
            break;
          }
        }
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  }
  // 预览照片
  previewImg(base64Img[highPhotoIdx], false);
}
/*推送*/
document.getElementById("sendPhoto").onclick = function (ev) {
  if (highPhotoIdx == -1) {
    notice("未选择文件!", "error");
  } else {
    socket.emit("sendPhoto", {
      roomId: message.roomId,
      content: base64Img[highPhotoIdx],
    });
    notice("推送成功!", "success");
  }
};
/*编辑*/
document.getElementsByClassName("editThisPhoto")[0].onclick = function (ev) {
  if (highPhotoIdx == -1) {
    notice("未选择文件！", "error");
  } else {
    showBigPhoto(highPhoto);
  }
};
/*删除*/
document.getElementsByClassName("deleteThisPhoto")[0].onclick = function (ev) {
  if (highPhotoIdx == -1) {
    notice("未选择文件！", "error");
  } else {
    document.getElementsByClassName("mian_bg3")[0].style.display = "block";
  }
};
document.getElementById("cancelDelete").onclick = function () {
  document.getElementsByClassName("mian_bg3")[0].style.display = "none";
};
document.getElementById("confirmDelete").onclick = function () {
  base64Img.splice(highPhotoIdx, 1);
  //删除节点
  deleteAndAddImg();
  /*右边空白*/
  let highMeterBox = document.getElementById("highMeterBox");
  let previewBox = document.getElementById("previewBox");
  highMeterBox.style.display = "none";
  previewBox.style.display = "none";
  document.getElementsByClassName("mian_bg3")[0].style.display = "none";
};

// 显示对话框
function showChatDialog() {
  chatDialog.showChatDialog();
}

/**
 * 通过socket向管理后台发送消息
 * @param {*} msg 消息内容
 */
function sendMessage(msg, msgType, hideTips, cb) {
  if (!manageId) return;
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetTalk/saveMessage",
    headers: {
      "X-Access-Token": Cookies.get("token"),
    },
    data: JSON.stringify({
      message: msg,
      code: localStorage.getItem("url") || 0,
      messageType: msgType,
    }),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == 200) {
        cb && cb(res);
      } else {
        if (!hideTips) {
          notice("消息发送失败", "error");
        }
      }
    },
    error: function (err) {
      if (!hideTips) {
        notice("消息发送失败", "error");
      }
    },
  });
}

function startFaceTimer() {
  if (!faceState) {
    faceState = true;
    setTimeout(() => {
      faceState = false;
    }, 1500);
    face();
    faceTimer = setInterval(() => {
      face();
    }, 10000);
  }
}

function face() {
  const canvas = $("#canvas")[0];
  const context = canvas.getContext("2d");
  context.drawImage(localVideo, 0, 0, 200, 150);
  let img = canvas.toDataURL("image/png");
  img = img.substr(img.indexOf(",") + 1);
  faceAuth(img);
}

/**
 * 人脸识别接口
 * @param {*} imgBase64 人脸base64照片
 */
function faceAuth(base64) {
  $.ajax({
    type: "post",
    url: faceAuthUrl + ":20520/arc/face/faceRecognition",
    headers: {
      "X-Access-Token": Cookies.get("token"),
    },
    data: JSON.stringify({
      imgBase64: base64,
    }),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == 200) {
        if (res.data == "有陌生人进入") {
          sendMessage("人脸异常", 1, true, () => {
            socket.emit("sendMessage", {
              messageInfo: {
                roleType: 0,
              },
              manageId,
            });
          });
          // $(".error-mask").show();
        } else {
          $(".error-mask").hide();
        }
      }
    },
    error: function (err) {},
  });
}

/**
 * 聊天框发送按钮点击事件
 * 理论上应该在chatDialog.js进行初始化，但目前没想到如何回调sendMessage
 */
$("#chat-dialog .send-btn").click(function () {
  let msg = chatDialog.getInpVal();
  if (!msg) notice("请输入内容!", "error");
  chatDialog.addMineMessage(msg);
  chatDialog.emptyInpVal();
  sendMessage(msg, 2, false, function (res) {
    socket.emit("sendMessage", {
      messageInfo: {
        roleType: 0,
        roleName: "律师端",
        message: msg,
        time: res.data.saveTime,
        noticeId: res.data.id,
      },
      roomId: message.roomId,
      manageId,
    });
  });
});

/* 人脸识别 */
if (loginVerification == 1) {
  let view = document.getElementById("view");
  let lawyerLogin = document.getElementById("lawyerLogin");
  view.style.display = "none";
  lawyerLogin.style.display = "block";
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
      success: function (res) {
        if (res.state.code == 200) {
          message = {
            roomId: room,
            name: res.data.lawyerName,
            idCard: res.data.lawyerUnit,
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
        notice("获取预约人信息失败", "error");
      },
    });
  };
  //获取新消息
  socket.on("receiveNewMessage", function (res) {
    message = {
      roomId: room,
      name: res.data.lawyerName,
      idCard: res.data.lawyerUnit,
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
          context2.drawImage(video, 0, 0, 230, 330);
          let new_img = document.createElement("img");
          new_img.setAttribute("crossOrigin", "anonymous");
          new_img.src = canvas2.toDataURL("image/jpg");
          const formData = new FormData();
          let data = dataURLtoFile(new_img.src);
          formData.append("file", data);
          formData.append("room", message.roomId);
          $.ajax({
            type: "post",
            url: socketUrl + ":8100/sysmgr/meetVideoMessage/faceRecognition",
            headers: {
              "X-Access-Token": Cookies.get("token"),
            },
            async: true,
            contentType: false,
            processData: false,
            data: formData,
            success: function (res) {
              if (res.data !== "False") {
                notice("识别成功", "success");
                meetVideoMessage(message.roomId, 0, 1);
                spin.style.display = "none";
                spin2.style.display = "none";
                document.getElementById("view").style.display = "block";
                document.getElementById("lawyerLogin").style.display = "none";
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

/*在押人员视频*/
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

/*律师视频*/
let bigVideo2 = document.getElementsByClassName("bigVideo")[1];
// 初始音量
// bigVideo2.volume = 0;

// 律师视频tab页
let layerTab = document.getElementsByClassName("layerTab")[0];
let layerVideoBox = document.getElementsByClassName("layerVideoBox")[0];
let layerTitle = document.getElementsByClassName("layerTitle")[0];
let meetingType = localStorage.getItem("meetingType");
if (meetingType == 0) {
  layerTab.onclick = (ev) => {
    if (ev.target.tagName == "LI") {
      // 清空
      for (let i = 0; i < layerTab.children.length; i++) {
        layerTab.children[i].className = "";
        layerVideoBox.children[i + 2].style.display = "none";
      }
      ev.target.className = "layerAct";
      layerVideoBox.children[Number(ev.target.dataset.idx) + 1].style.display =
        "block";
      if (ev.target.dataset.idx == "1") {
        bigVideo2.className = "bigVideo";
        socket.emit("sendVideo", {
          roomId: message.roomId,
          status: 1,
        });
      } else {
        bigVideo2.className = "bigVideo prisonVideo";
        SetRotationStyle(1);
      }
      layerTitle.innerHTML =
        (ev.target.innerText == "切回视频" ? "律师视频" : ev.target.innerText) +
        '<span id="screenCopy" class="startLive" onclick="screen()" style="float: none;display: none;">开始录屏</span>' +
        '<span class="startLive" onclick="downloaderScreenCopyFiles()" style="float: none;display: none;">开始刻录</span>' +
        '<span id="hangUp">挂断</span>';
      document.getElementById("hangUp").addEventListener(
        "click",
        function () {
          document.getElementsByClassName("mian_bg2")[0].style.display =
            "block";
        },
        false
      );

      if (hangupSwitch) {
        document.getElementById("hangUp").style.display = "block";
      } else {
        document.getElementById("hangUp").style.display = "none";
      }
    }
  };
}

/*编辑器*/
window.um = UM.getEditor("editor", {
  lang: /^zh/.test(
    navigator.language || navigator.browserLanguage || navigator.userLanguage
  )
    ? "zh-cn"
    : "en",
  langPath: UMEDITOR_CONFIG.UMEDITOR_HOME_URL + "lang/",
  focus: true,
  pageBreakTag: "<!–nextpage–>",
  toolbar: [
    " undo redo | bold italic underline strikethrough | superscript subscript | forecolor backcolor |",
    "| justifyleft justifycenter justifyright justifyjustify |",
    "insertorderedlist insertunorderedlist | selectall cleardoc fontsize",
    "| horizontal noteTemplate print",
  ],
  initialStyle: ".edui-editor-body .edui-body-container p{margin:16px 0}",
});

let templateArr = [];
let currentIndex = 0;
let lastIndex = 0;
let id = localStorage.getItem("appointmentId");
// 获取笔录模板
$.ajax({
  type: "post",
  url: socketUrl + ":8100/sysmgr/meetRoomInfo/getTranscriptTemp",
  headers: {
    "X-Access-Token": Cookies.get("token"),
  },
  data: '{"id":"' + id + '", "currency": true}',
  dataType: "json",
  contentType: "application/json",
  success: function (res) {
    if (res.state.code == 200) {
      templateArr = res.data;
      templateArr.map((item) => {
        // 添加是否为默认模板的标志位
        item.isCommon = true;
      });
      if (templateArr.length > 0) {
        paintTemplate(templateArr);
        $(".templateBox").children().eq(0).addClass("active");
      }
    }
  },
  error: function (err) {},
});
let template = document.getElementsByClassName("template")[0];
document
  .getElementsByClassName("edui-btn edui-btn-noteTemplate")[0]
  .addEventListener("click", function () {
    template.style.display = "block";
  });
let storeBox = document.getElementsByClassName("storeBox")[0];
// 暂存模板
function stageTemplate() {
  const lastTemp = templateArr[lastIndex];
  if (lastTemp.isCommon) {
    let newTemp = {
      fileName: "用户-" + lastTemp.fileName,
      pageCount: lastTemp.pageCount,
      imgPath: lastTemp.imgPath,
      content: um.getContent(),
      isGlobal: false,
      isCommon: false,
    };
    templateArr.push(newTemp);
  } else {
    lastTemp.content = um.getContent();
  }
  changeTemplateStatus(currentIndex);
  storeBox.style.display = "none";
}
// 丢弃 模板
function discardTemplate() {
  changeTemplateStatus(currentIndex);
  storeBox.style.display = "none";
}

function changeTemplateStatus(index) {
  paintTemplate(templateArr);
  const templateBox = $(".templateBox");
  templateBox.children().removeClass("active");
  templateBox.children().eq(index).addClass("active");
  setTimeout(function () {
    let content =
      typeof templateArr[index] !== "undefined"
        ? templateArr[index].content
        : "";
    um.setContent(content, false);
    template.style.display = "none";
    um.addListener("beforepaste", function () {
      //获取百度编辑器的工具类
      var domUtils = UM.dom.domUtils;
      var bk_start = um.selection.getRange().createBookmark().start;
      bk_start.style.display = "";
      var offsetbk = $(bk_start).offset();
      eduiEditorBody.scrollTop = offsetbk.top - 300;
      $(bk_start).remove();
    });
  }, 500);
  lastIndex = index;
}
let chooseTime = 0;

function storeBoxBlock(index) {
  if (chooseTime !== 0) {
    storeBox.style.display = "block";
    currentIndex = index;
  } else {
    changeTemplateStatus(index);
  }
  chooseTime++;
}
let templateBox = document.getElementsByClassName("templateBox")[0];

function paintTemplate(arr) {
  let html = "";
  for (let index = 0; index < arr.length; index++) {
    const item = arr[index];
    html += '<div onclick="storeBoxBlock(' + index + ')">';
    html += '<img src="' + item.imgPath + '"/>';
    if (item.isGlobal) {
      html += "<p>" + item.fileName + "</p>";
      html += "<span>" + item.pageCount + "页</span>";
      html += "</div>";
    } else {
      html +=
        '<p><img src="/assets/mine.png" style="display: inline-block;width: 12px;height: 12px"/>';
      html += "<span>" + item.fileName + "</span></p>";
      html += "<span>" + item.pageCount + "页</span>";
      html += "</div>";
    }
    templateBox.innerHTML = html;
  }
}
// 监听滚轮事件
let eduiEditorBody = document.getElementsByClassName("edui-editor-body")[0];
let scrollNow = 0;
let scrollHeight = 0; // 滚动内容高度，用于获取滚动距离百分比
let scrollPercentage = 0; // 滚动距离百分比，内容较长时，在押端的内容高度会比律师端大，导致律师端在最底部时在押端无法显示最底部，用百分比可以解决
eduiEditorBody.onscroll = function () {
  scrollNow = eduiEditorBody.scrollTop;
  scrollPercentage = scrollNow / scrollHeight;
  socket.emit("sendScroll", {
    roomId: message.roomId,
    scroll: eduiEditorBody.scrollTop,
    scrollPercentage,
  });
};

document.getElementById("sendNote").addEventListener(
  "click",
  function () {
    scrollHeight = eduiEditorBody.scrollHeight;
    scrollPercentage = scrollNow / scrollHeight;
    socket.emit("sendNote", {
      roomId: message.roomId,
      content: um.getContent(),
      scroll: scrollNow,
      scrollPercentage,
    });
    isSendNote = true;
    notice("推送成功", "success");
  },
  false
);
document.getElementById("hangUp").addEventListener(
  "click",
  function () {
    document.getElementsByClassName("mian_bg2")[0].style.display = "block";
  },
  false
);
document.getElementById("cancelHandUp").onclick = function () {
  document.getElementsByClassName("mian_bg2")[0].style.display = "none";
};
document.getElementById("confirmHandUp").onclick = hangUp;

function hangUp() {
  // 结束录屏
  screen("end");
  let code = localStorage.getItem("url");
  socket.emit("sendQuit", {
    roomId: message.roomId,
    status: "logOut",
    code: message.roomId,
  });
  templateArr = [];
  meetVideoMessage(code, 0, 0, code);
  let meetingType = localStorage.getItem("meetingType");
  switch (meetingType) {
    case "0":
      // 律师会见
      location.href = socketUrl + ":3000/login";
      break;
    case "1":
      // 家属会见
      location.href = socketUrl + ":3000/familyLogin";
      break;
  }
  // 清理登录缓存
  let storage = JSON.parse(JSON.stringify(localStorage));
  if (Object.keys(storage).length) {
    Object.keys(storage).forEach((key) => {
      if (key != "roomNo" && key != "meetingType") {
        localStorage.removeItem(key);
      }
    });
  }
}

let editor = document.getElementById("editor");
let x = 0;
let y = 0;
editor.addEventListener(
  "click",
  function (ev) {
    x = ev.pageX - editor.getBoundingClientRect().left;
    y = ev.pageY - editor.getBoundingClientRect().top;
  },
  false
);
editor.oncontextmenu = function (ev) {
  ev.preventDefault() ? ev.preventDefault() : (ev.returnValue = false);
};

// 签名板
let noteSignImg = -1;
document.onclick = function (ev) {
  if (ev.target.className !== "ppCanvas") {
    let imgg = document.getElementsByClassName("ppCanvas");
    for (let i = 0; i < imgg.length; i++) {
      imgg[i].style.border = "2px solid transparent";
      let next = imgg[i].nextElementSibling;
      next.style.display = "none";
    }
    noteSignImg = -1;
  }
};

function move(el) {
  let imgg = document.getElementsByClassName("ppCanvas");
  for (let i = 0; i < imgg.length; i++) {
    imgg[i].style.border = "2px solid transparent";
    let next = imgg[i].nextElementSibling;
    next.style.display = "none";
    if (imgg[i] == el) {
      noteSignImg = i;
      el.style.border = "2px solid red";
      el.nextElementSibling.style.display = "block";
    }
  }
}

function remove(el) {
  var p = el.parentNode || el.parentElement;
  if (p) {
    p.remove();
  }
}

function fuzhi(el) {
  let editor = document.getElementById("editor");
  let ppCanvas = document.getElementsByClassName("ppCanvas");
  if (ppCanvas.length == 0) {
    editor.insertAdjacentHTML(
      "afterbegin",
      '<p id="ppCanvasBox" style="margin:0;position:relative;"></p>'
    );
  }
  let a = document.getElementById("ppCanvasBox");
  a.insertAdjacentHTML(
    "afterbegin",
    `<img class="ppCanvas" src="${
      el.src
    }" alt="" style="position:absolute;left:30px;top:${
      editor.parentElement.scrollTop + 30
    }px;z-index:1000;cursor:pointer;border:2px solid transparent;" onmouseenter="move(this)">`
  );
}

function shanchu() {
  let editor = document.getElementById("ppCanvasBox");
  let imgg = document.getElementsByClassName("ppCanvas");
  if (noteSignImg !== -1) {
    editor.removeChild(imgg[noteSignImg]);
  } else {
    notice("没有选中签名!", "error");
  }
}
