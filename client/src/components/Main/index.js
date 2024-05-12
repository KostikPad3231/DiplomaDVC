import {Outlet} from "react-router-dom";
import {MessageContext} from '../MessageContext';
import {useState} from "react";
import {Messages} from "../Messages";
import {Col} from "react-bootstrap";
import {RoomsList} from "./Rooms";

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
            <Col xs={2} className="border-end-2">
                <RoomsList user={user} setRoomId={setRoomId}/>
            </Col>
            {roomId === null ? (
                <></>
            ) : (
                <>
                    <Col xs={7}>
                        <div>Room {roomId}</div>
                    </Col>
                    <Col>
                        Chat
                    </Col>
                </>
            )}
            <Outlet/>
            <Messages messages={messages}/>
        </MessageContext.Provider>
    );
};