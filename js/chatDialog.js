const chatDialog = {
  // 显示对话框
  showChatDialog() {
      $('#chat-dialog').show();
  },
  // 隐藏对话框
  hideChatDialog() {
      $('#chat-dialog').hide();
  },
  // 获取输入框内容
  getInpVal() {
      return $('#chat-dialog .msg-input-box').val();
  },
  // 清空输入框内容
  emptyInpVal() {
      return $('#chat-dialog .msg-input-box').val('');
  },
  // 设置对话框标题
  setTitle(title) {
      $('#chat-dialog .title').html(title);
  },
  // 对话框添加我发送的内容
  addMineMessage(msg) {
      $('#chat-dialog .content').append(`
          <li class="mine">
              <span>律师端</span>
              <p>${msg}</p>
          </li>`);
      let chatContent = document.querySelector('#chat-dialog .content');
      if (chatContent.lastElementChild) {
          chatContent.lastElementChild.scrollIntoView();
      }
  },
  // 对话框添加对方发送的内容
  addAdverseMessage(msg) {
      $('#chat-dialog .content').append(`
          <li>
              <span>${msg.roleName}</span>
              <p>${msg.message}</p>
          </li>`);
      let chatContent = document.querySelector('#chat-dialog .content');
      if (chatContent.lastElementChild) {
          chatContent.lastElementChild.scrollIntoView();
      }
  }
}

// 关闭按钮
$('#chat-dialog .close-btn').click(chatDialog.hideChatDialog);

// 输入框focus
$('#chat-dialog .bottom').click(() => {
  $('#chat-dialog .msg-input-box').focus();
});
