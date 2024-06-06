import {useEffect, useRef} from "react";
import {ListGroup} from "react-bootstrap";
import {ChatListMessage} from "./ChatListMessage";

export const ChatList = ({messages, deleteMessage}) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        })
    }, [messages]);

    return (
        <ListGroup variant="flush" id="chat-list">
            {messages.map((message) => (
                <ChatListMessage
                    key={message.messageId}
                    message={message}
                    deleteMessage={deleteMessage}
                />
            ))}
            <span ref={messagesEndRef}></span>
        </ListGroup>
    );
}