import Peer from 'simple-peer';
import {useEffect, useRef, useState} from 'react';
import {WEBSOCKET_URL} from "../constants";
import {forEach} from "react-bootstrap/ElementChildren";

export const Room = ({user, roomId}) => {
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState(null);
    const videoRef = useRef();
    const processedVideoRef = useRef();
    // const socket = useRef(new WebSocket(WEBSOCKET_URL + '/' + roomId.toString()));
    const socket = useRef();

    useEffect(() => {
        socket.current = new WebSocket(WEBSOCKET_URL);
        if(peers){
            processedVideoRef.current.srcObject = null;
            peers.destroy();
        }
    }, [roomId]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then((stream) => {
                setStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((error) => {
                console.log(`Error in media device: ${error}`)
            });

        socket.current.onmessage = (message) => {
            const data = JSON.parse(message.data);
            console.log('on message');
            console.log(data);
            if(data.sdp){
                peers.signal(data);
            }
            // if (data.type === 'offer') {
            //     handleOffer(data);
            // } else if (data.type === 'answer') {
            //     handleAnswer(data);
            // } else if (data.type === 'new-peer') {
            //     createNewPeer(data);
            // } else if (data.type === 'candidate') {
            //     handleCandidate(data);
            // }
        }
    }, [peers, roomId]);

    const handleOffer = (data) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        });

        console.log(14);

        peer.on('signal', data => {
            console.log(20);
            socket.current.send(JSON.stringify(data));
        });

        console.log(15);

        peer.on('stream', stream => {
            console.log(30);
            addRemoteVideo(stream);
        });

        console.log(16);

        peer.signal(data);

        console.log(17);
        setPeers(peers => [...peers, peer]);
    };

    const handleAnswer = (data) => {
        console.log('handle answer');
        console.log(data);
        console.log(peers);
        console.log(peers[0]._id);
        console.log(data.id);
        peers.forEach(peer => {
            peer.signal(data);
        });
        // const peer = peers.find(p => p._id === data.id);
        // if (peer) {
        //     peer.signal(data);
        // }
    };

    const handleCandidate = (data) => {
        console.log(13);
        peers.forEach(peer => {
            peer.signal(data);
        });
        // const peer = peers.find(p => p.signal(data));
        // if (peer) {
        //     peer.signal(data);
        // }
    };

    const createNewPeer = (sdp) => {
        console.log('handle new peer');
        console.log('sdp');
        console.log(sdp);
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
        });
        console.log(1);

        peer.on('signal', data => {
            console.log(2);
            socket.current.send(JSON.stringify(data));
        });

        peer.on('stream', stream => {
            console.log(3);
            addRemoteVideo(stream);
        });

        console.log(4);
        peer.signal({type: 'offer', sdp});

        console.log(5);
        setPeers(peers => [...peers, peer]);
    };

    const startCall = () => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
        });

        peer.on('signal', data => {
            console.log('got signal');
            console.log(data);
            socket.current.send(JSON.stringify(data));
        });

        peer.on('stream', stream => {
            console.log('got stream');
            processedVideoRef.current.srcObject = stream;
            // addRemoteVideo(stream);
        });

        setPeers(peer);
    };

    const addRemoteVideo = (stream) => {
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoPlay = true;
        videoElement.style.width = '300px';
        document.getElementById('call-chat').appendChild(videoElement);
    }

    return (
        <div className="full-height border-end" id="call-chat">
            Room {roomId}
            <div>
                <video ref={videoRef} autoPlay muted style={{width: '300px'}}/>
                <video ref={processedVideoRef} autoPlay style={{ width: '300px' }} />
                <button onClick={startCall}>Start Call</button>
            </div>
        </div>
    );
};