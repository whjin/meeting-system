// 获取监所名称、律师会见室、会见时间段
function getRoomByType() {
  let prisonName = document.getElementById("prisonName");
  $.ajax({
    type: "get",
    url: socketUrl + ":8100/sysmgr/sysOrganize/findByType?type=2",
    headers: {
      "X-Access-Token": Cookies.get("token"),
    },
    async: true,
    success: function (res) {
      if (res.data && res.data.length) {
        let text = "";
        res.data.map((item) => {
          text += `<option value ="${item.id}" ocode="${item.organizeCode}" >${item.organizeName}</option>`;
        });
        prisonName.innerHTML = text;
        let selectedPrison = document.getElementById("prisonName");
        let selectIndex = selectedPrison.selectedIndex;
        let selectOption = selectedPrison[selectIndex].text;
        let roomTitle = document.getElementById("roomTitle");
        roomTitle.innerHTML = selectOption;
        prisonName.onchange = function (e) {
          let appointmentTime = document.querySelector(
            "[data-name='appointmentTime']"
          );
          if (e.target && appointmentTime.value) {
            appointmentTime.value = "";
          }
        };
      }
    },
    error: function () {
      notice("请求错误", "error");
    },
  });
}
