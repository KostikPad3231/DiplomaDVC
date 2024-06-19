import {getActivityParticipants, vote} from "../api/requests";
import React, {useContext, useEffect, useState} from "react";
import {Button, Col, Form, Modal, Row} from "react-bootstrap";
import {MessageContext} from "./MessageContext";

export const VotingModal = ({show, setShow, activityId, userId, voices, setCanVote}) => {
    const [participants, setParticipants] = useState([]);
    const [matches, setMatches] = useState(
        participants.reduce((acc, name) => ({...acc, [name]: ''}), {})
    );
    const {newMessage} = useContext(MessageContext);

    const fetchParticipatedUsers = async () => {
        try {
            const response = await getActivityParticipants(activityId);
            setParticipants(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchParticipatedUsers();
    }, []);

    const handleSelectChange = (name, value) => {
        setMatches(prevMatches => ({
            ...prevMatches,
            [name]: value,
        }));
    };

    const handleClose = () => {
        setShow(false);
    };

    const handleVote = async () => {
        console.log(matches);
        console.log('vote');
        try {
            const response = await vote(activityId, matches);
            console.log(response.data);
            newMessage(`Your result: ${response.data.right_answers_number}`);
            handleClose();
            setCanVote(false);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Vote</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {participants.length === 0 ? (
                    <span> You can't vote while you are only one participant in the activity</span>
                ) : (
                    <Form>
                        <Row className="mb-3">
                            <Col><h5>Participants</h5></Col>
                            <Col xs={7}><h5>Voices</h5></Col>
                        </Row>
                        {participants.map((participantName) => (
                            <Row className="mb-3" key={participantName}>
                                <Col>
                                    <Form.Group controlId={`item-${participantName}`}>
                                        <Form.Label>{participantName}</Form.Label>
                                    </Form.Group>
                                </Col>
                                <Col xs={7}>
                                    <Form.Group controlId={`select-${participantName}`}>
                                        <Form.Control
                                            as="select"
                                            value={matches[participantName] || ''}
                                            onChange={(e) => handleSelectChange(participantName, e.target.value)}
                                        >
                                            <option value="">Select an option</option>
                                            {voices.map((voiceName) => (
                                                <option key={voiceName} value={voiceName}>
                                                    {voiceName}
                                                </option>
                                            ))}
                                        </Form.Control>
                                    </Form.Group>
                                </Col>
                            </Row>
                        ))}
                        <Button type="button" variant="primary" onClick={handleVote}>Submit</Button>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};