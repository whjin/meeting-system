// 存储图片base64
let base64Img = [];
// 选择照片的idx
let highPhotoIdx = -1;
// 预约申请弹框
let appointmentModal = document.querySelector(".appointmentModal");
// 打开预约申请弹框
function appointment() {
  $("#keyboard").hide();
  appointmentModal.className = "appointmentModal appointmentBlock";
  // 获取监所列表
  getRoomByType();
}

// 高拍仪弹框
let hignMeterModal = document.querySelector(".hignMeterModal");
// 打开高拍仪弹框
function openHighMeterImg(type) {
  hignMeterType = type;
  openHignMeter(type == "spot" ? 1 : 0);
  hignMeterModal.className = "hignMeterModal hignMeterBlock";
  let highMeterTitle = document.querySelector(".highMeterTitle");
  let bjPicture = document.querySelectorAll(".bjPicture span");
  let meetingType = localStorage.getItem("meetingType");
  switch (meetingType) {
    case "0":
      // 律师会见
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
      break;
    case "1":
      // 家属会见
      switch (type) {
        case "idCard":
          highMeterTitle.innerHTML = bjPicture[0].innerText;
          break;
        case "spot":
          highMeterTitle.innerHTML = bjPicture[1].innerText;
          break;
        case "familyHousehold":
          highMeterTitle.innerHTML = bjPicture[2].innerText;
          break;
        case "familyOther":
          highMeterTitle.innerHTML = bjPicture[3].innerText;
          break;
      }
      break;
  }

  let timer = window.setInterval(function () {
    if (ws.readyState == 1) {
      SetRotationStyle(hignMeterType == "spot" ? 0 : 1);
      clearInterval(timer);
    }
  });
}

function hignMeterPhoto() {
  hignMeterBase64Ex(hignMeterType == "spot" ? 1 : 0);
}
// 关闭高拍仪弹框
function closeHignMeterModal() {
  hignMeterModal.className = "hignMeterModal";
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
  if (idx == -1) {
    /*重新遍历后选择照片为空*/
    highPhotoIdx = -1;
  }
}

// 获取token
function getToken() {
  let accountName = "khd";
  let password = "gktel12345+";
  let params = {
    accountName,
    password: md5(password),
  };
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/login",
    async: true,
    data: JSON.stringify(params),
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == 200) {
        Cookies.set("token", res.data.token);
      }
    },
  });
}

// 律师|家属系统登录
function loginSystem() {
  let roomNo = localStorage.getItem("roomNo");
  let meetingType = localStorage.getItem("meetingType");
  let validateList = [];
  let params = {};
  if (meetingType == 0) {
    // 律师会见
    let lawyerName = document.querySelector(
      "[data-name=loginLawyerName]"
    ).value;
    let lawyerId = document.querySelector(
      "[data-name=loginLawyerIdCard]"
    ).value;
    let detainName = document.querySelector(
      "[data-name=lawyer_prisonerName]"
    ).value;
    validateList = [
      validateName(lawyerName),
      validateQueryIdCard(lawyerId),
      validateName(detainName),
    ];
    if (validateList.includes(false)) {
      return;
    }
    localStorage.setItem("detainName", detainName);
    localStorage.setItem("mainName", lawyerName);
    localStorage.setItem("idCard", lawyerId);
    params = {
      roomNo,
      lawyerName,
      lawyerId,
      detainName,
    };
  }
  if (meetingType == 1) {
    // 家属会见
    let familyName = document.querySelector(
      "[data-name=loginFamilyName]"
    ).value;
    let familyId = document.querySelector("[data-name=loginFamilyId]").value;
    let detainName = document.querySelector(
      "[data-name=family_prisonerName]"
    ).value;
    validateList = [
      validateName(familyName),
      validateQueryIdCard(familyId),
      validateName(detainName),
    ];
    if (validateList.includes(false)) {
      return;
    }
    localStorage.setItem("detainName", detainName);
    localStorage.setItem("mainName", familyName);
    localStorage.setItem("idCard", familyId);
    params = {
      roomNo,
      familyName,
      familyId,
      detainName,
    };
  }
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/login/" + roomNo,
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": Cookies.get("token"),
    },
    async: true,
    data: JSON.stringify(params),
    success: function (res) {
      if (res.state.code == 200) {
        const {
          id,
          url,
          remoteIp,
          unitCode,
          roomName,
          organizeName,
          videoName,
          meetStartTime,
          meetEndTime,
          nowDate,
        } = res.data;
        localStorage.setItem("code", url);
        localStorage.setItem("appointmentId", id);
        localStorage.setItem("url", url);
        localStorage.setItem("remoteIp", remoteIp);
        localStorage.setItem("unitCode", unitCode);
        localStorage.setItem("roomName", roomName);
        localStorage.setItem("organizeName", organizeName);
        localStorage.setItem("videoName", videoName);
        localStorage.setItem(
          "meetTime",
          JSON.stringify({
            startTime: meetStartTime,
            endTime: meetEndTime,
            nowTime: nowDate,
          })
        );
        meetVideoMessage(url, 0, 1, url);
        // 结束录屏
        screen("end");
        if (meetingType == 0) {
          location.href = socketUrl + ":3000/lawyer/" + url;
        }
        if (meetingType == 1) {
          location.href = socketUrl + ":3000/family/" + url;
        }
      } else {
        notice(res.state.msg, "error");
      }
    },
  });
}

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
  notice("正在上传中...", "warn");
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/upload",
    headers: {
      "X-Access-Token": Cookies.get("token"),
    },
    data: formData,
    dataType: "json",
    contentType: false, // 禁止设置请求类型
    processData: false,
    success: function (res) {
      closeNotice();
      if (res.state.code == "200") {
        let meetingType = localStorage.getItem("meetingType");
        switch (meetingType) {
          case "0":
            // 律师会见
            switch (hignMeterType) {
              case "idCard":
                let idCard = document.querySelector("[data-name='idCardUrl']");
                idCard.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "spot":
                let spot = document.querySelector(
                  "[data-name='headPortraitUrl']"
                );
                spot.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "lawyer":
                let lawyer = document.querySelector("[data-name='lawyerUrl']");
                lawyer.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "firm":
                let firm = document.querySelector(
                  "[data-name='certificationUrl']"
                );
                firm.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "attorney":
                let attorney = document.querySelector(
                  "[data-name='attorneyUrl']"
                );
                attorney.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
            }
            break;
          case "1":
            // 家属会见
            switch (hignMeterType) {
              case "idCard":
                let idCard = document.querySelector("[data-name='idCardUrl']");
                idCard.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "spot":
                let spot = document.querySelector(
                  "[data-name='headPortraitUrl']"
                );
                spot.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "familyHousehold":
                let familyHousehold = document.querySelector(
                  "[data-name='familyHousehold']"
                );
                familyHousehold.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
              case "familyOther":
                let familyOther = document.querySelector(
                  "[data-name='familyOther']"
                );
                familyOther.src = res.data[0].encUrl;
                notice("上传成功", "success");
                break;
            }
            break;
        }
      }
    },
    error: function () {
      notice("上传失败", "error");
    },
  });
}
