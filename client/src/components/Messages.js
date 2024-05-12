import React from 'react';
import {Alert} from 'react-bootstrap'

export const Messages = ({messages}) => {
    let sortedMessages = [...messages];
    sortedMessages.sort((a, b) => {
        return b.id - a.id;
    });
    return (
        <div className="position-fixed top-0 end-0">
            {sortedMessages.map(message => (
                <Alert variant={message.variant} key={message.id} dismissible>
                    <p className="m-0 p-0">{message.text}</p>
                </Alert>
            ))}
        </div>
    );
};