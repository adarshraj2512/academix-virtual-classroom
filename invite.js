// Get the room ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || Math.random().toString(36).substring(7);

// Get the server URL from environment or default to localhost
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5500' 
    : 'https://your-render-app-url.onrender.com'; // You'll need to replace this with your actual Render URL

// Initialize Socket.io
const socket = io(SERVER_URL);

// Initialize Peer connection
const myPeer = new Peer(undefined, {
    host: window.location.hostname === 'localhost' ? 'localhost' : 'your-render-app-url.onrender.com',
    port: window.location.hostname === 'localhost' ? '5500' : '443',
    path: '/peerjs',
    secure: window.location.hostname !== 'localhost'
});

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

// Store connected peers
const peers = {};
let myStream = null;

// Get user's video and audio stream
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    // Answer calls from other users
    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    // When a new user connects
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});

// When a user disconnects
socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
});

// When we join the room
myPeer.on('open', id => {
    socket.emit('join-room', roomId, id);
    
    // Generate and display invite link
    const inviteLink = `${window.location.origin}/join.html?room=${roomId}`;
    const inviteLinkInput = document.getElementById('inviteLink');
    if (inviteLinkInput) {
        inviteLinkInput.value = inviteLink;
    }
});

// Function to connect to a new user
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    
    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}

// Function to add a video stream to the grid
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// Copy invite link functionality
const copyButton = document.getElementById('copyInviteLink');
if (copyButton) {
    copyButton.addEventListener('click', () => {
        const inviteLink = document.getElementById('inviteLink').value;
        navigator.clipboard.writeText(inviteLink).then(() => {
            alert('Invite link copied to clipboard!');
        });
    });
}

// Video controls
window.toggleMute = function() {
    if (myStream) {
        const audioTrack = myStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        document.querySelector('#muteBtn i').className = 
            audioTrack.enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    }
}

window.toggleVideo = function() {
    if (myStream) {
        const videoTrack = myStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        document.querySelector('#videoBtn i').className = 
            videoTrack.enabled ? 'fas fa-video' : 'fas fa-video-slash';
    }
}

window.toggleScreenShare = async function() {
    try {
        if (!myStream.getVideoTracks()[0].enabled) {
            return; // Don't allow screen share when video is off
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia();
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track for all peers
        Object.values(peers).forEach(peer => {
            const sender = peer.peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
        });
        
        // Replace local video track
        const oldTrack = myStream.getVideoTracks()[0];
        myStream.removeTrack(oldTrack);
        myStream.addTrack(videoTrack);
        
        // Stop sharing when track ends
        videoTrack.onended = () => {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                const newVideoTrack = stream.getVideoTracks()[0];
                Object.values(peers).forEach(peer => {
                    const sender = peer.peerConnection.getSenders().find(s => s.track.kind === 'video');
                    sender.replaceTrack(newVideoTrack);
                });
                myStream.removeTrack(videoTrack);
                myStream.addTrack(newVideoTrack);
            });
        };
    } catch (err) {
        console.error('Error sharing screen:', err);
    }
}

window.leaveRoom = function() {
    if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peers).forEach(peer => peer.close());
    window.location.href = '/dashboard.html';
} 