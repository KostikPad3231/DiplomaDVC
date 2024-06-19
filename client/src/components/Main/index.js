import {Outlet, useNavigate} from "react-router-dom";
import {MessageContext} from '../MessageContext';
import {useState} from "react";
import {Messages} from "../Messages";
import {Col, Container, Row} from "react-bootstrap";
import {RoomsList} from "./Rooms";
import {Chat} from "../Chat/Chat";
import {Room} from "../Room";
import {createRoom, deleteAccount, getRooms, uploadVoice} from "../../api/requests";
import {SIGN_IN} from "../../constants/routes";

export const Main = (props) => {
    const user = props.user;
    const [messages, setMessages] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [rooms, setRooms] = useState([]);
    const navigate = useNavigate();

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
            const response = await uploadVoice(file);
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
    };

    const fetchRooms = async () => {
        try {
            const response = await getRooms();
            setRooms(response.data.rooms);
        } catch (error) {
            console.log(error);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount();
            localStorage.removeItem('token');
            navigate(SIGN_IN);
        } catch (error) {
            console.log(error);
        }

    };

    const handleLogout = async () => {
        try {
            localStorage.removeItem('token');
            navigate(SIGN_IN);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <MessageContext.Provider value={{newMessage}}>
            <Container fluid className="full-height">
                <Row className="full-height">
                    <Col xs={1} className="full-height border-end">
                        <RoomsList user={user} setRoomId={setRoomId} setRoomsList={setRooms}
                                   handleUploadVoice={handleUploadVoice}
                                   handleLogout={handleLogout}
                                   handleDeleteAccount={handleDeleteAccount}/>
                    </Col>
                    {!roomId ? (
                        <Col className="full-height">
                            Nothing here
                        </Col>
                    ) : (
                        <>
                            <Col className="full-height">
                                <Room
                                    key={roomId}
                                    user={user}
                                    room={rooms.find(room => room.id === roomId)}
                                    fetchRooms={fetchRooms}
                                />
                            </Col>
                            <Col xs={3} className="full-height d-flex flex-column border-start">
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