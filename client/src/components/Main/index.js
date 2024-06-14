import {Outlet} from "react-router-dom";
import {MessageContext} from '../MessageContext';
import {useState} from "react";
import {Messages} from "../Messages";
import {Col, Container, Row} from "react-bootstrap";
import {RoomsList} from "./Rooms";
import {Chat} from "../Chat/Chat";
import {Room} from "../Room";
import {createRoom, uploadVoice} from "../../api/requests";

export const Main = (props) => {
    const user = props.user;
    const [messages, setMessages] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [voiceIsLoading, setVoiceIsLoading] = useState(false);

    const newMessage = (text, variant = 'success') => {
        const message = {
            id: Date.now(),
            variant: variant,
            text: text,
        };

        setMessages([...messages, message]);

        setTimeout(() => {
            setMessages(messages => messages.filter(m => m.id !== message.id));
        }, 5000);
    };

    const handleUploadVoice = async (file) => {
            try {
                setVoiceIsLoading(true);
                const response = await uploadVoice(file);
                setVoiceIsLoading(false);
                if (response.status === 204) {
                    newMessage('File was uploaded successfully');
                }
            } catch (error) {
                if (error.response.status === 400) {
                    newMessage(error.response.detail, 'danger');
                } else {
                    newMessage('Something went wrong', 'danger');
                    console.log(error);
                }
            }
        }
    ;

    return (
        <MessageContext.Provider value={{newMessage}}>
            <Container fluid className="full-height">
                <Row className="full-height">
                    <Col xs={1} className="full-height">
                        <RoomsList user={user} setRoomId={setRoomId}/>
                    </Col>
                    {!roomId ? (
                        <Col className="full-height">
                            {/*<Row>*/}
                            {/*    {voiceIsLoading ? (*/}
                            {/*        <p>Loading...</p>*/}
                            {/*    ) : (*/}
                            {/*        <UploadVoice handleUploadVoice={handleUploadVoice}/>*/}
                            {/*    )}*/}
                            {/*</Row>*/}
                            <Row>
                                Nothing here
                            </Row>
                        </Col>
                    ) : (
                        <>
                            <Col className="full-height">
                                <Room
                                    user={user}
                                    roomId={roomId}
                                />
                            </Col>
                            <Col xs={4} className="full-height d-flex flex-column">
                                <Chat
                                    user={user}
                                    roomId={roomId}
                                />
                            </Col>
                        </>
                    )}
                </Row>
                <Outlet/>
                <Messages messages={messages}/>
            </Container>
        </MessageContext.Provider>
    );
};

const UploadVoice = ({handleUploadVoice}) => {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log(file.type);
            if (file.type.includes('wav')) {
                console.log(1);
                handleUploadVoice(file);
            } else {
                alert('Please upload a valid file (WAV)');
            }
        }
    };
    return (
        <input id="uploaded-voice" type="file" accept=".wav" onChange={handleFileChange}/>
    );
};