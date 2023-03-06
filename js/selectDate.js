// 正在提交预约
let isAppointing = false;
// 会见时间段弹框
let selectDateModel = document.querySelector(".selectDateModel");
// 打开会见时间段
function openSelectDate() {
  selectDateModel.className = "selectDateModel selectDateBlock";
  // 设置监所会见室名称
  let prisonName = document.getElementById("prisonName");
  let roomTitle = document.getElementById("roomTitle");
  let organizeName = prisonName[prisonName.selectedIndex].text;
  roomTitle.innerHTML = organizeName;
  let organizeId = prisonName.value;
  let lawyerRoomData = {
    roomType: 1,
    organizeId: organizeId,
  };
  let prisonerRoomData = {
    roomType: 2,
    organizeId: organizeId,
  };
  // 获取律师会见室
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetRoomInfo/initRoomListByType",
    data: JSON.stringify(lawyerRoomData),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == "200") {
        let selectRoomItem = document.querySelector(".selectRoomItem");
        let selectRoomText = "";
        res.data.map((item) => {
          selectRoomText += `<span roomno="${item.roomNo}">${item.roomName}</span>`;
        });
        selectRoomItem.innerHTML = selectRoomText;
        // 选择律师会见室
        handleSelectRoom();
      }
    },
  });
  // 会见时间段
  let selectTimeItem = document.querySelector(".selectTimeItem");
  let selectTimeText = "";
  let timeList = [
    "08:00-08:30",
    "08:30-09:00",
    "09:00-09:30",
    "09:30-10:00",
    "10:00-10:30",
    "10:30-11:00",
    "11:00-11:30",
    "11:30-12:00",
    "12:00-12:30",
    "12:30-13:00",
    "13:00-13:30",
    "13:30-14:00",
    "14:00-14:30",
    "14:30-15:00",
    "15:00-15:30",
    "15:30-16:00",
    "16:00-16:30",
    "16:30-17:00",
  ];
  timeList.map((item, index) => {
    selectTimeText += `<span time-idx="${index}">${item}</span>`;
  });
  selectTimeItem.innerHTML = selectTimeText;
  // 选择会见时间段
  validateSelectTime();
  // 获取监所会见室
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetRoomInfo/initRoomListByType",
    data: JSON.stringify(prisonerRoomData),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == "200") {
        let meetingRoomBox = document.querySelector(".meetingRoomBox");
        let prisonRoomText = "";
        res.data.map((item) => {
          prisonRoomText += `<span roomno="${item.roomNo}">${item.roomName}</span>`;
        });
        meetingRoomBox.innerHTML = prisonRoomText;
        // 选择监所会见室
        validateSelectPrison();
      }
    },
  });
}

// 可选会见时间段
let usableTimeList = [];

// 选择律师会见室
let selectedTimes = document.querySelectorAll(".selectedTime");
function handleSelectRoom() {
  let selectRoomList = document.querySelectorAll(".selectRoomItem span");
  for (let i = 0; i < selectRoomList.length; i++) {
    selectRoomList[i].onclick = function (e) {
      e.preventDefault();
      let selectDateValue = document.getElementById("selectDate").value;
      if (!selectDateValue) {
        notice("请先选择预约日期", "warn");
        return;
      }
      usableTimeList.length = 0;
      e.target.classList.add("selectLawyerRoom");
      let selectedLawyerRoom = document.querySelector(".selectedLawyerRoom");
      selectedLawyerRoom.innerHTML = e.target.innerText;
      selectedLawyerRoom.setAttribute(
        "roomno",
        e.target.getAttribute("roomno")
      );
      let siblings = e.target.parentNode.children;
      for (let j = 0; j < siblings.length; j++) {
        if (siblings[j] !== e.target) {
          siblings[j].classList.remove("selectLawyerRoom");
        }
      }
      // 获取会见时间段
      let roomNo = selectRoomList[i].getAttribute("roomno");
      let selectRoomData = {
        queryDate: selectDateValue,
        roomNo: roomNo,
      };
      $.ajax({
        type: "post",
        url: socketUrl + ":8100/sysmgr/meetRoomInfo/queryDisableTime",
        data: JSON.stringify(selectRoomData),
        async: true,
        dataType: "json",
        contentType: "application/json",
        success: function (res) {
          if (res.state.code) {
            let selectTimeList = document.querySelectorAll(
              ".selectTimeItem span"
            );
            let timeIdxList = [];
            for (let i = 0; i < selectTimeList.length; i++) {
              let timeIdx = selectTimeList[i].getAttribute("time-idx");
              timeIdxList.push(timeIdx);
            }
            let diffList = timeIdxList.filter((idx) => !res.data.includes(idx));
            res.data.map((item) => {
              selectTimeList[item].classList.add("disabled");
            });
            diffList.map((item) => {
              selectTimeList[item].classList.remove("disabled");
            });
            // 选择会见时间段
            let selectedCount = 0;
            for (let i = 0; i < selectTimeList.length; i++) {
              selectTimeList[i].onclick = function (e) {
                e.preventDefault();
                let classNameList = document.querySelector(".selectLawyerRoom");
                if (!classNameList) {
                  notice("请先选择律师会见室", "warn");
                  return;
                }
                if (!selectTimeList[i].classList.contains("disabled")) {
                  let clearSelectPrison = document.querySelector(
                    ".selectedPrisonRoom"
                  );
                  clearSelectPrison.innerHTML = "";
                  selectedCount++;
                  let reTimeList = diffList.filter((idx) => idx != i);
                  switch (selectedCount) {
                    case 1:
                      usableTimeList.push(i);
                      usableTimeList = sortArray(unique(usableTimeList));
                      selectTimeList[i].classList.add("selectTime");
                      reTimeList.map((item) => {
                        selectTimeList[item].classList.remove("selectTime");
                      });
                      for (let i = 0; i < selectedTimes.length; i++) {
                        selectedTimes[i].innerHTML =
                          selectTimeList[usableTimeList].innerText;
                      }
                      // 选择监所会见室
                      handleSelectPrison();
                      break;
                    case 2:
                    /*
                      // 多选
                      usableTimeList.push(i);
                        usableTimeList = sortArray(unique(usableTimeList));
                        let unableFlag = res.data.some(item => item > usableTimeList[0] && item < usableTimeList[1]);
                        if (!unableFlag) {
                            for (let i = usableTimeList[0]; i <= usableTimeList[1]; i++) {
                                selectTimeList[i].classList.add("selectTime");
                            }
                            if (usableTimeList.length == 2) {
                                let beginTime = selectTimeList[usableTimeList[0]].innerText.substr(0, 6);
                                let endTime = selectTimeList[usableTimeList[1]].innerText.substr(6, 11);
                                for (let i = 0; i < selectedTimes.length; i++) {
                                    selectedTimes[i].innerHTML = `${beginTime}${endTime}`;
                                }
                            }
                            // 选择监所会见室
                            handleSelectPrison();
                        }
                        break;*/
                    case 3:
                      usableTimeList.splice(0, 2, i);
                      selectedCount = 1;
                      selectTimeList[i].classList.add("selectTime");
                      reTimeList.map((item) => {
                        selectTimeList[item].classList.remove("selectTime");
                      });
                      for (let i = 0; i < selectedTimes.length; i++) {
                        selectedTimes[i].innerHTML =
                          selectTimeList[usableTimeList].innerText;
                      }
                      // 选择监所会见室
                      handleSelectPrison();
                      break;
                  }
                }
              };
              selectTimeList[i].classList.remove("selectTime");
            }
            let selectedTimes = document.querySelectorAll(".selectedTime");
            for (let i = 0; i < selectedTimes.length; i++) {
              selectedTimes[i].innerHTML = "";
            }
            let selectPrisonList = document.querySelectorAll(
              ".meetingRoomBox span"
            );
            for (let i = 0; i < selectPrisonList.length; i++) {
              selectPrisonList[i].classList.remove("selectPrisonerRoom");
            }
          }
        },
      });
    };
  }
}

// 选择监所会见室
function handleSelectPrison() {
  let selectDateValue = document.getElementById("selectDate").value;
  let prisonName = document.getElementById("prisonName");
  let organizeId = prisonName.value;
  let selectTimeData = {
    queryDate: selectDateValue,
    timeIdx: usableTimeList.map(String),
    organizeId: organizeId,
  };
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetRoomInfo/queryUsableRemoteRoomList",
    data: JSON.stringify(selectTimeData),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == "200") {
        let meetingRoomBox = document.querySelector(".meetingRoomBox");
        let prisonRoomText = "";
        res.data.map((item) => {
          prisonRoomText += `<span roomno="${item.roomNo}">${item.roomName}</span>`;
        });
        meetingRoomBox.innerHTML = prisonRoomText;
        // 选择监所会见室
        let selectPrisonList = document.querySelectorAll(
          ".meetingRoomBox span"
        );
        for (let i = 0; i < selectPrisonList.length; i++) {
          selectPrisonList[i].onclick = function (e) {
            e.preventDefault();
            let selectTimeFlag =
              document.querySelectorAll(".selectedTime")[0].innerText;
            if (!selectTimeFlag) {
              notice("请先选择会见时间段", "warn");
              return;
            }
            // 获取可用时段监所会见室
            e.target.classList.add("selectPrisonerRoom");
            let selectedPrisonRoom = document.querySelector(
              ".selectedPrisonRoom"
            );
            selectedPrisonRoom.innerHTML = e.target.innerText;
            selectedPrisonRoom.setAttribute(
              "roomno",
              e.target.getAttribute("roomno")
            );
            let liblingsNodes = e.target.parentNode.children;
            for (let j = 0; j < liblingsNodes.length; j++) {
              if (liblingsNodes[j] !== e.target) {
                liblingsNodes[j].classList.remove("selectPrisonerRoom");
              }
            }
          };
        }
        if (res.state.msg !== "") {
          notice(res.state.msg, "info");
        }
      }
    },
  });
}

// 校验选择会见时间段
function validateSelectTime() {
  let selectTimeList = document.querySelectorAll(".selectTimeItem span");
  for (let i = 0; i < selectTimeList.length; i++) {
    selectTimeList[i].onclick = function (e) {
      e.preventDefault();
      let classNameList = document.querySelector(".selectLawyerRoom");
      if (!classNameList) {
        notice("请先选择律师会见室", "warn");
        return;
      }
    };
  }
}

// 校验选择监所会见室
function validateSelectPrison() {
  let selectPrisonList = document.querySelectorAll(".meetingRoomBox span");
  for (let i = 0; i < selectPrisonList.length; i++) {
    selectPrisonList[i].onclick = function (e) {
      e.preventDefault();
      let selectTimeFlag =
        document.querySelectorAll(".selectedTime")[0].innerText;
      if (!selectTimeFlag) {
        notice("请先选择会见时间段", "warn");
        return;
      }
    };
  }
}

// 确认选择
let selectedList = [];
function handleConfirmSelect() {
  let verifyList = [];
  let selectDateValue = document.getElementById("selectDate").value;
  let selectedLawyerRoom = document.querySelector(
    ".selectedLawyerRoom"
  ).innerText;
  let selectedPrisonRoom = document.querySelector(
    ".selectedPrisonRoom"
  ).innerText;
  let selectedTime = document.querySelectorAll(".selectedTime")[0].innerText;
  verifyList = [selectedLawyerRoom, selectedPrisonRoom, selectedTime];
  if (verifyList.includes("")) {
    notice("请选择完整再确认", "warn");
    return;
  }
  let lawyerRoomNo = document
    .querySelector(".selectedLawyerRoom")
    .getAttribute("roomno");
  let prisonRoomNo = document
    .querySelector(".selectedPrisonRoom")
    .getAttribute("roomno");
  selectedList = [lawyerRoomNo, prisonRoomNo, selectedTime];
  let appointmentDate = document.querySelector("[data-name='appointmentDate']");
  let appointmentTime = document.querySelector("[data-name='appointmentTime']");
  appointmentDate.value = selectDateValue;
  appointmentTime.value = selectedTime;
  closeSelectDateModel();
}

// 提交预约
function handleSubmit() {
  if (isAppointing) {
    notice("正在提交申请中...", "warn");
    return;
  }
  isAppointing = true;
  let appointData = {};
  let entity = {};
  let appointInput = document.getElementsByClassName("appointInput");
  let appointPhoto = document.getElementsByClassName("appointPhoto");
  for (let i = 0; i < appointInput.length; i++) {
    let p = appointInput[i].dataset.name;
    if (appointInput[i].dataset.name == "unitCode") {
      let l = appointInput[i].options[appointInput[i].selectedIndex];
      entity[appointInput[i].dataset.name] =
        appointInput[i].options[appointInput[i].selectedIndex].getAttribute(
          "ocode"
        );
    } else {
      entity[appointInput[i].dataset.name] = appointInput[i].value;
    }
  }

  let validateInput = deepCopy(entity);
  delete validateInput.unitCode;
  for (let key in validateInput) {
    if (!validateInput[key]) {
      isAppointing = false;
      notice("表格填写不完整", "warn");
      return;
    }
  }
  let validatePhoto = {};
  for (let i = 0; i < appointPhoto.length; i++) {
    let key = appointPhoto[i].getAttribute("data-name");
    let value = appointPhoto[i].getAttribute("src");
    entity[key] = value;
    validatePhoto[key] = value;
  }
  for (let key in validatePhoto) {
    if (validatePhoto[key].length < 20) {
      isAppointing = false;
      notice("照片采集不完整", "warn");
      return;
    }
  }
  entity.lawyerRoom = selectedList[0];
  entity.meetingRoom = selectedList[1];
  let date = entity.appointmentTime.split("-");
  entity.meetStartTime = entity.appointmentDate + " " + date[0];
  entity.meetEndTime = entity.appointmentDate + " " + date[1];
  let len = usableTimeList.length;
  let indexs = [];
  switch (len) {
    case 1:
      indexs = usableTimeList;
      break;
    case 2:
      for (let i = usableTimeList[0]; i <= usableTimeList[1]; i++) {
        indexs.push(i);
      }
      break;
  }
  appointData.entity = entity;

  appointData.indexs = indexs.map(String)[0];
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/register",
    data: JSON.stringify(appointData),
    async: true,
    dataType: "json",
    contentType: "application/json",
    success: function (str) {
      isAppointing = false;
      if (str.state.code == "200") {
        notice("提交成功", "success");
        closeAppointmentModel();
      } else {
        notice(str.state.msg, "error");
      }
    },
    error: function () {
      isAppointing = false;
      notice("请求错误", "error");
    },
  });
}
layui.use("form", function () {
  let form = layui.form;
  //自定义验证规则
  form.verify({
    title: function (value) {
      if (value == "") {
        return "姓名不能为空";
      } else if (value.length > 10) {
        return "用户名长度应在1~10位之间";
      } else if (value.indexOf(" ") !== -1) {
        return "输入的姓名不能含有空格";
      }
    },
    idcard: function (value) {
      return validateIdCard && validateIdCard(value);
    },
    prisons: function (value) {
      if (value == "") {
        return "请选择关押监所名称";
      }
    },
    iphone: function (value) {
      if (value == "") {
        return "手机号码不能为空";
      } else if (!/^1(3|4|5|6|7|8|9)\d{9}$/.test(value)) {
        return "电话号码有误，请重新填写";
      }
    },
    lawyer: function (value) {
      if (value == "") {
        return "律师证件号码不能为空";
      } else if (!/^\d{17}$/.test(value)) {
        return "律师证长度错误";
      }
    },
    unit: function (value) {
      if (value == "") {
        return "执业机构不能为空";
      }
    },
    userName: function (value) {
      if (validateClient == "") {
        return "委托人不能为空";
      } else if (validateClient.length > 10) {
        return "委托人长度应在1~10位之间";
      }
    },
  });
  //监听提交
  form.on("submit(formDemo)", function (data) {
    handleSubmit();
    return false;
  });
});

// 关闭会见时间段
function closeSelectDateModel() {
  selectDateModel.className = "selectDateModel";
  // 清空已选会见室、时间段
  let selectedLawyerRoom = document.querySelector(".selectedLawyerRoom");
  selectedLawyerRoom.innerHTML = "";
  let clearSelectPrison = document.querySelector(".selectedPrisonRoom");
  clearSelectPrison.innerHTML = "";
  let selectedTimes = document.querySelectorAll(".selectedTime");
  for (let i = 0; i < selectedTimes.length; i++) {
    selectedTimes[i].innerHTML = "";
  }
}

// 关闭、取消预约
function closeAppointmentModel() {
  appointmentModel.className = "appointmentModel";
  // 清空已填表单信息
  let appointInput = document.querySelectorAll(".appointInput");
  let appointPhoto = document.querySelectorAll(".appointPhoto");
  for (let i = 0; i < appointInput.length; i++) {
    appointInput[i].value = "";
  }
  for (let i = 0; i < appointPhoto.length; i++) {
    appointPhoto[i].src = "/assets/photo.png";
  }
}
