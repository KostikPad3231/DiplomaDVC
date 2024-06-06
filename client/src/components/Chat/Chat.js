import {useChat} from "../../hooks/useChat";
import {ChatList} from "./ChatList";
import {ChatForm} from "./ChatForm";

export const Chat = ({user, roomId}) => {
    const {messages, sendMessage, deleteMessage} = useChat({user, roomId});

    return (
        <>
            <ChatList
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