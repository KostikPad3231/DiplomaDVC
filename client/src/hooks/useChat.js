import io from "socket.io-client";
import {useEffect, useRef, useState} from "react";
import {BACKEND_URL} from "../constants";

export const useChat = ({user, roomId}) => {
    const [messages, setMessages] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(BACKEND_URL, {
            path: '/socket.io',
            query: {roomId},
        });

        socketRef.current.emit('messages:get', {
            room_id: roomId
        });

        socketRef.current.on('messages', ({messages}) => {
            console.log('got messages');
            console.log(messages);
            const newMessages = messages.messages.map((message) =>
                message.sender_username === user.username ? {...message, isCurrentUser: true} : message
            );
            console.log(newMessages);
            setMessages(newMessages);
        });

        return () => {
            socketRef.current.disconnect({query: {roomId}});
        }
    }, [user, roomId]);

    const sendMessage = (username, text) => {
        socketRef.current.emit('message:send', {text, 'sender_username': username, 'room_id': roomId});
    };

    const deleteMessage = (username, id, roomId) => {
        socketRef.current.emit('message:delete', {'message_id': id, 'room_id': roomId, username});
    };

    return {messages, sendMessage, deleteMessage}
}