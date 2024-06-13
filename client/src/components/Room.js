import {useEffect, useRef, useState} from 'react';
import {WEBSOCKET_URL} from "../constants";

export const Room = ({user, roomId}) => {
    const [peers, setPeers] = useState([]);

    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef();
    const [processedImages, setProcessedImages] = useState({});
    const [processedAudios, setProcessedAudios] = useState({});
    const audioSocket = useRef();
    const videoSocket = useRef();
    const firstChunk = useRef(null);

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
            if (audioSocket.current) {
                console.log('closing socket');
                audioSocket.current.close();
            }
            setProcessedImages({});
        }
    }, [roomId]);

    const sendCombinedData = (header, content) => {
        const headerBuffer = new TextEncoder().encode(header);
        const headerLength = new Uint8Array([headerBuffer.length]);
        const reader = new FileReader();
        reader.onloadend = () => {
            const frameBuffer = new Uint8Array(reader.result);

            const combinedBuffer = new Uint8Array(headerLength.length + headerBuffer.length + frameBuffer.length);
            combinedBuffer.set(headerLength, 0);
            combinedBuffer.set(headerBuffer, headerLength.length);
            combinedBuffer.set(frameBuffer, headerLength.length + headerBuffer.length);

            audioSocket.current.send(combinedBuffer.buffer);
        };
        reader.readAsArrayBuffer(content);
    }

    const handleMessage = async (message) => {
        const data = new Uint8Array(message.data);
        const userFromLength = data[0];
        const userFrom = new TextDecoder().decode(data.slice(1, 1 + userFromLength));
        const headerStart = 1 + userFromLength;
        const headerLength = data[headerStart];
        const header = new TextDecoder().decode(data.slice(headerStart + 1, headerStart + 1 + headerLength));
        const contentStart = 1 + userFromLength;
        const content = data.slice(contentStart);

        if (header === '0') {
            const blob = new Blob([content], {type: 'image/jpeg'});
            const image = new Image();
            image.src = window.URL.createObjectURL(blob);
            image.onload = () => {
                setProcessedImages(images => (
                    {...images, [userFrom]: image.src}
                ));
            };
        } else if (header === '1') {
            // const blob = new Blob([content], {type: 'audio/webm'})
            // const audio = new Audio();
            // audio.src = window.URL.createObjectURL(blob);
            // audio.onload = () => {
            //     console.log('success');
            //     setProcessedAudios(audios => (
            //         {...audios, [userFrom]: audio.src}
            //     ));
            // }
            const blob = new Blob([...firstChunk.current, content], {type: 'audio/webm'})
            const audioUrl = window.URL.createObjectURL(blob);
            const audio = new Audio();
            audio.src = audioUrl;
            audio.addEventListener('canplaythrough', () => {
                console.log('success');
                audio.play();
            });
        }
    }

    const sendFrame = () => {
        const context = canvasRef.current.getContext('2d');
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasRef.current.toBlob(blob => {
            if (blob) {
                sendCombinedData('0', blob);
            }
        }, 'image/jpeg');
    };

    const onAudioData = async (event) => {
        // console.log(event.data.size);
        if (audioSocket.current && audioSocket.current.readyState === WebSocket.OPEN && event.data.size > 0) {
            // // console.log('got audio');
            // // console.log(event.data);
            // let blob;
            if (!firstChunk.current) {
                firstChunk.current = [event.data];
            }
            //     blob = new Blob([event.data], {type: 'audio/webm'})
            // }
            // else{
            //     blob = new Blob([...firstChunk.current, event.data], {type: 'audio/webm'})
            // }
            // // console.log(blob);
            // const audioUrl = window.URL.createObjectURL(blob);
            // const audio = new Audio();
            // audio.src = audioUrl;
            // audio.addEventListener('canplaythrough', () => {
            //     console.log('success');
            //     audio.play();
            //     // setProcessedAudios(audios => (
            //     //     { ...audios, kostya: audioUrl }
            //     // ));
            //     // window.URL.revokeObjectURL(audioUrl); // Clean up the object URL
            // });
            sendCombinedData('1', event.data);
        }
    }

    const startCall = () => {
        audioSocket.current = new WebSocket(WEBSOCKET_URL + '/audio/' + roomId.toString() + '/' + localStorage.getItem('token'));
        videoSocket.current = new WebSocket(WEBSOCKET_URL + '/video/' + roomId.toString() + '/' + localStorage.getItem('token'));
        audioSocket.current.binaryType = 'arraybuffer';

        audioSocket.current.onmessage = handleMessage;

        audioSocket.current.onopen = () => {
            const intervalId = setInterval(sendFrame, 100);
            audioSocket.current.onclose = () => clearInterval(intervalId);

            const audioRecorder = new MediaRecorder(new MediaStream([stream.getAudioTracks()[0]]), {mimeType: 'audio/webm'});
            audioRecorder.ondataavailable = onAudioData;
            audioRecorder.start(100);
        };
    };

    return (
        <div className="full-height border-end" id="call-chat">
            Room {roomId}
            <div>
                <video ref={videoRef} autoPlay muted style={{width: '300px'}}/>
                <canvas ref={canvasRef} width="640" height="480" style={{display: 'none'}}></canvas>
                {Object.entries(processedImages).map(([user_from, image]) => (
                    <img key={user_from} src={image} alt={`{user_from}'s video`} style={{width: '300px'}}/>
                ))}
                {Object.entries(processedAudios).map(([user_from, audio]) => (
                    <audio key={user_from} src={audio} style={{width: '300px'}} autoPlay/>
                ))}
                <button onClick={startCall}>Start Call</button>
            </div>
        </div>
    );
};
