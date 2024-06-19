import {useEffect, useRef, useState} from "react";
import {ListGroup} from "react-bootstrap";
import {ChatListMessage} from "./ChatListMessage";

export const ChatList = ({username, roomId, messages, deleteMessage}) => {
    const messagesEndRef = useRef(null);

    console.log(messages);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        })
    }, [messages]);

    return (
        <ListGroup variant="flush" id="chat-list">
            {messages.map((message) => (
                <ChatListMessage
                    key={message.id}
                    message={message}
                    deleteMessage={async () => await deleteMessage(username, message.id, roomId)}
                />
            ))}
            <span ref={messagesEndRef}></span>
        </ListGroup>
    );
}