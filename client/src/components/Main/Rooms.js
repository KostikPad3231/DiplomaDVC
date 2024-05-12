import {useContext, useEffect, useRef, useState} from "react";
import {AddCircleOutline} from 'react-ionicons';

import {MessageContext} from '../MessageContext';
import {createRoom, getRooms} from "../../api/requests";
import {CreateRoomModal} from "./CreateRoomModal";

export const RoomsList = (props) => {
    const user = props.user;
    const setRoomId = props.setRoomId;
    const [showCreate, setShowCreate] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const fetchIdRef = useRef(0);

    const {newMessage} = useContext(MessageContext);

    const fetchRooms = async () => {
        const fetchId = ++fetchIdRef.current;
        setLoading(true);
        try {
            const response = await getRooms(user);
            if (fetchId === fetchIdRef.current) {
                console.log(response.data);
                setRooms(response.data.results);
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
            const response = await createRoom(values);
            if (response.status === 201) {
                newMessage('Board was created successfully');
            }
            getRooms(user);
        } catch (error) {
            if (error.response.status === 400) {
                newMessage(error.response.data.name[0], 'danger');
            } else {
                newMessage('Something went wrong', 'danger');
            }
        }
    };

    const handleShowCreate = () => {
        setShowCreate(true);
    }

    return (
        <div className="d-flex flex-column justify-content-between">
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="d-flex flex-column">
                    {rooms.map((room) => {
                        return (
                            <div key={room.id} style={{cursor: 'pointer'}} onClick={() => {
                                setRoomId(room.id);
                            }}>
                                room.name
                            </div>
                        )
                    })}
                </div>
            )}

            <div>
                <AddCircleOutline
                    color={'#00000'}
                    title="New"
                    height="50px"
                    width="50px"
                    onClick={handleShowCreate}
                    style={{cursor: 'pointer'}}
                />
            </div>
            <CreateRoomModal show={showCreate} setShow={setShowCreate} handleCreate={handleCreate}/>
        </div>
    );
};