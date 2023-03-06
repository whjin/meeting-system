/*0不通过登录验证 1通过登录验证*/
let loginVerification = 0;

// 人脸服务
let faceAuthUrl = "http://192.168.1.185";

// pro
// let socketUrl = "http://192.168.1.57"; // 本地
// dev
let socketUrl = "http://localhost"; // 本地

// 打开高拍仪模块标识
let hignMeterType = "";

// 录频
let screenCopy = "start";

// 倒计时开关
let countdownSwitch = true;

// 挂断开关
let hangupSwitch = true;

const iceServersConfig = {
  iceServers: [
    {
      urls: ["stun:68.232.28.46:3488", "stun:192.168.1.56:3488"],
    },
    {
      urls: ["turn:68.232.28.46:3478", "turn:192.168.1.56:3478"],
      username: "admin",
      credential: "gktel12345",
    },
  ],
};

// 点击音量
function clickVoice(ele, eleBtn) {
  if (!ele.muted) {
    eleBtn.src = "../assets/videoVoiceMuted.png";
  } else {
    eleBtn.src = "../assets/videoVoice.png";
  }
  ele.muted = !ele.muted;
  return false;
}
// 调节音量
function changeVoice(ev, ele, eleBtn, volume, volumeBar) {
  ele.muted = false;
  let percentage;
  if (ev.target === volumeBar) {
    percentage = (volumeBar.offsetHeight - ev.offsetY) / volumeBar.offsetHeight;
  } else {
    percentage = (volume.offsetHeight - ev.offsetY) / volumeBar.offsetHeight;
  }
  // 解决border误差
  if (percentage <= 0.98) {
    volume.style.height = percentage * 100 + "px";
  } else {
    volume.style.height = volumeBar.offsetHeight - 2 + "px";
  }
  if (percentage > 1) {
    percentage = 1;
  }
  ele.volume = percentage;
  if (ele.volume === 0) {
    eleBtn.src = "../assets/videoVoiceMuted.png";
  } else {
    eleBtn.src = "../assets/videoVoice.png";
  }
}
//进入全屏
function FullScreen(ele) {
  if (ele.requestFullscreen) {
    ele.requestFullscreen();
  } else if (ele.mozRequestFullScreen) {
    ele.mozRequestFullScreen();
  } else if (ele.webkitRequestFullScreen) {
    ele.webkitRequestFullScreen();
  }
}
//退出全屏
function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  }
}

// 调用麦克风、摄像头
function startLive() {
  return new Promise(async (resolve, reject) => {
    let stream;
    let videoId = "";
    try {
      await navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i];
          if (deviceInfo.kind === "videoinput") {
            // 外置摄像头为HD Pro , 一体机摄像头为HP 2.0MP
            if (
              deviceInfo.label.indexOf("Document Scanner") === -1 &&
              deviceInfo.label.indexOf("USB Camera") === -1 &&
              deviceInfo.label.indexOf("screen-capture-recorder") === -1
            ) {
              videoId = deviceInfo.deviceId;
            }
          }
        }
      });
      // 尝试调取本地摄像头/麦克风
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoId,
        },
        audio: true,
      });
      // 摄像头/麦克风获取成功
      localVideo.srcObject = stream;
    } catch (err) {
      // 摄像头/麦克风获取失败
      notice("获取摄像头/麦克风失败!", "error");
      reject();
      return;
    }
    // 流程开始,将媒体轨道添加到轨道集
    try {
      stream.getTracks().map((track) => {
        peer.addTrack(track, stream);
      });
    } catch (error) {
      console.log("addTrack error");
    }
    resolve(stream);
  });
}

// 获取扫描文件并在右边显示
function showRightBigPhoto(el) {
  let prisonerFileLook = document.getElementById("prisonerFileLook");
  prisonerFileLook.innerHTML = `<img src="${el.src}" style="width:100%;height:100%;" />`;
}

// 调用本地摄像头
async function videoCamera(video) {
  let stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 250,
      height: 350,
    },
  });
  video.srcObject = stream;
  video.play();
}
// 将url地址转化为文件
function dataURLtoFile(dataurl, filename = "file") {
  let arr = dataurl.split(",");
  let mime = arr[0].match(/:(.*?);/)[1];
  let suffix = mime.split("/")[1];
  let bstr = atob(arr[1]);
  let n = bstr.length;
  let u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], `${filename}.${suffix}`, {
    type: mime,
  });
}

// 更改房间的使用状态
async function meetVideoMessage(room, numClients, action, code) {
  let url = socketUrl + ":8100/sysmgr/meetVideoMessage/saveVideoMessage";
  let data =
    '{"room":"' +
    room +
    '","numClients":"' +
    numClients +
    '","action":"' +
    action +
    '","code":"' +
    code +
    '"}';
  $.ajax({
    type: "post",
    url: url,
    dataType: "json",
    contentType: "application/json",
    data: data,
    async: false,
    success: function (result) {
      if (result.status === "200") {
        console.log("save video message succeeded");
      } else {
        console.log("save video message failed");
      }
    },
    error: function (err) {
      console.log("save video message failed");
    },
  });
}

// 更新房间状态
async function updateRoomStatus(room) {
  let url = socketUrl + ":8100/sysmgr/meetInformation/updateRoomStatus";
  let roomSign = window.localStorage.getItem("appointmentId") || 0;
  let data = JSON.stringify({
    id: roomSign,
    meetRoom: room,
  });
  $.ajax({
    type: "post",
    url: url,
    dataType: "json",
    contentType: "application/json",
    data: data,
    async: false,
    success: function (result) {
      if (result.status === "200") {
        console.log("save video message succeeded");
      } else {
        console.log("save video message failed");
      }
    },
    error: function (err) {
      console.log("save video message failed");
    },
  });
}

// 通知提醒
function notice(text, type, time = 3000) {
  let notice = document.getElementById("notice");
  let noticeIcon = document.getElementById("noticeIcon");
  let noticeText = document.getElementById("noticeText");
  if (notice.style.display === "none") {
    notice.style.display = "block";
    notice.style.zIndex = "1024";
    $("#notice").animate({
      top: "30px",
    });
    noticeText.innerHTML = text;
    if (type === "success") {
      notice.style.border = "1px solid rgba(20,141,249,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(20,141,249,0.5)";
      noticeIcon.style.background = 'url("../assets/success.png") no-repeat';
    } else if (type === "error") {
      notice.style.border = "1px solid rgba(255,0,0,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(255,0,0,0.5)";
      noticeIcon.style.background = 'url("../assets/error.png") no-repeat';
    } else {
      notice.style.border = "1px solid rgba(234,149,39,1)";
      notice.style.boxShadow = "inset 0 0 15px rgba(234,149,39,0.5)";
      noticeIcon.style.background = 'url("../assets/warn.png") no-repeat';
    }
    if (time) {
      let timer = setTimeout(function () {
        notice.style.display = "none";
        $("#notice").animate({ top: "0" });
      }, time);
    }
  } else {
    return;
  }
}

function closeNotice() {
  document.getElementById("notice").style.display = "none";
  $("#notice").animate({ top: "0" });
}

// 校验姓名（预约申请）
function validateName() {
  let validateName = document.querySelector("[data-name='name']").value;
  if (validateName == "") {
    notice("姓名不能为空", "error");
  } else if (validateName.length > 10) {
    notice("用户名长度应在1~10位之间", "error");
  }
}

// 校验姓名（预约查询）
function validateLawyerName() {
  let validateLawyerName = document.querySelector(
    "[data-name='queryLawyerName']"
  ).value;
  if (validateLawyerName.length > 10) {
    notice("用户名长度应在1~10位之间", "error");
  }
}

// 校验手机号
function validatePhone() {
  let validatePhone = document.querySelector("[data-name='iphone']").value;
  if (validatePhone == "") {
    notice("手机号不能为空", "error");
  } else {
    let reg = /^1(3|4|5|6|7|8|9)\d{9}$/;
    if (!reg.test(validatePhone)) {
      notice("手机号格式错误", "error");
    }
  }
}

// 校验律师证
function validateLicense() {
  let validateLicense = document.querySelector(
    "[data-name='lawyerNumber']"
  ).value;
  if (validateLicense == "") {
    notice("律师证不能为空", "error");
  } else {
    let reg = /^\d{17}$/;
    if (!reg.test(validateLicense)) {
      notice("律师证长度错误", "error");
    }
  }
}
// 检验执业机构
function validateUnit() {
  let validateUnit = document.querySelector("[data-name='lawyerUnit']").value;
  if (validateUnit == "") {
    notice("执业机构不能为空", "error");
  }
}

// 校验委托人
function validateClient() {
  let validateClient = document.querySelector("[data-name='clientName']").value;
  if (validateClient == "") {
    notice("委托人不能为空", "error");
  } else if (validateClient.length > 10) {
    notice("委托人长度应在1~10位之间", "error");
  }
}

// 校验会见时间段
function validateTime() {
  let validateEndTime = document.querySelector(
    "[data-name='appointmentEnd']"
  ).value;
  if (validateEndTime == "") {
    notice("会见结束时间不能为空", "error");
  } else {
    let reg =
      /^(?:19|20)[0-9][0-9]-(?:(?:0[1-9])|(?:1[0-2]))-(?:(?:[0-2][1-9])|(?:[1-3][0-1]))\w(?:(?:[0-2][0-3])|(?:[0-1][0-9])):[0-5][0-9]$/;
    if (!reg.test(validateEndTime)) {
      notice("会见结束时间格式错误", "error");
    }
  }
}

// 检验身份证号（预约申请）
function validateIdCard(idCard) {
  let validateIdCard =
    idCard || document.querySelector("[data-name='prisonerIdCard']").value;
  if (validateIdCard == "") {
    return "身份证号不能为空";
  } else {
    let vcity = {
      11: "北京",
      12: "天津",
      13: "河北",
      14: "山西",
      15: "内蒙古",
      21: "辽宁",
      22: "吉林",
      23: "黑龙江",
      31: "上海",
      32: "江苏",
      33: "浙江",
      34: "安徽",
      35: "福建",
      36: "江西",
      37: "山东",
      41: "河南",
      42: "湖北",
      43: "湖南",
      44: "广东",
      45: "广西",
      46: "海南",
      50: "重庆",
      51: "四川",
      52: "贵州",
      53: "云南",
      54: "西藏",
      61: "陕西",
      62: "甘肃",
      63: "青海",
      64: "宁夏",
      65: "新疆",
      71: "台湾",
      81: "香港",
      82: "澳门",
      91: "国外",
    };
    // 校验长度，类型
    let reg = /(^\d{15}$)|(^\d{17}(\d|X|x)$)/;
    if (!reg.test(validateIdCard)) {
      return "身份证长度错误";
    }
    // 校验省份
    let province = validateIdCard.substr(0, 2);
    if (vcity[province] == undefined) {
      return "身份证省份代码错误";
    }
    // 校验生日
    if (!checkBirthday(validateIdCard)) {
      return "身份证生日信息错误";
    }
    // 校验格式
    if (!checkParity(validateIdCard)) {
      return "身份证格式错误";
    }
  }
}

// 检验身份证号（预约查询）
function validateQueryIdCard() {
  let validateQueryIdCard = document.querySelector(
    "[data-name='queryIdCard']"
  ).value;
  if (validateQueryIdCard === "") {
    notice("身份证号不能为空", "error");
    return false;
  } else {
    let vcity = {
      11: "北京",
      12: "天津",
      13: "河北",
      14: "山西",
      15: "内蒙古",
      21: "辽宁",
      22: "吉林",
      23: "黑龙江",
      31: "上海",
      32: "江苏",
      33: "浙江",
      34: "安徽",
      35: "福建",
      36: "江西",
      37: "山东",
      41: "河南",
      42: "湖北",
      43: "湖南",
      44: "广东",
      45: "广西",
      46: "海南",
      50: "重庆",
      51: "四川",
      52: "贵州",
      53: "云南",
      54: "西藏",
      61: "陕西",
      62: "甘肃",
      63: "青海",
      64: "宁夏",
      65: "新疆",
      71: "台湾",
      81: "香港",
      82: "澳门",
      91: "国外",
    };
    // 校验省份
    let province = validateQueryIdCard.substr(0, 2);
    if (vcity[province] == undefined) {
      notice("身份证省份代码错误", "error");
      return false;
    }
    // 校验生日
    if (!checkBirthday(validateQueryIdCard)) {
      notice("身份证生日信息错误", "error");
      return false;
    }
    // 校验格式
    if (!checkParity(validateQueryIdCard)) {
      notice("身份证格式错误", "error");
      return false;
    }
    return true;
  }
}

// 校验身份证格式
function checkParity(card) {
  // 15位转18位
  card = changeFifteenToEighteen(card);
  let len = card.length;
  if (len == 18) {
    let arrInt = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let arrCh = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
    let cardTemp = 0;
    for (let i = 0; i < 17; i++) {
      cardTemp += card.substr(i, 1) * arrInt[i];
    }
    let valnum = arrCh[cardTemp % 11];
    return valnum == card.substr(17, 1).toLocaleUpperCase();
  }
  return false;
}

// 身份证位数转换
function changeFifteenToEighteen(card) {
  if (card.length == 15) {
    let arrInt = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let arrCh = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
    let cardTemp = 0;
    card = card.substr(0, 6) + "19" + card.substr(6, card.length - 6);
    for (let i = 0; i < 17; i++) {
      cardTemp += card.substr(i, 1) * arrInt[i];
    }
    card += arrCh[cardTemp % 11];
    return card;
  }
  return card;
}

// 校验身份证生日信息
function checkBirthday(card) {
  let len = card.length;
  // 身份证15位时，次序为省（3位）市（3位）年（2位）月（2位）日（2位）校验位（3位），皆为数字
  if (len == 15) {
    let re_fifteen = /^(\d{6})(\d{2})(\d{2})(\d{2})(\d{3})$/;
    let arr_data = card.match(re_fifteen);
    let year = arr_data[2];
    let month = arr_data[3];
    let day = arr_data[4];
    let birthday = new Date("19" + year + "/" + month + "/" + day);
    return verifyBirthday("19" + year, month, day, birthday);
  }
  // 身份证18位时，次序为省（3位）市（3位）年（4位）月（2位）日（2位）校验位（4位），校验位末尾可能为X
  if (len == 18) {
    let re_eighteen = /^(\d{6})(\d{4})(\d{2})(\d{2})(\d{3})([0-9]|X|x)$/;
    let arr_data = card.match(re_eighteen);
    let year = parseInt(arr_data[2]);
    let month = parseInt(arr_data[3]);
    let day = parseInt(arr_data[4]);
    let birthday = new Date(year + "/" + month + "/" + day);
    return verifyBirthday(year, month, day, birthday);
  }
  return false;
}

// 校验生日
function verifyBirthday(year, month, day, birthday) {
  let now = new Date();
  let now_year = now.getFullYear();
  // 年月日是否合理
  if (
    birthday.getFullYear() === year &&
    birthday.getMonth() + 1 === month &&
    birthday.getDate() === day
  ) {
    // 判断年份的范围（0岁到100岁之间)
    let time = now_year - year;
    return time >= 0 && time <= 100;
  }
  return false;
}

// 打开高拍仪
function openHignMeter(camDevInd) {
  let pathName = window.location.pathname;
  let room = pathName.split("/")[2];

  /*与服务端建立socket连接*/
  let socket = io(socketUrl + ":3000");
  // 初始化高拍仪摄像头
  load(camDevInd);
  let message = {
    roomId: room,
    role: "lawyer",
    idCard: "",
  };
  /*创建房间*/
  socket.emit("create_or_join", { role: message.role, room: message.roomId });
  socket.onerror = () => message.error("信令通道创建失败！");
}

// 照片预览
function previewImg(path, takePhoto = true) {
  let highMeterBox = document.getElementById("highMeterBox");
  let previewImg = document.getElementById("previewImg");
  let previewBox = document.getElementById("previewBox");
  highMeterBox.style.display = "none";
  previewBox.style.display = "block";
  previewImg.src = path;
  if (takePhoto) {
    let timer = setTimeout(function () {
      highMeterBox.style.display = "block";
      previewBox.style.display = "none";
      clearTimeout(timer);
    }, 3000);
  }
}

// 删除图片
function deleteImg(type) {
  switch (type) {
    case "idCard":
      let idCard = document.querySelector("[data-name='idCardUrl']");
      idCard.src = "../assets/photo.png";
      break;
    case "spot":
      let spot = document.querySelector("[data-name='headPortraitUrl']");
      spot.src = "../assets/photo.png";
      break;
    case "lawyer":
      let lawyer = document.querySelector("[data-name='lawyerUrl']");
      lawyer.src = "../assets/photo.png";
      break;
    case "firm":
      let firm = document.querySelector("[data-name='certificationUrl']");
      firm.src = "../assets/photo.png";
      break;
    case "attorney":
      let attorney = document.querySelector("[data-name='attorneyUrl']");
      attorney.src = "../assets/photo.png";
      break;
  }
}

function screen() {
  let code = window.localStorage.getItem("code");
  let sendUrl = window.localStorage.getItem("url");
  let socket = io(socketUrl + ":3000");
  if (screenCopy === "start") {
    askVideotape(screenCopy, "LawyerMeeting", code);
    socket.emit("sendStartScreen", sendUrl, code);
    document.getElementById("screenCopy").innerText = "结束录屏";
    screenCopy = "end";
  } else {
    askVideotape("end", "", code);
    socket.emit("sendEndScreen", sendUrl, code);
    document.getElementById("screenCopy").innerText = "开始录屏";
    screenCopy = "start";
  }
}

function askVideotape(start, lawyerOrPrisoner, code) {
  let data;
  let url;
  if (start === "start") {
    data =
      '{"appointmentCode":"' +
      code +
      '", "lawyerOrPrisoner":"' +
      lawyerOrPrisoner +
      '"}';
    url = "http://127.0.0.1/StartScreenCopy";
  } else {
    data = '{"appointmentCode":"' + code + '"}';
    url = "http://127.0.0.1/StopScreenCopy";
  }
  $.ajax({
    type: "post",
    url: url,
    data: data,
    success: function (result) {
      if (result.status === "200") {
        console.log("success: " + result);
      } else {
        console.log("error: " + result);
      }
    },
    error: function (err) {},
  });
}

function downloaderScreenCopyFiles() {
  let code = window.localStorage.getItem("code");
  let data;
  let url;
  data = '{"appointmentCode":"' + code + '"}';
  url = "http://127.0.0.1/DownloaderScreenCopyFiles";
  $.ajax({
    type: "post",
    url: url,
    data: data,
    success: function (result) {
      if (result.status === "200") {
        console.log("success: " + result);
      } else {
        console.log("error: " + result);
      }
    },
    error: function (err) {},
  });
}
