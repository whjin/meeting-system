// 存储图片base64
let base64Img = [];
// 选择照片的idx
let highPhotoIdx = -1;
// 预约申请弹框
let appointmentModel = document.getElementsByClassName("appointmentModel")[0];
// 打开预约申请弹框
function appointment() {
  $("#keyboard").hide();
  appointmentModel.className = "appointmentModel appointmentBlock";
  // 获取监所列表
  getRoomByType();
}

// 高拍仪弹框
let hignMeterModel = document.querySelector(".hignMeterModel");
// 打开高拍仪弹框
function openHighMeterImg(type) {
  hignMeterType = type;
  openHignMeter(type === "spot" ? 1 : 0);
  hignMeterModel.className = "hignMeterModel hignMeterBlock";
  let highMeterTitle = document.querySelector(".highMeterTitle");
  let bjPicture = document.querySelectorAll(".bjPicture span");
  switch (type) {
    case "idCard":
      highMeterTitle.innerHTML = bjPicture[0].innerText;
      break;
    case "spot":
      highMeterTitle.innerHTML = bjPicture[1].innerText;
      break;
    case "lawyer":
      highMeterTitle.innerHTML = bjPicture[2].innerText;
      break;
    case "firm":
      highMeterTitle.innerHTML = bjPicture[3].innerText;
      break;
    case "attorney":
      highMeterTitle.innerHTML = bjPicture[4].innerText;
      break;
  }

  let timer = window.setInterval(function () {
    if (ws.readyState === 1) {
      SetRotationStyle(hignMeterType === "spot" ? 0 : 1);
      clearInterval(timer);
    }
  });
}

function hignMeterPhoto() {
  // SetRotationStyle(hignMeterType === 'spot' ? 0 : 1);
  hignMeterBase64Ex(hignMeterType === "spot" ? 1 : 0);
}
// 关闭高拍仪弹框
function closeHignMeterModel() {
  hignMeterModel.className = "hignMeterModel";
  unload();
  $("#img").remove();
  var clearTimer = setTimeout(function () {
    var myimg = document.getElementById("myCanvas");
    myimg.src = "/assets/load1.gif";
    clearTimeout(clearTimer);
  }, 800);
}

//  删除\增加图片重新遍历
function resetImg(idx = -1) {
  // 先清空原来的
  let myCamera = document.getElementById("myCamera");
  myCamera.innerHTML = `
  <select id="resoultion" style="display: none;">
          <option value="0">3664*2744</option>
  </select>`;
  let string;
  for (let i = 0; i < base64Img.length; i++) {
    string = `
    <div class="scanSmall scanFile" style="position: absolute;top:${
      134 * i
    }px"></div>      
    `;
    myCamera.insertAdjacentHTML("beforeend", string);
  }
  if (idx === -1) {
    /*重新遍历后选择照片为空*/
    highPhotoIdx = -1;
  }
}

// 系统登录
function loginSystem() {
  let login = document.getElementById("login");
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/login/" + login.value,
    async: true,
    success: function (str) {
      if (login.value) {
        if (str.state.code == "200") {
          let data = str.data;
          let message = `caseName:+${data}`;
          let roomId = ``;
          passMessage(message);
          passRoom(roomId);
          window.localStorage.setItem("code", login.value);
          window.localStorage.setItem("appointmentId", data.id);
          window.localStorage.setItem("url", str.data.url);
          window.localStorage.setItem("remoteIp", data.remoteIp);
          window.localStorage.setItem("lawyerRoom", data.lawyerRoom);
          window.localStorage.setItem("unitCode", data.unitCode);
          data.roomName &&
            window.localStorage.setItem("roomName", data.roomName);
          data.organizeName &&
            window.localStorage.setItem("organizeName", data.organizeName);
          meetVideoMessage(str.data.url, 0, 1, login.value);
          meetVideoMessage(data.lawyerRoom, 0, 1, login.value);
          location.href = socketUrl + ":3000/lawyer/" + data.url;
        } else {
          notice(str.state.msg, "error");
        }
      } else {
        notice("验证码不能为空", "error");
      }
    },
  });
}

// 回车登录
$("#login").bind("keyup", function (e) {
  if (e.keyCode == "13") {
    loginSystem();
  }
});

// 传递数据到客户端
function passMessage(data) {}
// 传递房间号到客户端
function passRoom(data) {}

// 上传照片
function handleUploadImg() {
  let img = document.getElementById("img");
  if (!img || img.getAttribute("src").length < 100) {
    notice("请先拍照！", "warn");
    return;
  }
  let src = img.getAttribute("src");
  let file = dataURLtoFile(src);
  let formData = new FormData();
  formData.append("files", file);
  notice("正在上传中...", "warn", 0);
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/upload",
    data: formData,
    dataType: "json",
    contentType: false, // 禁止设置请求类型
    processData: false,
    success: function (res) {
      closeNotice();
      if (res.state.code == "200") {
        switch (hignMeterType) {
          case "idCard":
            let idCard = document.querySelector("[data-name='idCardUrl']");
            idCard.src = res.data[0].encUrl;
            notice("上传成功", "success");
            break;
          case "spot":
            let spot = document.querySelector("[data-name='headPortraitUrl']");
            spot.src = res.data[0].encUrl;
            notice("上传成功", "success");
            break;
          case "lawyer":
            let lawyer = document.querySelector("[data-name='lawyerUrl']");
            lawyer.src = res.data[0].encUrl;
            notice("上传成功", "success");
            break;
          case "firm":
            let firm = document.querySelector("[data-name='certificationUrl']");
            firm.src = res.data[0].encUrl;
            notice("上传成功", "success");
            break;
          case "attorney":
            let attorney = document.querySelector("[data-name='attorneyUrl']");
            attorney.src = res.data[0].encUrl;
            notice("上传成功", "success");
            break;
        }
      }
    },
    error: function () {
      notice("上传失败", "error");
    },
  });
}
