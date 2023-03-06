// 预约查询弹框
let queryModel = document.querySelector(".queryModel");
// 打开预约查询
function openQuery() {
  $("#keyboard").hide();
  queryModel.className = "queryModel queryModelBlock";
}
// 关闭预约查询
function closeQueryModel() {
  queryModel.className = "queryModel";
  let queryInput = document.getElementsByClassName("queryInput");
  for (let i = 0; i < queryInput.length; i++) {
    queryInput[i].value = "";
  }
  layui.use("table", function () {
    let table = layui.table;
    table.render({
      elem: "#queryTable",
      data: "",
      cols: [],
    });
  });
}

function queryConfirm() {
  let queryInput = document.getElementsByClassName("queryInput");
  for (let i = 0; i < queryInput.length; i++) {
    if (!queryInput[i].value) {
      notice("信息填写不完整", "warn");
      return;
    }
  }
  let queryLawyerName = document.querySelector(
    "[data-name='queryLawyerName']"
  ).value;
  let queryIdCard = document.querySelector("[data-name='queryIdCard']").value;
  if (validateQueryIdCard && !validateQueryIdCard(queryIdCard)) {
    return;
  }
  let queryStartDate = document.querySelector(
    "[data-name='queryStartDate']"
  ).value;
  let queryEndDate = document.querySelector("[data-name='queryEndDate']").value;
  let searchCon = {
    needPage: false,
    data: {
      lawyerName: queryLawyerName,
      idCard: queryIdCard,
      grantDateStart: queryStartDate,
      grantDateEnd: queryEndDate,
      systemType: "1",
    },
  };
  $.ajax({
    type: "post",
    url: socketUrl + ":8100/sysmgr/meetInformation/findByCon",
    data: JSON.stringify(searchCon),
    dataType: "json",
    contentType: "application/json",
    success: function (res) {
      if (res.state.code == "200") {
        res.data.map((item) => {
          if (item.appointmentDate != undefined) {
            item.appointmentDate = dateFormat(
              "YYYY-MM-DD",
              new Date(item.appointmentDate)
            );
          }
          if (item.approvalStatus != undefined) {
            switch (item.approvalStatus) {
              case "0":
                item.approvalStatus = "待审核";
                break;
              case "1":
                item.approvalStatus = "审核通过";
                break;
              case "2":
                item.approvalStatus = "审核不通过";
                break;
            }
          }
        });
        // 表格组件（预约查询）
        layui.use("table", function () {
          let table = layui.table;
          table.render({
            elem: "#queryTable",
            height: 628,
            data: res.data,
            page: true,
            limit: 40,
            cols: [
              [
                {
                  field: "",
                  title: "序号",
                  width: 80,
                  align: "center",
                  templet: function (d) {
                    return d.LAY_INDEX;
                  },
                },
                {
                  field: "prisonerName",
                  title: "姓名",
                  width: 100,
                  align: "center",
                },
                {
                  field: "lawyerName",
                  title: "律师姓名",
                  width: 100,
                  align: "center",
                },
                {
                  field: "lawyerNumber",
                  title: "律师证件号码",
                  width: 200,
                  align: "center",
                },
                {
                  field: "lawyerUnit",
                  title: "律师执业机构",
                  width: 200,
                  align: "center",
                },
                {
                  field: "appointmentDate",
                  title: "预约会见时间",
                  width: 150,
                  align: "center",
                },
                {
                  field: "appointmentTime",
                  title: "预约会见时间段",
                  width: 150,
                  align: "center",
                },
                {
                  field: "approvalStatus",
                  title: "审核状态",
                  width: 120,
                  align: "center",
                },
                {
                  field: "code",
                  title: "验证码",
                  width: 100,
                  align: "center",
                },
                {
                  field: "remarks",
                  title: "备注",
                  width: 160,
                  align: "center",
                },
              ],
            ],
            done: function () {
              tdTitle();
            },
          });
        });
      } else {
        notice("请求错误", "error");
      }
    },
    error: function () {
      notice("请求错误", "error");
    },
  });
}

// 预约时间
layui.use("laydate", function () {
  let laydate = layui.laydate;
  laydate.render({
    elem: "#appointStartDate",
  });
  laydate.render({
    elem: "#appointEndDate",
  });
  laydate.render({
    elem: "#selectDate",
    done: function () {
      let selectRoomList = document.querySelectorAll(".selectRoomItem span");
      let selectTimeList = document.querySelectorAll(".selectTimeItem span");
      for (let i = 0; i < selectRoomList.length; i++) {
        selectRoomList[i].classList.remove("selectLawyerRoom");
      }
      for (let i = 0; i < selectTimeList.length; i++) {
        selectTimeList[i].classList.remove("disabled");
        selectTimeList[i].classList.remove("selectTime");
      }
      let selectedLawyerRoom = document.querySelector(".selectedLawyerRoom");
      selectedLawyerRoom.innerHTML = "";
      let selectedTimes = document.querySelectorAll(".selectedTime");
      for (let i = 0; i < selectedTimes.length; i++) {
        selectedTimes[i].innerHTML = "";
      }
      let selectPrisonList = document.querySelectorAll(".meetingRoomBox span");
      for (let i = 0; i < selectPrisonList.length; i++) {
        selectPrisonList[i].classList.remove("selectPrisonerRoom");
      }
      let clearSelectPrison = document.querySelector(".selectedPrisonRoom");
      clearSelectPrison.innerHTML = "";
    },
    min: 0,
  });
});

function tdTitle() {
  $("th").each(function (index, element) {
    $(element).attr("title", $(element).text());
  });
  $("td").each(function (index, element) {
    $(element).attr("title", $(element).text());
  });
}
