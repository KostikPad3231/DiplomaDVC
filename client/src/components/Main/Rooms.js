import {useContext, useEffect, useRef, useState} from 'react';
import {AddCircleOutline, CreateOutline} from 'react-ionicons';
import {FaTrashAlt} from 'react-icons/fa';

import {MessageContext} from '../MessageContext';
import {createRoom, getRooms, joinRoom} from "../../api/requests";
import {CreateRoomModal} from './CreateRoomModal';
import {JoinRoomModal} from './JoinRoomModal';
import {Button} from "react-bootstrap";

export const RoomsList = (props) => {
    const user = props.user;
    const setRoomId = props.setRoomId;
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const fetchIdRef = useRef(0);
    const [contextMenu, setContextMenu] = useState({visible: false, x: 0, y: 0, roomId: null});

    const {newMessage} = useContext(MessageContext);

    const fetchRooms = async () => {
        const fetchId = ++fetchIdRef.current;
        setLoading(true);
        try {
            const response = await getRooms();
            if (fetchId === fetchIdRef.current) {
                console.log(response.data);
                setRooms(response.data.rooms);
            }
            setLoading(false);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleCreate = async (values) => {
        try {
            console.log(values);
            const response = await createRoom(values);
            if (response.status === 201) {
                newMessage('Room was created successfully');
            }
            fetchRooms();
        } catch (error) {
            if (error.response.status === 400) {
                newMessage(error.response.data.name[0], 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    };

    const handleJoin = async (values) => {
        try {
            const response = await joinRoom(values);
            if (response.status === 204) {
                console.log(values);
                newMessage('You joined the room');
            }
            fetchRooms();
        } catch (error) {
            console.log(error);
            if (error.response.status === 400) {
                throw error;
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    };

    const handleShowCreate = () => {
        setShowCreate(true);
    };

    const handleShowJoin = () => {
        setShowJoin(true);
    };

    const handleContextMenu = (event, roomId) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            roomId
        });
    };

    const handleTrashClick = () => {
        console.log(contextMenu.roomId);
    };

    const handleClickOutside = () => {
        setContextMenu({visible: false, x: 0, y: 0});
    }

    return (
        <div className="d-flex flex-column full-height border-end" onClick={handleClickOutside}>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="d-flex flex-column">
                    {rooms === null || rooms === undefined ? (
                        <></>
                    ) : (
                        rooms.map((room) => {
                            return (
                                <div key={room.id} style={{cursor: 'pointer'}} onClick={() => {
                                    setRoomId(room.id);
                                }} onContextMenu={(event) => {
                                    handleContextMenu(event, room.id);
                                }}>
                                    {room.name}
                                </div>
                            )
                        })
                    )}
                < /div>
            )}

            <div className="mt-auto">
                <AddCircleOutline
                    color={'#00000'}
                    title="New"
                    height="50px"
                    width="50px"
                    onClick={handleShowCreate}
                    style={{cursor: 'pointer'}}
                />
            </div>
            <div>
                <CreateOutline
                    color={'#00000'}
                    height="50px"
                    width="50px"
                    onClick={handleShowJoin}
                    style={{cursor: 'pointer'}}
                />
            </div>
            <CreateRoomModal show={showCreate} setShow={setShowCreate} handleCreate={handleCreate}/>
            <JoinRoomModal show={showJoin} setShow={setShowJoin} handleJoin={handleJoin}/>

            {contextMenu.visible && (
                <Button variant="danger" onClick={handleTrashClick}
                        style={{
                            position: 'absolute',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 1000
                        }}
                >
                    <FaTrashAlt/>
                </Button>
            )}
        </div>
    );
};