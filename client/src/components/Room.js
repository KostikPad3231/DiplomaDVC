import {useEffect, useRef, useState} from 'react';
import {WaveFile} from 'wavefile';
import Peer from 'simple-peer';
import {WEBSOCKET_URL} from "../constants";

import {MediaRecorder, register} from 'extendable-media-recorder';
import {connect} from 'extendable-media-recorder-wav-encoder';
// import {socket} from "../socket";

await register(await connect());

export const Room = ({user, roomId}) => {
    const [peers, setPeers] = useState({});
    const peersRef = useRef({});

    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef();
    const audioSocket = useRef();
    const videoSocket = useRef();
    const firstChunk = useRef(null);
    const wav = useRef(new WaveFile());

    const [isCalling, setIsCalling] = useState(false);

    const uint8ArrayToBlob = (uint8Array) => {
        wav.current.fromScratch(1, 16000, '16', uint8Array);

        const wavBuffer = wav.current.toBuffer();

        return new Blob([wavBuffer], {type: 'audio/wav'});
    }

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({video: true, audio: {sampleRate: 16000}})
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
            if (audioSocket.current) {
                console.log('closing socket');
                audioSocket.current.close();
                videoSocket.current.close();
            }
        }
    }, [roomId]);

    const handleAudioMessage = async (message) => {
        const data = new Uint8Array(message.data);
        const userFromLength = data[0];
        const userFrom = new TextDecoder().decode(data.slice(1, 1 + userFromLength));
        const contentStart = 1 + userFromLength;
        const content = data.slice(contentStart);

        // const blob = new Blob([content], {type: 'audio/webm'})
        // const blob = new Blob([...firstChunk.current, content], {type: 'audio/wav'});
        const blob = uint8ArrayToBlob(content);
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        await audio.play();

        // const reader = new FileReader();
        //
        // reader.onload = () => {
        //     audioContext.decodeAudioData(reader.result, (buffer) => {
        //         const source = audioContext.createBufferSource();
        //         source.buffer = buffer;
        //         source.connect(audioContext.destination);
        //         source.start(0);
        //     });
        // };
        //
        // reader.readAsArrayBuffer(blob);
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
                stream: stream
            });

            peer.on('signal', signal => {
                videoSocket.current.send(JSON.stringify({
                    type: 'signal',
                    from: user.username,
                    to: data.from,
                    signal
                }));
            });

            peersRef.current = {...peersRef, [data.from]: peer};
            setPeers(prevPeers => ({...prevPeers, [data.from]: peer}));
        } else if (data.type === 'disconnect-user') {
            peersRef.current[data.from].destroy();
            delete peersRef.current[data.from];
            setPeers(prevPeers => {
                const newPeers = {...prevPeers};
                delete newPeers[data.from];
                return newPeers;
            });
        }
    }

    const createPeer = (userTo, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream
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
        // console.log(event.data);
        if (audioSocket.current && audioSocket.current.readyState === WebSocket.OPEN && event.data.size > 0) {
            if (!firstChunk.current) {
                console.log(1);
                console.log(await event.data.arrayBuffer());
                // console.log(new Uint8Array(event.data));
                firstChunk.current = [event.data.slice(0, 40)];
                const dec = new TextDecoder('utf-8')
                console.log(dec.decode(await event.data.slice(0, 40).arrayBuffer()));
                return;
            }

            audioSocket.current.send(event.data);
        }
    }

    const hancleClick = () => {
        if (!isCalling) {
            setIsCalling(true);
            audioSocket.current = new WebSocket(WEBSOCKET_URL + '/audio/' + roomId.toString() + '/' + localStorage.getItem('token'));
            audioSocket.current.binaryType = 'arraybuffer';

            audioSocket.current.onmessage = handleAudioMessage;

            audioSocket.current.onopen = () => {
                const audioRecorder = new MediaRecorder(new MediaStream([stream.getAudioTracks()[0]]), {mimeType: 'audio/wav'});
                audioRecorder.ondataavailable = onAudioData;
                audioRecorder.start(100);
            };

            videoSocket.current = new WebSocket(WEBSOCKET_URL + '/video/' + roomId.toString() + '/' + localStorage.getItem('token'));
            videoSocket.current.onmessage = handleVideoMessage;

            videoSocket.current.onopen = () => {
                videoSocket.current.send(JSON.stringify({type: 'join'}))
            };
        } else {
            setIsCalling(false);
            audioSocket.current.close();
            videoSocket.current.close();
            Object.entries(peers.current).map((username, peer) => {
                peer.destroy();
            });
        }
    };

    return (
        <div className="full-height border-end" id="call-chat">
            Room {roomId}
            <div>
                <video ref={videoRef} autoPlay muted style={{width: '300px'}}/>
                <canvas ref={canvasRef} width="640" height="480" style={{display: 'none'}}></canvas>
                {Object.entries(peers).map(([username, peer]) => {
                    return <Video key={username} peer={peer}/>
                })}
                {/*{Object.entries(processedImages).map(([user_from, image]) => (*/}
                {/*    <img key={user_from} src={image} alt={`{user_from}'s video`} style={{width: '300px'}}/>*/}
                {/*))}*/}
                {/*{Object.entries(processedAudios).map(([user_from, audio]) => (*/}
                {/*    <audio key={user_from} src={audio} style={{width: '300px'}} autoPlay/>*/}
                {/*))}*/}
                <button onClick={hancleClick}>
                    {isCalling ?
                        'Start Call' :
                        'Leave'
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