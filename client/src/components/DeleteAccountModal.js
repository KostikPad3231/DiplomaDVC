import {Button, Modal} from "react-bootstrap";

export const DeleteAccountModal = ({show, setShow, handleDelete}) => {
    const handleClose = () => setShow(false);
    const handleDeleteAccount = () => {
        handleClose();
        handleDelete();
    };
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Confirm account deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Are you sure you want to delete your account?
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="danger" onClick={handleDeleteAccount}>
                    Delete
                </Button>
            </Modal.Footer>
        </Modal>
    );
}