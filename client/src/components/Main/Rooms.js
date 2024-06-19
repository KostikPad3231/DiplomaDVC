import {useContext, useEffect, useRef, useState} from 'react';
import {AddCircleOutline, CreateOutline, CloudUploadOutline, PersonCircleOutline} from 'react-ionicons';
import {FaTrashAlt} from 'react-icons/fa';
import {ImExit} from "react-icons/im";

import {MessageContext} from '../MessageContext';
import {createRoom, deleteRoom, getRooms, joinRoom, leaveRoom} from "../../api/requests";
import {CreateRoomModal} from './CreateRoomModal';
import {JoinRoomModal} from './JoinRoomModal';
import {Button, Dropdown, ListGroup} from "react-bootstrap";
import {DeleteAccountModal} from "../DeleteAccountModal";
import {Tooltip} from "@mui/material";

export const RoomsList = ({user, setRoomId, setRoomsList, handleUploadVoice, handleLogout, handleDeleteAccount}) => {
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const fetchIdRef = useRef(0);
    const [contextMenu, setContextMenu] = useState({visible: false, x: 0, y: 0, roomId: null, isDelete: false});

    const {newMessage} = useContext(MessageContext);

    const fetchRooms = async () => {
        const fetchId = ++fetchIdRef.current;
        setLoading(true);
        try {
            const response = await getRooms();
            if (fetchId === fetchIdRef.current) {
                console.log(response.data);
                setRooms(response.data.rooms);
                setRoomsList(response.data.rooms);
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
            await fetchRooms();
        } catch (error) {
            if (error.response.status === 400) {
                throw error;
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
            await fetchRooms();
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

    const handleContextMenu = (event, roomId, isDeleteContextMenu) => {
        const values =
            {
                visible: true,
                x: event.clientX,
                y: event.clientY,
                isDelete: isDeleteContextMenu,
                roomId
            };

        setContextMenu(values);
    };

    const handleDeleteClick = async () => {
        try {
            const response = await deleteRoom(contextMenu.roomId);
            if (response.status === 204) {
                setRoomId(null);
                newMessage('Room was deleted successfully');
            }
            await fetchRooms();
        } catch (error) {
            console.log(error);
            if (error.response.status === 400) {
                newMessage(error.response.detail, 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    };

    const handleLeaveClick = async () => {
        try {
            const response = await leaveRoom(contextMenu.roomId);
            if (response.status === 204) {
                setRoomId(null);
                newMessage('You leaved the room');
            }
            await fetchRooms();
        } catch (error) {
            console.log(error);
            if (error.response.status === 400) {
                newMessage(error.response.detail, 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    }

    const handleClickOutside = () => {
        setContextMenu({visible: false, x: 0, y: 0});
    }

    return (
        <div className="d-flex flex-column full-height align-items-start" style={{width: "100%", overflowY: "auto", scrollbarWidth: "none"}} onClick={handleClickOutside}>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="d-flex flex-column" style={{width: "100%"}}>
                    {rooms === null || rooms === undefined ? (
                        <></>
                    ) : (
                        rooms.map((room) => {
                            const roomName = room.name;
                            const truncatedName = roomName.length > 5 ? roomName.slice(0, 5) + '...' : roomName; // Adjust the length as needed

                            return (
                                <Tooltip key={room.id} title={roomName} style={{width: "100%"}}>
                                    <div
                                        style={{
                                            cursor: 'pointer',
                                            width: "100%",
                                            height: '50px',
                                            borderRadius: '50%',
                                            marginBottom: '5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            backgroundColor: 'darkorange',
                                            color: '#fff',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis'
                                        }}
                                        onClick={() => {
                                            setRoomId(room.id);
                                        }}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            handleContextMenu(event, room.id, room.is_creator);
                                        }}
                                    >
                                        {truncatedName}
                                    </div>
                                </Tooltip>
                            );
                        })
                    )}
                < /div>
            )}

            <div className="mt-auto align-self-center">
                <AddCircleOutline
                    color={'#00000'}
                    title="New"
                    height="50px"
                    width="50px"
                    onClick={handleShowCreate}
                    style={{cursor: 'pointer'}}
                />
            </div>
            <div className="align-self-center">
                <CreateOutline
                    color={'#00000'}
                    title="Join"
                    height="50px"
                    width="50px"
                    onClick={handleShowJoin}
                    style={{cursor: 'pointer'}}
                />
            </div>
            <div className="align-self-center">
                <UploadVoice handleUploadVoice={handleUploadVoice}/>
            </div>
            <div className="align-self-center">
                <Dropdown>
                    <Dropdown.Toggle variant="none" style={{width: '50px'}}>
                        <PersonCircleOutline
                            color={'#00000'}
                            title="Profile"
                        />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={handleLogout}>Log out</Dropdown.Item>
                        <Dropdown.Item onClick={() => {setShowDeleteAccount(true)}}>Delete account</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
            <DeleteAccountModal show={showDeleteAccount} setShow={setShowDeleteAccount} handleDelete={handleDeleteAccount}/>
            <CreateRoomModal show={showCreate} setShow={setShowCreate} handleCreate={handleCreate}/>
            <JoinRoomModal show={showJoin} setShow={setShowJoin} handleJoin={handleJoin}/>

            {contextMenu.visible && (
                <Button variant="danger" onClick={contextMenu.isDelete ? handleDeleteClick : handleLeaveClick}
                        style={{
                            position: 'absolute',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 1000
                        }}
                >
                    {contextMenu.isDelete ? (
                        <FaTrashAlt/>
                    ) : (
                        <ImExit/>
                    )}
                </Button>
            )}
        </div>
    );
};

const UploadVoice = ({handleUploadVoice}) => {
    const fileRef = useRef(null);
    const handleUploadClick = () => {
        if (fileRef.current) {
            fileRef.current.click();
        }
    }
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log(file.type);
            const maxSizeInBytes = 1.5 * 1024 * 1024;
            if (file.size > maxSizeInBytes) {
                alert('Please upload a file smaller than 1.5MB');
                return;
            }
            if (file.type !== 'audio/wav') {
                alert('Please upload a valid file (WAV)');
                return;
            }
            handleUploadVoice(file);
        }
    };
    return (
        <>
            <CloudUploadOutline
                color={'#00000'}
                title="Upload voice"
                height="50px"
                width="50px"
                onClick={handleUploadClick}
                style={{cursor: 'pointer'}}
            />
            <input ref={fileRef} id="uploaded-voice" type="file" accept=".wav" onChange={handleFileChange}
                   style={{display: 'none'}}/>
        </>
    );
};