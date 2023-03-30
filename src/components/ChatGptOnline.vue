<script setup>
import micromark from "../utils/micromark";
import { debounce } from "lodash-es";
import { ref, computed, reactive, watch, onMounted, nextTick } from "vue";
import { post } from "../utils/request";
import { setItem, getItem } from "../utils/storage";
import * as api from "../api/index";
import Dialog from "./Dialog.vue";

const key = ref("");

const keyDialog = ref(false);

const data = reactive([
  {
    role: "chatgpt",
    content: "你可以问我各种问题哦 , 右上角设置你的api key \n",
    meta: {
      questions: [
        "写一个文案",
        "hello world代码示例",
        "写一首诗",
        "润色一下刚才的话",
        "周末安排",
        "讲个笑话",
        "写一个100字的科幻故事",
      ],
      actions: ["免费试用10次", "输入卡密"],
    },
  },
]);

const loading = ref(false);

const dialog = ref(false);

const loginDialog = ref(false);

const chatPanelRef = ref();

const chans = ref([
  "https://chatgpt-api.shn.hk/v1/",
  "https://api.openai.com/v1/chat/completions",
]);

const activeChan = ref(chans[0]);

const input = ref("");

const favs = reactive([]);
onMounted(async () => {
  async function initCofig() {
    const f = getItem("favs");
    const array = (f && JSON.parse(f)) || [];
    array.forEach((fav) => {
      favs.push(fav);
    });
    const chatRecords0 = getItem("chatRecord");
    const chatRecords = (chatRecords0 && JSON.parse(chatRecords0)) || [];
    if (chatRecords.length) {
      data.splice(0, 1);
      chatRecords.forEach((rec) => {
        data.push(rec);
      });
    }
    key.value = getItem("chatGptApiKey");
    activeChan.value = getItem("activeChan") || chans.value[0];
    let d = getItem("userInfo");
    if (d) {
      userInfo.value = JSON.parse(d);
      ticket();
    }
    d = getItem("dark");
    console.log(d);
    if (d) {
      dark.value = d == "true";
      if (dark.value) {
        toggleScheme();
      }
    }
    nextTick(scrollToBottom);
  }

  function watchConfig2Save() {
    const saveFavs = debounce((v) => {
      setItem({ favs: JSON.stringify(v) });
    }, 1000);
    const saveKey = debounce((v) => {
      setItem({ chatGptApiKey: v });
    }, 1000);
    const saveData = debounce((v) => {
      setItem({ chatRecord: JSON.stringify(v) });
    }, 1000);
    watch(favs, (v) => saveFavs(v));
    watch(key, (v) => saveKey(v));
    watch(data, (v) => saveData(v));
    watch(activeChan, (v) => setItem({ activeChan: v }));
  }
  await initCofig();
  watchConfig2Save();
  inviteLink();
});

const repeat = (prompt) => {
  submitSend(prompt);
};

const copy = async (prompt) => {
  let d = document.createElement("p");
  d.innerHTML = micromark(prompt);
  await navigator.clipboard.writeText(d.innerText);
};

const send = () => {
  const prompt = input.value;
  submitSend(prompt);
  input.value = "";
  setTimeout(() => {
    document.getElementsByTagName("textarea")[0].value = "";
  }, 500);
};

const action = async (a) => {
  data.push({
    role: "user",
    content: a,
  });
  loginKey.value = "";
  if (a == "免费试用10次" || a == "登陆") {
    loginDialog.value = true;
    rep("请登陆");
  } else if (a == "输入卡密") {
    if (userInfo.value.token) {
      cdKeyDialog.value = true;
    } else {
      loginDialog.value = true;
      rep("请先登陆，然后再输入卡密", { actions: ["输入卡密"] });
    }
  } else if (a == "获取更多") {
    let d = await api.getMoreInfo();
    rep(d);
  } else if (a == "设置我的api key") {
    dialog.value = true;
  }
};

const addFav = (prompt) => {
  favs.push(prompt);
};

const delFav = (i) => {
  favs.splice(i, 1);
};

const submitSend = async (prompt) => {
  if (!prompt.trim().length) {
    return;
  }
  loading.value = true;
  prompt = prompt || input.value;
  data.push({
    role: "me",
    content: prompt,
  });
  scrollToBottom();
  try {
    await sending(prompt);
  } catch (e) {
    let content = "这会有点累了，等会再问吧，或者换一下右上角的chatgpt api key";
    let meta = null;
    if (e.status == 500) {
      content = e.responseText;
      if (content == "可用次数不足") {
        meta = { actions: ["获取更多"] };
      }
    } else if (e.status == 401) {
      content = "请重新登陆";
      meta = { actions: ["登陆"] };
    } else {
      console.log(e);
    }
    data.push({
      role: "chatgpt",
      content,
      meta,
    });
  }
  scrollToBottom();
  loading.value = false;
};

const sending = async (prompt) => {
  let d = null;
  if (key.value) {
    d = await post(
      activeChan.value,
      {
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key.value}`,
        },
      }
    );
  } else {
    if (userInfo.value.token) {
      d = await api.chat({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
      });
      ticket();
    } else {
      data.push({
        role: "chatgpt",
        content: "请先登陆免费试用或者设置你的api key",
        meta: {
          actions: ["免费试用10次", "设置我的api key"],
        },
      });
    }
  }
  if (d) {
    const r = d.choices[0].message.content.trim();
    rep(r);
  }
  // console.log(d);
};

const rep = (r, meta) => {
  data.push({
    role: "chatgpt",
    content: "",
    meta,
  });
  const j = data.length - 1;
  for (let i = 0; i < r.length; i++) {
    setTimeout(() => {
      data[j].content += r.charAt(i);
      // 滚动条
      if (i % 20 == 0 || i == r.length - 1) {
        scrollToBottom();
      }
    }, i * 20);
  }
};

const byteLength = (str) => {
  let b = 0;
  let length = str.length;
  if (length) {
    for (var i = 0; i < length; i++) {
      if (str.charCodeAt(i) > 255) {
        b += 2;
      } else {
        b++;
      }
    }
    return b;
  } else {
    return 0;
  }
};

const clearChatRecord = () => {
  data.splice(1, data.length);
};

const scrollToBottom = debounce(() => {
  window.scrollTo(0, document.body.scrollHeight);
}, 100);

const dark = ref(false);

const toggleScheme = () => {
  let root = document.querySelector(":root");
  root.classList.toggle("dark");
  dark.value = root.classList.contains("dark");
  setItem({ dark: dark.value ? "true" : "false" });
};

// 认证相关

const email = ref("");
const loginKey = ref("");
const code = ref("");
const tickInfo = ref("");
const cdKey = ref("");
const userInfo = ref({ token: "", email: "" });
const tip = ref("");
const cdKeyDialog = ref(false);
const auth = async () => {
  loginKey.value = await api.auth(email.value);
};

const login = async () => {
  try {
    userInfo.value.token = await api.login(code.value, loginKey.value);
    userInfo.value.email = email.value;
    email.value = "";
    code.value = "";
    loginKey.value = "";
    loginDialog.value = false;
    setItem({ userInfo: JSON.stringify(userInfo.value) });
    setTimeout(() => {
      ticket();
    }, 1000);
  } catch (e) {
    tip.value = "登陆失败请重新检测验证码";
    setTimeout(() => {
      tip.value = "";
    }, 3000);
  }
};

const ticket = async () => {
  tickInfo.value = await api.ticket();
};

const useCdKey = async () => {
  try {
    await api.useCdKey(cdKey.value);
    ticket();
    cdKeyDialog.value = false;
  } catch (e) {
    console.log(e);
    tip.value = e.response;
    setTimeout(() => {
      tip.value = "";
    }, 3000);
  }
};

const inviteLink = async () => {
  let inviteCode = new URLSearchParams(location.search).get("inviteCode");
  if (inviteCode) {
    await api.inviteLink(inviteCode);
  }
};
</script>

<template>
  <div class="chat-warp" ref="chatWarpRef">
    <div class="chat-header">
      <div>
        <img class="logo" src="../assets/openai.svg" alt="" />
        <div class="title">
          ChatGPT
          <small> Online</small>
        </div>
        <small
          >基于gpt-3.5-turbo, 数据存放在本地
          <a href="https://github.com/weekend-project-space/chatgpt-online"
            >查看源码</a
          ></small
        >
      </div>
      <div>
        <svg
          class="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          width="1.3rem"
          @click="dialog = true"
        >
          <path
            d="M785.07008 238.92992V204.8a34.24256 34.24256 0 0 0-34.14016-34.12992H614.4A34.24256 34.24256 0 0 0 580.27008 204.8v34.12992H102.4V307.2h477.87008v34.12992c0 18.76992 15.36 34.12992 34.12992 34.12992h136.52992c18.76992 0 34.14016-15.36 34.14016-34.12992V307.2H921.6v-68.27008H785.07008zM716.8 307.2h-68.27008v-68.27008H716.8V307.2zM443.72992 477.87008v-34.12992C443.72992 424.96 428.36992 409.6 409.6 409.6H273.07008a34.24256 34.24256 0 0 0-34.14016 34.12992v34.12992H102.4v68.27008h136.52992v34.11968a34.24256 34.24256 0 0 0 34.14016 34.14016H409.6c18.76992 0 34.12992-15.36 34.12992-34.14016v-34.11968H921.6v-68.27008H443.72992z m-68.25984 68.27008H307.2v-68.27008h68.27008v68.27008zM716.8 716.8v-34.14016a34.23232 34.23232 0 0 0-34.12992-34.11968H546.12992A34.23232 34.23232 0 0 0 512 682.65984V716.8H102.4v68.25984h409.6V819.2a34.2528 34.2528 0 0 0 34.12992 34.14016h136.54016A34.2528 34.2528 0 0 0 716.8 819.2v-34.14016h204.8V716.8H716.8z m-68.27008 68.25984h-68.25984V716.8h68.25984v68.25984z"
            :fill="dark ? '#fff' : '#111'"
            fill-rule="evenodd"
          ></path>
        </svg>
        <svg
          @click="toggleScheme"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="astro"
          width="1.3rem"
        >
          <path
            v-if="dark"
            fill="#FFF"
            fill-rule="evenodd"
            d="M16.5 6A10.5 10.5 0 0 1 4.7 16.4 8.5 8.5 0 1 0 16.4 4.7l.1 1.3zm-1.7-2a9 9 0 0 1 .2 2 9 9 0 0 1-11 8.8 9.4 9.4 0 0 1-.8-.3c-.4 0-.8.3-.7.7a10 10 0 0 0 .3.8 10 10 0 0 0 9.2 6 10 10 0 0 0 4-19.2 9.7 9.7 0 0 0-.9-.3c-.3-.1-.7.3-.6.7a9 9 0 0 1 .3.8z"
          ></path>
          <path
            v-else
            fill=" #111"
            fill-rule="evenodd"
            d="M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zm0 1.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm12-7a.8.8 0 0 1-.8.8h-2.4a.8.8 0 0 1 0-1.6h2.4a.8.8 0 0 1 .8.8zM4 12a.8.8 0 0 1-.8.8H.8a.8.8 0 0 1 0-1.6h2.5a.8.8 0 0 1 .8.8zm16.5-8.5a.8.8 0 0 1 0 1l-1.8 1.8a.8.8 0 0 1-1-1l1.7-1.8a.8.8 0 0 1 1 0zM6.3 17.7a.8.8 0 0 1 0 1l-1.7 1.8a.8.8 0 1 1-1-1l1.7-1.8a.8.8 0 0 1 1 0zM12 0a.8.8 0 0 1 .8.8v2.5a.8.8 0 0 1-1.6 0V.8A.8.8 0 0 1 12 0zm0 20a.8.8 0 0 1 .8.8v2.4a.8.8 0 0 1-1.6 0v-2.4a.8.8 0 0 1 .8-.8zM3.5 3.5a.8.8 0 0 1 1 0l1.8 1.8a.8.8 0 1 1-1 1L3.5 4.6a.8.8 0 0 1 0-1zm14.2 14.2a.8.8 0 0 1 1 0l1.8 1.7a.8.8 0 0 1-1 1l-1.8-1.7a.8.8 0 0 1 0-1z"
          ></path>
        </svg>
      </div>
    </div>
    <div ref="chatPanelRef" class="chat-panel">
      <section class="chat-line-warp" v-for="(item, i) in data" :key="i">
        <section class="chat-line" v-if="item.role == 'chatgpt'">
          <span class="avatar"> <img src="../assets/openai.svg" alt="" /></span>
          <div class="msg">
            <div v-html="micromark(item.content)"></div>
            <ul class="question" v-if="item.meta && item.meta.questions">
              <li
                class="hover"
                v-for="i in item.meta.questions"
                :key="i"
                v-text="i"
                @click="repeat(i)"
              ></li>
            </ul>
            <ul class="action" v-if="item.meta && item.meta.actions">
              <li
                class="hover"
                v-for="i in item.meta.actions"
                :key="i"
                v-text="i"
                @click="action(i)"
              ></li>
            </ul>
          </div>
          <div></div>
        </section>
        <div class="chat-line chat-line-user" v-else>
          <div></div>
          <div class="msg" v-html="micromark(item.content)"></div>
          <span class="avatar">
            <img src="../assets/user.svg" alt="" />
          </span>
        </div>
        <div class="chat-line-action">
          <img
            src="../assets/copy.svg"
            title="copy"
            @click="copy(item.content)"
          />
          <img
            src="../assets/repeat.svg"
            title="repeat"
            @click="repeat(item.content)"
          />
          <img
            src="../assets/favor.svg"
            title="favor"
            @click="addFav(item.content)"
          />
        </div>
      </section>
      <section class="chat-line-warp" v-show="loading">
        <section class="chat-line">
          <span class="avatar"> <img src="../assets/openai.svg" alt="" /></span>
          <div class="msg"><p>请稍等， 正在思考中...</p></div>
        </section>
      </section>
      <div v-show="data.length" class="clear-warp">
        <button @click="clearChatRecord" class="clear">清理聊天记录</button>
      </div>
    </div>
    <div class="chat-footer">
      <div v-if="byteLength(input) / 65 < 1" class="favs">
        <ul class="question">
          <li v-for="(item, i) in favs" :key="i">
            <span class="hover" v-text="item" @click="input = item"></span>
            <img
              class="del"
              @click="delFav(i)"
              src="../assets/delete.svg"
              alt=""
            />
          </li>
        </ul>
      </div>
      <div class="chat-send-box">
        <textarea
          class="textarea"
          v-model="input"
          placeholder="请输入您的聊天信息，然后按enter发送。"
          @keypress.enter="send()"
          autocomplete="off"
          :rows="byteLength(input) / 65 + 1"
        />
        <svg
          @click="send()"
          class="send btn"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.97828 3.04161L21.3189 11.1188C22.0312 11.4939 22.0311 12.5138 21.3187 12.8886L5.97774 20.961C5.21303 21.3634 4.33238 20.6719 4.54192 19.8336L6 14L13 12.004L6 10L4.54225 4.16899C4.33263 3.33054 5.21355 2.63896 5.97828 3.04161Z"
            :fill="input ? '#00A457' : '#ccc'"
          ></path>
        </svg>
      </div>
      <p class="user-info">
        <small v-if="userInfo.token" v-text="userInfo.email"> </small>
        <small v-else class="hover" @click="loginDialog = true"
          >免费试用10次</small
        >
        <small v-if="userInfo.token"
          >已使用: {{ tickInfo }}
          <span class="hover" @click="action('获取更多')">获取更多</span></small
        >
      </p>
    </div>
  </div>
  <Dialog title="设置" v-model="dialog">
    <div class="input-group">
      <label for="">api key: </label>
      <input
        class="input"
        type="text"
        v-model="key"
        placeholder="请输入你的chat gpt api key."
        @keypress.enter="keyDialog = false"
      />
    </div>
    <div class="input-group">
      <label for="">api url: </label>
      <select class="input" v-model="activeChan">
        <option
          v-for="chan in chans"
          :value="chan"
          v-text="chan"
          :key="chan"
        ></option>
      </select>
    </div>
  </Dialog>
  <Dialog title="登陆" v-model="loginDialog">
    <div v-if="!loginKey">
      <div class="input-group">
        <label for="">邮箱： </label>
        <input
          class="input"
          type="text"
          v-model="email"
          placeholder="请输入邮箱地址"
        />
      </div>
      <button @click="auth">获取验证码</button>
    </div>
    <Transition>
      <div v-if="loginKey">
        <div class="input-group">
          <label for="">验证码: </label>
          <input
            class="input"
            type="text"
            v-model="code"
            placeholder="请输入验证码"
          />
        </div>
        <p v-text="tip" class="error"></p>
        <div>
          <button @click="login">登陆</button>
        </div>
      </div>
    </Transition>
  </Dialog>

  <Dialog title="输入卡密" v-model="cdKeyDialog">
    <div class="input-group">
      <label for="">卡密： </label>
      <input
        class="input"
        type="text"
        v-model="cdKey"
        placeholder="请输入卡密"
      />
    </div>
    <p v-text="tip" class="error"></p>
    <div>
      <button @click="useCdKey">确定</button>
    </div>
  </Dialog>
</template>

<style lang="less" scoped>
.user-info {
  padding: 0.5em 1em 0;
  display: flex;
  justify-content: space-between;
}
.chat-warp {
  min-height: 100vh;
  // max-width: 1024px;
  margin: 0 auto;
  background: transparent;
  color: var(--text-color);
  font-size: 14px;
  .chat-header,
  .chat-panel {
    padding: var(--padding);

    box-sizing: border-box;
  }
  .chat-header {
    padding-top: 2em;
    // position: sticky;
    // z-index: 10;
    // top: 0;
    // left: 0;
    // right: 0;
    // background: var(--msg-bg-color);
    min-height: 60px;
    border-top-right-radius: var(--gap-padding);
    border-top-left-radius: var(--gap-padding);
  }
  .chat-panel {
    min-height: calc(100vh - 265px);
  }
  .chat-footer {
    position: sticky;
    bottom: 1em;
    left: 0;
    right: 0;
    padding: 0 var(--padding);
    .chat-send-box {
      background: var(--send-color);
    }
    // border-bottom-right-radius: var(--gap-padding);
    // border-bottom-left-radius: var(--gap-padding);
  }
}
.logo-warp {
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--gap-padding);
  background-image: -webkit-linear-gradient(
    bottom right,
    #00c157,
    #00b08c,
    #009eb7,
    #00c157
  );
}
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .icon {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
  .logo {
    padding: 0.6em;
    border-radius: 50%;
    background-image: -webkit-linear-gradient(
      bottom right,
      #00c157,
      #00b08c,
      #009eb7,
      #00c157
    );
  }
  .astro {
    margin-left: 0.5em;
    cursor: pointer;
  }
  .title {
    font-size: 1.8em;
    color: var(--title-color);
    opacity: 0.7;
    font-weight: 600;
    .logo {
      width: 30px;
      height: 30px;
    }
    small {
      background: linear-gradient(to right, #05c19c, #8685ef);
      -webkit-background-clip: text;
      color: transparent;
      // display: inline-block;
      // margin-left: 10px;
      // background-image: -webkit-linear-gradient(
      //   right,
      //   #00c157,
      //   #00b08c,
      //   #009eb7
      // );
      // -webkit-background-clip: text;
      // -webkit-text-fill-color: transparent;
    }
  }
}
.chat-panel {
  // border-bottom: 1px solid var(--msg-bg-color);
  .chat-line {
    // background: rgba(0, 0, 0, 0.1);
    // border: 1px solid #ccc;
    display: grid;
    grid-template-columns: 36px auto 36px;
    grid-gap: var(--gap-padding);
    padding: 0.5rem 0;
    border-radius: 1rem;
  }
  .chat-line-user {
    grid-template-columns: 36px auto 36px;
    .avatar {
      background: #00a457;
    }
  }
  .avatar {
    display: block;
    width: 36px;
    height: 36px;
    line-height: 36px;
    background: #666;
    border-radius: var(--gap-padding);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    img {
      width: 26px;
      height: 26px;
    }
  }
  .msg {
    // border: 1px solid #444;
    border-radius: 10px;
    padding: 0.3rem 1rem;
    background: var(--msg-bg-color);
  }
  .chat-line-warp {
    position: relative;
    &:hover .chat-line-action {
      display: grid;
    }
    .chat-line-action {
      display: none;
      width: 80px;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      position: absolute;
      top: var(--gap-padding);
      right: calc(var(--gap-padding) + 35px);
      border-radius: var(--gap-padding);
      grid-template-columns: repeat(3, 1fr);
      grid-gap: var(--gap-padding);
      img {
        width: 15px;
        height: 15px;
        opacity: 0.9;
        cursor: pointer;
      }
    }
  }
}

.chat-avatar {
  color: #009eb7;
}
.chat-footer {
  position: relative;
  .favs {
    position: absolute;
    bottom: 75px;
    ul {
      list-style: none;
      padding-inline-start: 0;
      li {
        position: relative;
        display: inline;
        border: 1px solid #ccc;
        padding: var(--gap-padding);
        border-radius: var(--gap-padding);
        background: var(--msg-bg-color);
        margin-right: var(--gap-padding);
        .del {
          // top: -8px;
          // position: absolute;
          width: 10px;
          height: 10px;
          cursor: pointer;
        }
      }
    }
  }
}
.chat-send-box {
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr 26px;
  align-items: center;
  grid-gap: var(--gap-padding);
  border-radius: var(--gap-padding);
  box-shadow: 3px 3px 10px var(--msg-box-color),
    -3px -3px 10px var(--msg-box-color);
  // border: 1px solid #eee;
  .textarea {
    color: var(--text-color);
    border: 0;
    padding: 0.5em;
    line-height: 1.3em;
    border-radius: 10px;
    // border: 1px solid #ccc;
    background: var(--send-color);
    resize: none;

    // background: rgba(255, 255, 255, 0.6);
    &:focus {
      outline: var(--send-color);
    }
    &:hover {
      outline: var(--send-color);
    }
  }
  .btn {
    cursor: pointer;
    background: transparent;
    .send {
      color: #fff;
    }
  }
}
.question {
  list-style: none;
  padding-inline-start: 0px;
  .hover {
    display: inline;
    padding: var(--gap-padding);
  }
}
.hover {
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
}
.input {
  padding-inline-start: 0.5rem;
  border-radius: 3px;
  border: 1px solid #ccc;
  background: rgba(255, 255, 255, 0.6);
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  background-clip: padding-box;
  &:focus {
    outline-color: rgba(0, 0, 0, 0.1);
  }
}
.clear-warp {
  margin: 0 auto;
  text-align: center;
  button {
    color: red;
    opacity: 0.6;
    background: var(--msg-bg-color);
  }
}
.input-group {
  display: grid;
  grid-template-columns: minmax(60px, auto) 1fr;
  align-items: center;
  grid-gap: 1rem;
  margin-bottom: 1rem;
}
.mx-1 {
  margin-left: 1rem;
  margin-right: 1rem;
}
.email-warp {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-gap: 1rem;
}
.error {
  color: red;
  opacity: 0.6;
}
.v-enter-active {
  transition: all 0.3s ease-out;
}
.v-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.v-enter-from,
.v-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
