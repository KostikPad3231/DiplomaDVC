import {getActivityParticipants, getRoomLeaderboard, vote} from "../api/requests";
import React, {useContext, useEffect, useState} from "react";
import {Button, Col, Form, Modal, Row, Table} from "react-bootstrap";
import {MessageContext} from "./MessageContext";

export const LeaderboardModal = ({show, setShow, leaderboard, lastWinner}) => {
    const handleClose = () => {
        setShow(false);
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Leaderboard</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <h3>Last winner: {lastWinner[0]}. Score: {lastWinner[1]}</h3>
                <Table striped bordered hover variant="dark">
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>Username</th>
                        <th>Victories</th>
                    </tr>
                    </thead>
                    <tbody>
                    {leaderboard.map((user, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{user[0]}</td>
                            <td>{user[1]}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </Modal.Body>
        </Modal>
    );
};