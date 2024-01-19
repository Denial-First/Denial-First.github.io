
// <reference path="agora-rtm-sdk.d.ts" />
let localStream;
let remoteStream;
let peerConnection;



let uid = String(Date.now())
let APP_ID = 'd3bcf290d0a6450fbaf8fb8d1305a4d5'

let query_str = window.location.search
let url_params = new URLSearchParams(query_str)
let conf_id = url_params.get('conf');
if (!conf_id) {
    window.location = 'index.html'
}


let client; //client
let channel;

let username = sessionStorage.getItem('username');
if (!username) {
    window.location = `index.html`
}
let rtmClient;

let token = null;

let localTracks = []
let remoteUsers = {}

let screenShare = false;
let localScreenTracks;


let joinRoomInit = async() => {
    rtmClient = await AgoraRTM.createInstance(APP_ID)
    await rtmClient.login({uid, token})
    
    channel = await rtmClient.createChannel(conf_id)
    await channel.join()
    
    await rtmClient.addOrUpdateLocalUserAttributes({'username': username})
    
    channel.on('MemberJoined', handleMemberJoined)
    channel.on('MemberLeft', handleMemberLeft)
    channel.on('ChannelMessage', handleChannelMessage)

    getMembers()
    checkUsername()

    client = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'})
    await client.join(APP_ID, conf_id, token, uid)
    
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({encoderConfig:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080}
    }})
    let player = `<div class="video_wrapper" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                </div>`
    document.getElementById('videos').insertAdjacentHTML('beforeend', player)
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)
    localTracks[1].play(`user-${uid}`)

    client.on('user-published', handleUserPublished)
    client.on('user-unpublished', handleUserUnublished)
    client.on('user-left', handleUserLeft)
    
    clickCamera()
    clickMic()
    await client.publish([localTracks[0], localTracks[1]])
    console.log(channel.getMembers())
    console.log(client.localTracks)
    
}

let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user
    console.log(user)
    const remote_username = await rtmClient.getUserAttributesByKeys(user.uid, ['username'])
    await client.subscribe(user, mediaType)
    let player = document.getElementById(`user-container-${user.uid}`)
    if (player === null){
        player = `<div class="video_wrapper" id="user-container-${user.uid}"><div class="video-player" id="user-${user.uid}"></div></div>`

        document.getElementById('videos').insertAdjacentHTML('beforeend', player)
    }
    else {
        document.getElementById(`user-container-${user.uid}`).style.display = 'block'
    }
    document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame)

    
    if (mediaType ==='video') {
        user.videoTrack.play(`user-${user.uid}`)
    }
    if (mediaType ==='audio') {
        user.audioTrack.play()
    }
    if(bigFrame.style.display) {
        document.getElementById(`user-container-${user.uid}`).style.width = '180px'
        document.getElementById(`user-container-${user.uid}`).style.height = '130px'
    }

}

let handleUserUnublished = async(user) => {
    document.getElementById(`user-container-${user.uid}`).style.display = 'none'
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
    // localStorage.setItem(conf_id, channel.getMembers())
    if (userInFrame === `user-container-${user.uid}`) {
        bigFrame.style.display = 'none'
        let videos = document.getElementsByClassName('video_wrapper')

        for (let i = 0; i < videos.length; i++)
        {
            videos[i].style.width = '640px'
            videos[i].style.height = '480px'
        }
    }
    // console.log('remote users', remoteUsers)
    // for (let i = 0; i < localStorage.length; i++){
    //     console.log(localStorage.key(i), localStorage.getItem(localStorage.key(i)))
    // }
}


joinRoomInit()

let clickCamera = async() => {
    let cam_button = document.getElementById('camera-btn')
    
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false)
        cam_button.style.backgroundColor = 'rgb(100, 218, 94)';
        cam_button.querySelector('img').src = 'images/camera_on.png'
        document.getElementById(`user-container-${uid}`).style.display = 'block'
        
    }
    else {
        await localTracks[1].setMuted(true)
        cam_button.style.backgroundColor = 'rgb(252, 72, 72)';
        cam_button.querySelector('img').src = 'images/camera_off.png'
        document.getElementById(`user-container-${uid}`).style.display = 'none'
    }
    if (screenShare)
    {
        clickScreenShare()
    }

}

let clickMic = async() => {
    let mic_button = document.getElementById('mic-btn')
    
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false)
        mic_button.style.backgroundColor = 'rgb(100, 218, 94)';
        mic_button.querySelector('img').src = 'images/mic_on.png'
        
    }
    else {
        await localTracks[0].setMuted(true)
        mic_button.style.backgroundColor = 'rgb(252, 72, 72)';
        mic_button.querySelector('img').src = 'images/mic_off.png'
    }
}

let clickScreenShare = async (e) => {
    e.preventDefault()
    console.log(screenShare)
    if (!screenShare)
    {
        enableScreenShare()
        
    }
    else
    {
        disableScreenShare()
    }
}

let enableScreenShare = async() => {
    let screenshare_button = document.getElementById('screenshare-btn')
    let cam_button = document.getElementById('camera-btn')
    cam_button.style.backgroundColor = 'rgb(252, 72, 72)';
    cam_button.querySelector('img').src = 'images/camera_off.png'
    document.getElementById(`user-container-${uid}`).style.display = 'none'
    screenShare = true;
    screenshare_button.style.backgroundColor = 'rgb(100, 218, 94)';
    localScreenTracks = await AgoraRTC.createScreenVideoTrack()
    localScreenTracks.optimizationMode='motion'
    let player = `<div class="video_wrapper" id="screenshare-container-${uid}">
                <div class="video-player" id="screen-${uid}"></div>
                </div>`
    document.getElementById('videos').insertAdjacentHTML('afterbegin', player)
    // click Fullscreen
    localScreenTracks.play(`screen-${uid}`)
    console.log('enabled')
    await localTracks[1].setMuted(true)
    await client.unpublish([localTracks[1]])
    
    await client.publish([localScreenTracks])
    document.getElementById(`screenshare-container-${uid}`).addEventListener('click', expandVideoFrame)
    console.log(localScreenTracks)
}
let disableScreenShare = async() => {
    let screenshare_button = document.getElementById('screenshare-btn')
    
    screenShare = false;
    screenshare_button.style.backgroundColor = 'rgb(252, 72, 72)';
    localScreenTracks.close();
    console.log('disabled')
    document.getElementById(`screenshare-container-${uid}`).remove()
    document.getElementById(`user-container-${uid}`).style.display = 'block'
    await client.unpublish([localScreenTracks])
    await client.publish([localTracks[1]])
    hideBigFrame()
}

let checkUsername = async () => {
    let members = await channel.getMembers()
    console.log(members)
    let q = 0;
    for (let i=0; i < members.length; i++)
    {
        let name = await rtmClient.getUserAttributesByKeys(members[i], ['username'])
        if (username === name.username)
        {
            q = q + 1;
        }
        if (q > 1)
        {
            window.location = `index.html`
        }
            
    }
}




let handleMemberJoined = async(MemberId) => {
    console.log(MemberId, 'joined')
    addMemberToMemberList(MemberId)
}

let addMemberToMemberList = async (MemberId) => {
    let {username} = await rtmClient.getUserAttributesByKeys(MemberId, ['username'])
    
    console.log(`addMembertomemberlist name: ${username}`)
    let new_member = `<div class="member" id="member-${MemberId}">
                    ${username}
                    </div>`
    let memberlist = document.getElementById('member-list')

    memberlist.insertAdjacentHTML('beforeend', new_member)
    
}

let handleMemberLeft = async (MemberId) => {
    removeMemberFromDom(MemberId)

}

let removeMemberFromDom = async (MemberId) => {
    
    document.getElementById(`member-${MemberId}`).remove()
    // localStorage.removeItem(username)
    console.log('deleted')
}

let leaveChannel = async () => {
    
    console.log('leavechannel')
    await channel.leave()
    await rtmClient.logout()
    // handleUserLeft(MemberId)
}

let getMembers = async () => {
    let members = await channel.getMembers()
    for (let i = 0; i < members.length; i++) {
        addMemberToMemberList(members[i])
    }
    // localStorage.setItem(conf_id, members)
    // for (let i = 0; i < localStorage.length; i++)
    // {
    //     let q = localStorage.key(i)
    //     console.log(i, q, localStorage.getItem(q))
    // }
}

let sendMessage = async (e) => {
    e.preventDefault()
    let message = e.target.message.value
    channel.sendMessage({text:JSON.stringify({'type': 'chat', 'text': message, 'sender_name': username})})
    console.log(message)
    handleChannelMessage({text:JSON.stringify({'type': 'chat', 'text': message, 'sender_name': username})})
    e.target.reset()

}

let handleChannelMessage = async (message) => {
    console.log(message)
    let parsed_data = JSON.parse(message.text)
    let data = parsed_data.text
    let sender_name = parsed_data.sender_name
    

    let message_container = `<div class="message_wrapper">
                            <strong class="message_author">${sender_name}</strong>
                            <p class="message_text">${data}</p>
                            </div>`
    document.getElementById('messages').insertAdjacentHTML('beforeend', message_container)
}


let videos = document.getElementsByClassName('video_wrapper')
let bigFrame = document.getElementById('big-frame')
let userInFrame = null;

let expandVideoFrame = (e) => {
    
    console.log('pressed')
    let child = bigFrame.children[0]
    if (child) {
        document.getElementById('videos').appendChild(child)
    }
    bigFrame.style.display = 'block'
    bigFrame.appendChild(e.currentTarget)
    userInFrame = e.currentTarget.id
    for (let i = 0; i < videos.length; i++)
    {
        if (videos[i].id !== userInFrame)
        {
            videos[i].style.width = '180px'
            videos[i].style.height = '130px' //mb lower?
        }
    }
    // else
    // {
    
    // }
}

let hideBigFrame = () => {
        userInFrame = null
        bigFrame.style.display = 'none'
        document.getElementById('videos').appendChild(bigFrame.children[0])
        for (let i = 0; i < videos.length; i++)
        {
            videos[i].style.width = '640px'
            videos[i].style.height = '480px'
        }
}

for (let i = 0; i < videos.length; i++)
{
    videos[i].addEventListener('click', expandVideoFrame)
}
// document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame)
bigFrame.addEventListener('click', hideBigFrame)



window.addEventListener('beforeunload', leaveChannel)

document.getElementById('camera-btn').addEventListener('click', clickCamera)
document.getElementById('mic-btn').addEventListener('click', clickMic)
document.getElementById('screenshare-btn').addEventListener('click', clickScreenShare)

document.getElementById('message_form').addEventListener('submit', sendMessage)

// addEventListener('removestream', clickScreenShare)

// onremovestream = (event) => {
//     clickScreenShare
// };



// let init = async() => {
//     client = await AgoraRTM.createInstance(APP_ID)
//     await client.login({uid})
//     channel = client.createChannel(String(conf_id))
//     await channel.join()

//     channel.on('MemberJoined', handleUserJoined)
//     channel.on('MemberLeft', handleUserLeft)

//     localStream = await navigator.mediaDevices.getUserMedia({video:true, audio: true})
//     clickCamera()
//     clickMic()
//     document.getElementById('user-1').srcObject = localStream

//     client.on('MessageFromPeer', handleMessageFromPeer)

// }

// let handleUserLeft = async() => {
//     document.getElementById('user-2').style.display = 'none'

// }

// let handleMessageFromPeer = async(message, MemberId) => {
//     // console.log(message.text, ':', MemberId)
//     message = JSON.parse(message.text)
    
//     if (message.type ===  'offer') {
//         createAnswer(MemberId, message.offer)
//     }
//     else if (message.type ===  'answer') {
//         addAnswer(message.answer)
//     }
//     else if (message.type ===  'candidate') {
//         if (peerConnection){
//             peerConnection.addIceCandidate(message.candidate)
//         }
//     }

// }

// let createPeerConnection = async(MemberId) => {
//     peerConnection = new RTCPeerConnection(servers)
    
//     remoteStream = new MediaStream()
//     document.getElementById('user-2').srcObject = remoteStream
//     document.getElementById('user-2').style.display = 'block'

//     if (!localStream) {
//         localStream = await navigator.mediaDevices.getUserMedia({video:true, audio: true})
//         document.getElementById('user-1').srcObject = localStream
//     }
//     localStream.getTracks().forEach((track) => {
//         peerConnection.addTrack(track, localStream)
//     });
    
//     peerConnection.ontrack = (event) => {
//         event.streams[0].getTracks().forEach((track) => {
//             remoteStream.addTrack(track)
//         })
//     }

//     peerConnection.onicecandidate = async (event)  => {
//         if (event.candidate) {
//             client.sendMessageToPeer({text:JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, MemberId)
//         }
//     }
// }

// let handleUserJoined = async (MemberId) => {
//     console.log('User joined:', MemberId)
//     createOffer(MemberId)
// }

// let createOffer = async(MemberId) => {
//     await createPeerConnection(MemberId)


    
//     let offer = await peerConnection.createOffer()
//     await peerConnection.setLocalDescription(offer)

//     client.sendMessageToPeer({text:JSON.stringify({'type': 'offer', 'offer': offer})}, MemberId)
// }

// let createAnswer = async(MemberId, offer) => {
//     await createPeerConnection(MemberId)

//     await peerConnection.setRemoteDescription(offer)

//     let answer = await peerConnection.createAnswer()
//     await peerConnection.setLocalDescription(answer)

//     client.sendMessageToPeer({text:JSON.stringify({'type': 'answer', 'answer': answer})}, MemberId)
// }
// let addAnswer = async (answer) => {
//     if (!peerConnection.currentRemoteDescription) {
//         await peerConnection.setRemoteDescription(answer)
//     }
// }

// let leaveChannel = async () => {
//     await channel.leave()
//     await client.logout()
// }



// // let create_user = async() => {
// //     let mic_status = localStream.getTracks().find(track => track.kind ==='audio')
// //     localStream = await navigator.mediaDevices.getUserMedia({video:true, audio: mic_status})
// //     document.getElementById('user-1').srcObject = localStream
// //     localStream.getTracks().forEach((track) => {
// //         peerConnection.addTrack(track, localStream)
// //     });
// // }

// // document.getElementById('leave-btn').addEventListener('click', clickLeave)


// window.addEventListener('beforeunload', leaveChannel)

// init()

// <!-- <video class="user-camera" id="user-1" autoplay></video>
//             <video class="user-camera" id="user-2" autoplay></video> -->