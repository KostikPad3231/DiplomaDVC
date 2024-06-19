import {useChat} from "../../hooks/useChat";
import {ChatList} from "./ChatList";
import {ChatForm} from "./ChatForm";

export const Chat = ({user, roomId}) => {
    const {messages, sendMessage, deleteMessage} = useChat({user, roomId});

    return (
        <>
            <ChatList
                roomId={roomId}
                username={user.username}
                messages={messages}
                deleteMessage={deleteMessage}
            />
            <ChatForm
                user={user}
                sendMessage={sendMessage}
            />
        </>
    );
};