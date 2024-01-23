// <reference path="agora-rtm-sdk.d.ts" />
const participantsList =
  document.getElementsByClassName("participants__list")[0];
const chatList = document.getElementsByClassName("chat__list")[0];
const typeMessage = document.getElementsByClassName("message-form")[0];

document
  .getElementsByClassName("participants__open-btn")[0]
  ?.addEventListener("click", (e) => {
    const btn = e.target;
    if (btn.classList.contains("active")) {
      btn.textContent = "⮝";
      participantsList.style.display = "flex";
    } else {
      btn.textContent = "⮟";
      participantsList.style.display = "none";
    }
    btn.classList.toggle("active");
  });

document
  .getElementsByClassName("chat__open-btn")[0]
  ?.addEventListener("click", (e) => {
    const btn = e.target;
    if (btn.classList.contains("active")) {
      btn.textContent = "⮝";
      chatList.style.display = "flex";
      typeMessage.style.display = "block";
    } else {
      btn.textContent = "⮟";
      chatList.style.display = "none";
      typeMessage.style.display = "none";
    }
    btn.classList.toggle("active");
  });

let localStream;
let remoteStream;
let peerConnection;

let uid = String(Date.now());
let APP_ID = "d3bcf290d0a6450fbaf8fb8d1305a4d5";

let query_str = window.location.search;
let url_params = new URLSearchParams(query_str);
let conf_id = url_params.get("conf");
if (!conf_id) {
  window.location = "index.html";
}

let client; //client
let channel;

let username = sessionStorage.getItem("username");
if (!username) {
  window.location = "index.html";
}
let rtmClient;

let token = null;

let localTracks = [];
let remoteUsers = {};

let screenShare = false;
let localScreenTracks;
const messageInput = document.getElementsByName("message");


let joinRoomInit = async () => {
  rtmClient = await AgoraRTM.createInstance(APP_ID);
  await rtmClient.login({ uid, token });

  channel = await rtmClient.createChannel(conf_id);
  await channel.join();

  await rtmClient.addOrUpdateLocalUserAttributes({ username: username });

  channel.on("MemberJoined", handleMemberJoined);
  channel.on("MemberLeft", handleMemberLeft);
  channel.on("ChannelMessage", handleChannelMessage);

  getMembers();
  checkUsername();

  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(APP_ID, conf_id, token, uid);

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({
    encoderConfig: {
      width: { min: 640, ideal: 1920, max: 1920 },
      height: { min: 480, ideal: 1080, max: 1080 },
    },
  });
  const remote_username = await rtmClient.getUserAttributesByKeys(uid, [
    "username",
  ]);
  const my_username = remote_username.username;
  let player = `<div class="video_wrapper" id="user-container-${uid}">
                    <h3 class="video_wrapper__username">${my_username}</h3>
                    <div class="video-player" id="user-${uid}"></div>
                </div>`;
  document.getElementById("videos").insertAdjacentHTML("beforeend", player);
  document
    .getElementById(`user-container-${uid}`)
    .addEventListener("click", expandVideoFrame);
  localTracks[1].play(`user-${uid}`);

  let members = await client.remoteUsers;
  for (let i = 0; i < members.length; i++) {
    await client.subscribe(members[i], 'audio');
    await client.subscribe(members[i], 'video');
  }

  client.on("user-published", handleUserPublished);
  client.on('user-unpublished', handleUserUnublished)
  client.on("user-left", handleUserLeft);

  clickCamera();
  clickMic();
  await client.publish([localTracks[0], localTracks[1]]);
};

let handleUserUnublished = async(user) => {
    document.getElementById(`user-container-${user.uid}`).style.display = 'none'
}

let handleUserPublished = async (user, mediaType) => {
  const remote_username = await rtmClient.getUserAttributesByKeys(user.uid, [
    "username",
  ]);
  const username = remote_username.username;
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);
  let player = document.getElementById(`user-container-${user.uid}`);
  if (player === null) {
    player = `
    <div class="video_wrapper" id="user-container-${user.uid}">
        <h3 class="video_wrapper__username">${username}</h3>
        <div class="video-player" id="user-${user.uid}"></div>
    </div>`;
    document.getElementById("videos").insertAdjacentHTML("beforeend", player);
  }
  document.getElementById(`user-container-${user.uid}`).style.display = 'block'
  document
    .getElementById(`user-container-${user.uid}`)
    .addEventListener("click", expandVideoFrame);

  if (mediaType === "video") {
    user.videoTrack.play(`user-${user.uid}`);
  }
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
  if (bigFrame.style.display) {
    document.getElementById(`user-container-${user.uid}`).style.width = "180px";
    document.getElementById(`user-container-${user.uid}`).style.height =
      "130px";
  }
};

let handleUserLeft = async (user) => {
  delete remoteUsers[user.uid];
  document.getElementById(`user-container-${user.uid}`).remove();
  if (userInFrame === `user-container-${user.uid}`) {
    bigFrame.style.display = "none";
    let videos = document.getElementsByClassName("video_wrapper");

    for (let i = 0; i < videos.length; i++) {
      videos[i].style.width = "640px";
      videos[i].style.height = "480px";
    }
  }
};

joinRoomInit();

let clickCamera = async () => {
  let cam_button = document.getElementById("camera-btn");
  
  if (localTracks[1].muted) {
    if (screenShare) {
      disableScreenShare();
    }
    document.getElementById(`user-container-${uid}`).style.display = "block";
    await localTracks[1].setMuted(false);
    cam_button.style.backgroundColor = "rgb(100, 218, 94)";
    cam_button.querySelector("img").src = "images/camera_on.png";
  } else {
    document.getElementById(`user-container-${uid}`).style.display = "none";
    await localTracks[1].setMuted(true);
    cam_button.style.backgroundColor = "rgb(252, 72, 72)";
    cam_button.querySelector("img").src = "images/camera_off.png";
  }
};

let clickMic = async () => {
  let mic_button = document.getElementById("mic-btn");

  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    mic_button.style.backgroundColor = "rgb(100, 218, 94)";
    mic_button.querySelector("img").src = "images/mic_on.png";
  } else {
    await localTracks[0].setMuted(true);
    mic_button.style.backgroundColor = "rgb(252, 72, 72)";
    mic_button.querySelector("img").src = "images/mic_off.png";
  }
};

let clickScreenShare = async (e) => {
  e.preventDefault();
  if (screenShare) {
   
    disableScreenShare();
  }
    
  else {
    enableScreenShare();
  }
};

let enableScreenShare = async () => {
  let screenshare_button = document.getElementById("screenshare-btn");
  let cam_button = document.getElementById("camera-btn");
  cam_button.style.backgroundColor = "rgb(252, 72, 72)";
  cam_button.querySelector("img").src = "images/camera_off.png";
  document.getElementById(`user-container-${uid}`).style.display = "none";
  screenShare = true;
  screenshare_button.style.backgroundColor = "rgb(100, 218, 94)";
  localScreenTracks = await AgoraRTC.createScreenVideoTrack();
  localScreenTracks.optimizationMode = "motion";
  const remote_username = await rtmClient.getUserAttributesByKeys(uid, [
    "username",
  ]);
  const username = remote_username.username;
  let player = `<div class="video_wrapper" id="screenshare-container-${uid}">
                    <h3 class="video_wrapper__username">${username}</h3>
                    <div class="video-player" id="screen-${uid}"></div>
                </div>`;
  document.getElementById("videos").insertAdjacentHTML("afterbegin", player);
  // click Fullscreen
  localScreenTracks.play(`screen-${uid}`);
  await localTracks[1].setMuted(true);
  await client.unpublish([localTracks[1]]);

  await client.publish([localScreenTracks]);
  document
    .getElementById(`screenshare-container-${uid}`)
    .addEventListener("click", expandVideoFrame);
};
let disableScreenShare = async () => {
  let screenshare_button = document.getElementById("screenshare-btn");

  screenShare = false;
  screenshare_button.style.backgroundColor = "rgb(252, 72, 72)";
  localScreenTracks.close();
  document.getElementById(`screenshare-container-${uid}`).remove();
  document.getElementById(`user-container-${uid}`).style.display = "none";
  await client.unpublish([localScreenTracks]);
  await client.publish([localTracks[1]]);
  hideBigFrame();
};

let checkUsername = async () => {
  let members = await channel.getMembers();
  let q = 0;
  for (let i = 0; i < members.length; i++) {
    let name = await rtmClient.getUserAttributesByKeys(members[i], [
      "username",
    ]);

    if (username === name.username) {
      q = q + 1;
    }
    if (q > 1) {
      window.location = `index.html`;
    }
  }
};

let handleMemberJoined = async (MemberId) => {
  addMemberToMemberList(MemberId);
};

let addMemberToMemberList = async (MemberId) => {
  let { username } = await rtmClient.getUserAttributesByKeys(MemberId, [
    "username",
  ]);

  let new_member = `<div class="member" id="member-${MemberId}">
                    ${username}
                    </div>`;
  let memberlist = document.getElementById("member-list");

  memberlist.insertAdjacentHTML("beforeend", new_member);
};

let handleMemberLeft = async (MemberId) => {
  removeMemberFromDom(MemberId);
};

let removeMemberFromDom = async (MemberId) => {
  document.getElementById(`member-${MemberId}`).remove();
};

let leaveChannel = async () => {
  await channel.leave();
  await rtmClient.logout();
};

let getMembers = async () => {
  let members = await channel.getMembers();
  for (let i = 0; i < members.length; i++) {
    addMemberToMemberList(members[i]);
  }

};

let sendMessage = async (e) => {
  e.preventDefault();
  let message = e.target.message.value;
  channel.sendMessage({
    text: JSON.stringify({
      type: "chat",
      text: message,
      sender_name: username,
    }),
  });
  handleChannelMessage({
    text: JSON.stringify({
      type: "chat",
      text: message,
      sender_name: username,
    }),
  });
  e.target.reset();
};

let handleChannelMessage = async (message) => {
  let parsed_data = JSON.parse(message.text);
  let data = parsed_data.text;
  const clearData = data.trim();
  if (clearData) {
    let sender_name = parsed_data.sender_name;
    let message_container = `<div class="message_wrapper">
                                <strong class="message_author">${sender_name}</strong>
                                <p class="message_text">${clearData}</p>
                                </div>`;
    document
      .getElementById("messages")
      .insertAdjacentHTML("beforeend", message_container);
  } else {
    messageInput.value = "";
  }
};

let videos = document.getElementsByClassName("video_wrapper");
let bigFrame = document.getElementById("big-frame");
let userInFrame = null;

let expandVideoFrame = (e) => {
  let child = bigFrame.children[0];
  if (child) {
    document.getElementById("videos").appendChild(child);
  }
  bigFrame.style.display = "block";
  bigFrame.appendChild(e.currentTarget);
  userInFrame = e.currentTarget.id;
  for (let i = 0; i < videos.length; i++) {
    if (videos[i].id !== userInFrame) {
      videos[i].style.width = "180px";
      videos[i].style.height = "130px"; //mb lower?
    }
  }

};

let hideBigFrame = () => {
  userInFrame = null;
  bigFrame.style.display = "none";
  document.getElementById("videos").appendChild(bigFrame.children[0]);
  for (let i = 0; i < videos.length; i++) {
    videos[i].style.width = "640px";
    videos[i].style.height = "480px";
  }
};

for (let i = 0; i < videos.length; i++) {
  videos[i].addEventListener("click", expandVideoFrame);
}
bigFrame.addEventListener("click", hideBigFrame);

window.addEventListener("beforeunload", leaveChannel);

document.getElementById("camera-btn").addEventListener("click", clickCamera);
document.getElementById("mic-btn").addEventListener("click", clickMic);
document
  .getElementById("screenshare-btn")
  .addEventListener("click", clickScreenShare);

document.getElementById("message_form").addEventListener("submit", sendMessage);
