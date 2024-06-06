import {Button, Card, ListGroup} from "react-bootstrap";
import {TrashBinOutline} from "react-ionicons";
import moment from "moment";

export const ChatListMessage = ({user, message, deleteMessage}) => {
    const handleDeleteMessage = (id) => {
        deleteMessage(id);
    }

    const {id, text, sender_username, sent_at, isCurrentUser} = message;

    return (
        <ListGroup.Item className={`p-0 d-flex ${isCurrentUser ? 'justify-content-end' : ''}`}>
            <Card
                bg={`${isCurrentUser ? 'primary' : 'secondary'}`}
                text='light'
                style={{width: '90%'}}
            >
                <Card.Header className='d-flex justify-content-between align-items-center py-0'>
                    <Card.Text className='small'>{sender_username}</Card.Text>
                    <Card.Text className='small'>{moment(sent_at).fromNow()}</Card.Text>
                </Card.Header>
                <Card.Body className='d-flex justify-content-between align-items-center py-0'>
                    <Card.Text style={{minWidth: '0'}}>{text}</Card.Text>
                    {isCurrentUser && (
                        <Button
                            variant='none'
                            className='text-warning'
                            onClick={() => handleDeleteMessage(id)}
                        >
                            <TrashBinOutline
                                color={'#00000'}
                                height="20px"
                                width="20px"
                            />
                        </Button>
                    )}
                </Card.Body>
            </Card>
        </ListGroup.Item>
    );
}