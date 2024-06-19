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


export const CreateRoomModal = ({show, setShow, handleCreate}) => {
    const [errors, setErrors] = useState({});
    const handleClose = () => {
        setShow(false);
        setErrors({});
    }
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Create room</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Formik
                    initialValues={{
                        name: '',
                        password: ''
                    }}
                    validationSchema={RoomCreateSchema}
                    onSubmit={async (values, actions) => {
                        try {
                            await handleCreate(values);
                            handleClose();
                        } catch (error) {
                            console.log(error);
                            const errors = {};
                            const errorData = error.response.data.detail;
                            console.log(errorData);
                            for (const key in errorData) {
                                const element = errorData[key];
                                console.log(element);
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
                                {(formik.touched.password && formik.errors.password) || errors.password ? (
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
                                Create
                            </Button>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    )
};