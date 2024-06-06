import React, {useState} from 'react';
import {Button, Form, Modal} from 'react-bootstrap';
import {Formik} from 'formik';
import * as Yup from 'yup';


const RoomCreateSchema = Yup.object({
    name: Yup.string()
        .required('Required'),
    password: Yup.string()
        .required('Required'),
});


export const JoinRoomModal = ({show, setShow, handleJoin}) => {
    const [errors, setErrors] = useState({});
    const handleClose = () => {
        setShow(false);
        setErrors({});
    };
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Create room</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {errors.detail && (
                    <p className="text-danger m-0 text-center" style={{backgroundColor: 'rgba(222, 222, 222, .5)'}}>{errors.detail}</p>
                )}
                <Formik
                    initialValues={{
                        name: '',
                        password: ''
                    }}
                    validationSchema={RoomCreateSchema}
                    onSubmit={async (values, actions) => {
                        try {
                            await handleJoin(values);
                            handleClose();
                        } catch (error) {
                            const errors = {};
                            console.log(error);
                            const errorData = error.response.data;
                            for (const key in errorData) {
                                const element = errorData[key];
                                errors[key] = element.toString();
                            }
                            setErrors(errors);
                        }
                    }}
                >
                    {formik => (
                        <Form noValidate onSubmit={formik.handleSubmit}>
                            <Form.Group className="mb-3" controlId="name">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    name="name"
                                    type="text"
                                    placeholder="Name"
                                    {...formik.getFieldProps('name')}
                                />
                                {(formik.touched.name && formik.errors.name) || errors.name ? (
                                    <>
                                        <Form.Text className="text-muted">
                                            {formik.errors.name}
                                        </Form.Text>
                                        <Form.Text className="text-danger">
                                            {errors.name}
                                        </Form.Text>
                                    </>
                                ) : null}
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    name="password"
                                    type="text"
                                    placeholder="Password"
                                    {...formik.getFieldProps('password')}
                                />
                                {(formik.touched.password && formik.errors.password) || errors.description ? (
                                    <>
                                        <Form.Text className="text-muted">
                                            {formik.errors.password}
                                        </Form.Text>
                                        <Form.Text className="text-danger">
                                            {errors.password}
                                        </Form.Text>
                                    </>
                                ) : null}
                            </Form.Group>

                            <Button variant="primary" type="submit">
                                Join
                            </Button>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    )
};