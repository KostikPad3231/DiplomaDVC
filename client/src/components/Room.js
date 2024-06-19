import {useContext, useEffect, useRef, useState} from 'react';
import Peer from 'simple-peer';

import {WEBSOCKET_URL} from "../constants";

import {FaMicrophoneAlt, FaVideo, FaMicrophoneAltSlash, FaVideoSlash} from "react-icons/fa";
import {LuVote} from "react-icons/lu";
import {MdLeaderboard} from "react-icons/md";
import {Button, Row} from "react-bootstrap";

import "../api/requests";
import {
    changeVoice as changeVoiceRequest,
    getRoomLeaderboard,
    getVoices,
    joinActivity,
    leaveActivity
} from "../api/requests";
import {MessageContext} from "./MessageContext";
import {FormControl, InputLabel, MenuItem, Select, Switch, Tooltip} from "@mui/material";
import {VotingModal} from "./VotingModal";
import {LeaderboardModal} from "./LeaderboardModal";

// import {socket} from "../socket";


export const Room = ({user, room, fetchRooms}) => {
    console.log(room);
    const roomId = room.id;
    const activityId = room.activity_id;
    const droppedVoiceUsername = room.dropped_voice_username;
    const [isParticipating, setIsParticipating] = useState(room.is_participating);
    const [refusedParticipation, setRefusedParticipation] = useState(room.refused_participation);
    const [peers, setPeers] = useState({});
    const peersRef = useRef({});

    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const audioSocket = useRef(null);
    const videoSocket = useRef(null);

    const [isCalling, setIsCalling] = useState(false);
    const [playVideo, setPlayVideo] = useState(true);
    const [changeVoice, setChangeVoice] = useState(!refusedParticipation && droppedVoiceUsername);
    const [userVoiceName, setUserVoiceName] = useState(!refusedParticipation && droppedVoiceUsername ? droppedVoiceUsername : '');
    const [playAudio, setPlayAudio] = useState(true);
    const playAudioRef = useRef(true);
    const [voices, setVoices] = useState([]);

    const [canVote, setCanVote] = useState(room.can_vote);
    const [showVote, setShowVote] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [lastWinner, setLastWinner] = useState({});

    const audioContextRef = useRef();
    const mediaStreamSourceRef = useRef();
    const audioProcessorRef = useRef();

    const {newMessage} = useContext(MessageContext);

    const fetchLeaderboard = async () => {
        try {
            const response = await getRoomLeaderboard(roomId);
            setLeaderboard(response.data.leaderboard);
            setLastWinner(response.data.last_winner)
        } catch (error) {
            console.log(error);
        }
    };

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
        const fetchVoices = async () => {
            try {
                const response = await getVoices(roomId);
                setVoices(response.data ? response.data : []);
                console.log(voices);
            } catch (error) {
                console.log(error);
            }
        }
        fetchVoices();
        setIsParticipating(room.is_participating);
        setRefusedParticipation(room.refused_participation);
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

            peer.on('error', error => {
                console.log(error);
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

        peer.on('error', error => {
            console.log(error);
        });

        return peer;
    };

    const onAudioData = async (event) => {
        console.log(playAudioRef.current);
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
            videoSocket.current = new WebSocket(WEBSOCKET_URL + '/video/' + roomId.toString() + '/' + localStorage.getItem('token'));
            videoSocket.current.onmessage = handleVideoMessage;

            videoSocket.current.onopen = () => {
                videoSocket.current.send(JSON.stringify({type: 'join'}));
            };


            audioSocket.current = new WebSocket(WEBSOCKET_URL + '/audio/' + roomId.toString() + '/' + localStorage.getItem('token') + `?user_to=${userVoiceName}`);
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
            setIsCalling(true);
        } else {
            leaveCall();
            setIsCalling(false);
        }
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
        playAudioRef.current = !playAudioRef.current;
        setPlayAudio(!playAudio);
    };

    const handleJoinActivity = async () => {
        try {
            const result = await joinActivity({activity_id: activityId, room_id: roomId});
            const data = result.data;
            setCanVote(true);
            setUserVoiceName(data.dropped_voice_username);
            setIsParticipating(data.is_participating);
            setRefusedParticipation(data.refused_participation);
            setVoices(data.voices);
            await fetchRooms();
        } catch (error) {
            if (error.response.status === 400) {
                newMessage(error.response.detail, 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    }

    const handleLeaveActivity = async () => {
        try {
            await leaveActivity({activity_id: activityId});
            setRefusedParticipation(true);
            await fetchRooms();
        } catch (error) {
            if (error.response.status === 400) {
                newMessage(error.response.detail, 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    };

    const handleChangeVoice = async () => {
        if (!changeVoice) {
            try {
                await changeVoiceRequest(roomId, userVoiceName);
            } catch (error) {
                newMessage('Something went wrong', 'danger');
                console.log(error);
            }
        } else {
            try {
                await changeVoiceRequest(roomId, '');
            } catch (error) {
                newMessage('Something went wrong', 'danger');
                console.log(error);
            }
        }
        setChangeVoice(!changeVoice);
    };

    const handleChangeVoiceName = (event) => {
        setUserVoiceName(event.target.value);
    };

    return (
        <>
            <div className="full-height" id="call-chat">
                <div className="d-flex">
                    {isParticipating && !refusedParticipation ? (
                        <div className="d-flex align-items-center me-auto">
                            <span>Now you <strong>{droppedVoiceUsername ? droppedVoiceUsername : userVoiceName}</strong></span>
                            {canVote ? (
                                <>
                                    <Tooltip
                                        className="d-flex align-items-center"
                                        title="Vote">
                                        <div onClick={() => {
                                            setShowVote(true)
                                        }} style={{fontSize: '22pt', cursor: 'pointer'}}>
                                            <LuVote/>
                                        </div>
                                    </Tooltip>
                                    <Button variant="danger" onClick={handleLeaveActivity}>
                                        Refuse participation
                                    </Button>
                                </>
                            ) : (
                                <Tooltip
                                    title="You have already voted"
                                    placement="left">
                                    <span style={{fontSize: '22pt'}}>
                                        <LuVote/>
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                    ) : !refusedParticipation && voices.length > 0 ? (
                        <Button className="me-auto" variant="success" onClick={handleJoinActivity}>
                            Join activity
                        </Button>
                    ) : !refusedParticipation ? (
                        <span className="me-auto">Wait for someone with an uploaded voice to join the room or upload a voice yourself</span>
                    ) : (
                        <span className="me-auto">You refused participation</span>
                    )}
                    <Button variant={isCalling ? "danger" : "info"} onClick={handleCallClick}>
                        {isCalling ?
                            'Leave' :
                            'Start Call'
                        }
                    </Button>
                    <div className="d-flex align-items-center ms-1" onClick={async () => {
                        await fetchLeaderboard();
                        setShowLeaderboard(true);
                    }}>
                        <MdLeaderboard style={{fontSize: '22pt', cursor: 'pointer'}}/>
                    </div>
                </div>
                <div className="d-flex justify-content-center">
                    <div className="my-video-container mx-2" style={{width: '300px', height: '225px'}}>
                        <div className="border rounded">
                            <div style={{visibility: playVideo ? 'visible' : 'hidden', height: '225px'}}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    style={{width: '300px'}}
                                    className="border rounded"
                                />
                            </div>
                        </div>
                        <div className="d-flex justify-content-center meet-icon-container">
                            <div className="align-top">
                                {voices.length > 0 ? (
                                    <>
                                        <Tooltip
                                            title={isParticipating && !refusedParticipation ? "You can't change voice while you participate in activity" : "Change voice"}
                                            placement="left">
                                        <span>
                                            {refusedParticipation || !isParticipating ? (
                                                <Switch
                                                    color="warning"
                                                    onChange={handleChangeVoice}
                                                    disabled={userVoiceName === '' || (isParticipating && !refusedParticipation)}
                                                />
                                            ) : (
                                                <Switch
                                                    color="warning"
                                                    onChange={handleChangeVoice}
                                                    disabled={userVoiceName === '' || (isParticipating && !refusedParticipation)}
                                                    checked={isParticipating && !refusedParticipation}
                                                />
                                            )}

                                        </span>
                                        </Tooltip>

                                        <FormControl style={{width: '100px'}} size="small" required>
                                            <InputLabel id="voice-label">Voice</InputLabel>
                                            <Select
                                                labelId="voice-labe"
                                                id="select-voice"
                                                value={userVoiceName}
                                                onChange={handleChangeVoiceName}
                                                disabled={changeVoice}
                                            >
                                                {voices.map((voiceUsername) => (
                                                    <MenuItem
                                                        key={voiceUsername}
                                                        value={voiceUsername}>
                                                        {voiceUsername}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </>
                                ) : (
                                    <Tooltip title="Somebody in this room should upload voice">
                                    <span>
                                    <Switch
                                        color="warning"
                                        onChange={handleChangeVoice}
                                        disabled
                                    />
                                        </span>
                                    </Tooltip>
                                )}
                            </div>
                            <div onClick={onPlayAudioClick}
                                 className={`align-self-center chat-control ${playAudio ? "" : "chat-control-offed"}`}>
                                {playAudio ?
                                    <FaMicrophoneAlt/> :
                                    <FaMicrophoneAltSlash/>
                                }
                            </div>
                            <div onClick={onPlayVideoClick}
                                 className={`align-self-center chat-control ${playVideo ? "" : "chat-control-offed"}`}>
                                {playVideo ?
                                    <FaVideo/> :
                                    <FaVideoSlash/>
                                }
                            </div>
                        </div>
                    </div>
                    {Object.entries(peers).map(([username, peer]) => (
                        <Video key={username} peer={peer}/>
                    ))}
                </div>
            </div>
            <VotingModal show={showVote} setShow={setShowVote} activityId={activityId} userId={user.id}
                         voices={voices} setCanVote={setCanVote}/>
            <LeaderboardModal show={showLeaderboard} setShow={setShowLeaderboard} roomId={roomId}
                              leaderboard={leaderboard} lastWinner={lastWinner}/>
        </>
    )
        ;
};

const Video = ({peer}) => {
    const streamRef = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            streamRef.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <video ref={streamRef} autoPlay style={{width: '300px'}} className="border rounded mx-2"/>
    );
}