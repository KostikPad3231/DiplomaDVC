import {Outlet} from "react-router-dom";
import {MessageContext} from '../MessageContext';
import {useState} from "react";
import {Messages} from "../Messages";
import {Col, Container, Row} from "react-bootstrap";
import {RoomsList} from "./Rooms";
import {Chat} from "../Chat/Chat";
import {Room} from "../Room";

export const Main = (props) => {
    const user = props.user;
    const [messages, setMessages] = useState([]);
    const [roomId, setRoomId] = useState(null);

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

    return (
        <MessageContext.Provider value={{newMessage}}>
            <Container fluid className="full-height">
                <Row className="full-height">
                    <Col xs={1} className="full-height">
                        <RoomsList user={user} setRoomId={setRoomId}/>
                    </Col>
                    {!roomId ? (
                        <Col className="full-height"> Nothing here</Col>
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