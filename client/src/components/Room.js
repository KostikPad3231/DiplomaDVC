import {useEffect, useRef, useState} from 'react';
import Peer from 'simple-peer';
import {WEBSOCKET_URL} from "../constants";

import {FaMicrophoneAlt, FaVideo, FaMicrophoneAltSlash, FaVideoSlash} from "react-icons/fa";

// import {socket} from "../socket";


export const Room = ({user, roomId}) => {
    const [peers, setPeers] = useState({});
    const peersRef = useRef({});

    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const audioSocket = useRef(null);
    const videoSocket = useRef(null);

    const [isCalling, setIsCalling] = useState(false);
    const [playVideo, setPlayVideo] = useState(true);
    const [playAudio, setPlayAudio] = useState(true);
    const playAudioRef = useRef(true);

    const audioContextRef = useRef(null);
    const mediaStreamSourceRef = useRef(null);
    const audioProcessorRef = useRef(null);

    const leaveCall = () => {
        if (audioSocket.current) {
            audioSocket.current.close();
        }
        if (videoSocket.current) {
            videoSocket.current.close();
        }
        if (peersRef.current) {
            setPeers({});
            peersRef.current = {};
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current.onaudioprocess = null;
            audioProcessorRef.current = null;
        }
    };

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then((stream) => {
                setStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((error) => {
                console.log(`Error accessing media devices: ${error}`)
            });
        return () => {
            leaveCall();
        }
    }, [roomId]);

    // useEffect(() => {
    //     if (playVideo) {
    //         navigator.mediaDevices.getUserMedia({video: true, audio: {sampleRate: 16000}})
    //             .then((stream) => {
    //                 setStream(stream);
    //                 if (videoRef.current) {
    //                     videoRef.current.srcObject = stream;
    //                 }
    //             })
    //             .catch((error) => {
    //                 console.log(`Error accessing media devices: ${error}`)
    //             });
    //     } else {
    //         if (stream) {
    //             stream.getTracks().forEach(track => track.stop());
    //         }
    //     }
    // }, [playVideo]);

    const handleAudioMessage = async (message) => {
        const dataView = new DataView(message.data);
        const userFromLength = dataView.getUint8(0);
        const userFrom = new TextDecoder().decode(message.data.slice(1, 1 + userFromLength));
        const float32Array = new Float32Array(message.data.slice(1 + userFromLength));

        // const float32Array = new Float32Array(audioData.length);
        // for (let i = 0; i < audioData.length; i++) {
        //     float32Array[i] = audioData[i] / 0x7FFF;
        // }
        const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, audioContextRef.current.sampleRate);
        audioBuffer.getChannelData(0).set(float32Array);
        const bufferSource = audioContextRef.current.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(audioContextRef.current.destination);
        bufferSource.start();
    }

    const handleVideoMessage = async (message) => {
        const data = JSON.parse(message.data);
        if (data.type === 'signal') {
            if (peersRef.current[data.from]) {
                peersRef.current[data.from].signal({...data.signal, from: data.to, to: data.from});
            }
        } else if (data.type === 'users') {
            data.users.forEach(username => {
                if (user.username !== username) {
                    const peer = createPeer(username, stream);
                    peersRef.current = {...peersRef.current, [username]: peer};
                    setPeers(prevPeers => ({...prevPeers, [username]: peer}));
                }
            });
        } else if (data.type === 'new-user') {
            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: new MediaStream([stream.getVideoTracks()[0]])
            });

            peer.on('signal', signal => {
                videoSocket.current.send(JSON.stringify({
                    type: 'signal',
                    from: user.username,
                    to: data.from,
                    signal
                }));
            });

            peersRef.current = {...peersRef.current, [data.from]: peer};
            setPeers(prevPeers => ({...prevPeers, [data.from]: peer}));
        } else if (data.type === 'disconnect-user') {
            console.log(`disconnected user ${data.from}`);
            console.log(peersRef.current);
            if (peersRef.current[data.from]) {
                peersRef.current[data.from].destroy();
                delete peersRef.current[data.from];
                setPeers(prevPeers => {
                    const newPeers = {...prevPeers};
                    delete newPeers[data.from];
                    return newPeers;
                });
            }
        }
    }

    const createPeer = (userTo, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: new MediaStream([stream.getVideoTracks()[0]])
        });

        peer.on('signal', signal => {
            videoSocket.current.send(JSON.stringify({
                type: 'signal',
                from: user.username,
                to: userTo,
                signal: signal,
            }));
        });

        return peer;
    };

    const onAudioData = async (event) => {
        if (!playAudioRef.current) return;

        const audioData = event.inputBuffer.getChannelData(0);
        const float32Array = new Float32Array(audioData);
        // const int16Array = new Int16Array(audioData.length);
        // for (let i = 0; i < audioData.length; i++) {
        //     int16Array[i] = Math.min(1, audioData[i]) * 0x7FFF;
        // }
        audioSocket.current.send(float32Array.buffer);
    }

    const handleCallClick = () => {
        if (!isCalling) {
            if (playVideo) {
                videoSocket.current = new WebSocket(WEBSOCKET_URL + '/video/' + roomId.toString() + '/' + localStorage.getItem('token'));
                videoSocket.current.onmessage = handleVideoMessage;

                videoSocket.current.onopen = () => {
                    videoSocket.current.send(JSON.stringify({type: 'join'}))
                };
            }
            if (playAudio) {
                startAudioSocket();
            }
            setIsCalling(true);
        } else {
            leaveCall();
            setIsCalling(false);
        }
    };

    const startVideoSocket = () => {

    }

    const startAudioSocket = () => {
        audioSocket.current = new WebSocket(WEBSOCKET_URL + '/audio/' + roomId.toString() + '/' + localStorage.getItem('token'));
        audioSocket.current.binaryType = 'arraybuffer';

        audioSocket.current.onmessage = handleAudioMessage;

        audioSocket.current.onopen = () => {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 16000});
            console.log(audioContextRef.current.sampleRate);
            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(new MediaStream([stream.getAudioTracks()[0]]));
            audioProcessorRef.current = audioContextRef.current.createScriptProcessor(16384, 1, 1);
            mediaStreamSourceRef.current.connect(audioProcessorRef.current);
            audioProcessorRef.current.connect(audioContextRef.current.destination);

            audioProcessorRef.current.onaudioprocess = onAudioData;
        };
    };

    const onPlayVideoClick = () => {
        const videoTrack = stream.getVideoTracks()[0];
        console.log(!playVideo);
        // Object.entries(peers).forEach(([username, peer]) => {
        //     peer.removeTrack(videoTrack);
        // });
        videoTrack.enabled = !playVideo;
        setPlayVideo(!playVideo);
    };

    const onPlayAudioClick = () => {
        if(audioSocket.current === null){
            startAudioSocket();
        }
        playAudioRef.current = !playAudioRef.current;
        setPlayAudio(!playAudio);
    };

    return (
        <div className="full-height border-end" id="call-chat">
            Room {roomId}
            {}
            {/*<Button type="danger">Delete room</Button>*/}
            <div>
                <div className="my-video-container" style={{width: '300px', height: '225px'}}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        style={{width: '300px'}}
                    />
                    <div className="d-flex justify-content-center meet-icon-container">
                        <div onClick={onPlayAudioClick}>
                            {playAudio ?
                                <FaMicrophoneAlt/> :
                                <FaMicrophoneAltSlash/>
                            }
                        </div>
                        <div onClick={onPlayVideoClick}>
                            {playVideo ?
                                <FaVideo/> :
                                <FaVideoSlash/>
                            }
                        </div>
                    </div>
                </div>
                {Object.entries(peers).map(([username, peer]) => {
                    return <Video key={username} peer={peer}/>
                })}
                <button onClick={handleCallClick}>
                    {isCalling ?
                        'Leave' :
                        'Start Call'
                    }
                </button>
            </div>
        </div>
    );
};

const Video = ({peer}) => {
    const streamRef = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            streamRef.current.srcObject = stream;
        });
    }, [peer]);

    return <video ref={streamRef} autoPlay style={{width: '300px'}}/>
}