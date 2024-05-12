import React, {useState} from 'react';
import {Formik} from 'formik';
import {Form, Card, Button} from 'react-bootstrap';
import * as Yup from 'yup';
import {signUp} from '../api/requests';
import {Link, useNavigate} from 'react-router-dom';

import * as path from '../constants/routes';
import {MIN_PASSWORD_LENGTH} from '../constants';

const RegisterSchema = Yup.object({
    username: Yup.string()
        .required('Required'),
    password1: Yup.string()
        .min(
            MIN_PASSWORD_LENGTH,
            `Password has to be no more than ${MIN_PASSWORD_LENGTH} characters`
        )
        .required('Required'),
    password2: Yup.string()
        .required('Required')
        .oneOf([Yup.ref('password1'), null], 'Passwords must match')
});

export const SignUp = () => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    return (
        <>
            <Card className="w-25 mx-auto my-3">
                <Card.Header>
                    <h3>Sign up as a reader</h3>
                    {errors.non_field_errors && (
                        <p className="link-danger">{errors.non_field_errors}</p>
                    )}
                </Card.Header>
                <Card.Body>
                    <Formik
                        initialValues={{
                            username: '',
                            password1: '',
                            password2: '',
                        }}
                        validationSchema={RegisterSchema}
                        onSubmit={async values => {
                            try {
                                const response = await signUp(values)
                                if (response.status === 201) {
                                    navigate(path.SIGN_IN);
                                }
                            } catch (error) {
                                const errors = {};
                                const errorData = error.response.data.detail;
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
                                <Form.Group className="mb-3" controlId="username">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        name="username"
                                        type="text"
                                        placeholder="Username"
                                        {...formik.getFieldProps('username')}
                                    />
                                    {(formik.touched.username && formik.errors.username) || errors.username ? (
                                        <>
                                            <Form.Text className="text-muted">
                                                {formik.errors.username}
                                            </Form.Text>
                                            <Form.Text className="text-danger">
                                                {errors.username}
                                            </Form.Text>
                                        </>
                                    ) : null}
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password1">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        name="password1"
                                        type="password"
                                        placeholder="Password"
                                        {...formik.getFieldProps('password1')}
                                    />
                                    {(formik.touched.password1 && formik.errors.password1) || errors.password1 ? (
                                        <>
                                            <Form.Text className="text-muted">
                                                {formik.errors.password1}
                                            </Form.Text>
                                            <Form.Text className="text-danger">
                                                {errors.password1}
                                            </Form.Text>
                                        </>
                                    ) : null}
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password2">
                                    <Form.Label>Repeat Password</Form.Label>
                                    <Form.Control
                                        name="password2"
                                        type="password"
                                        placeholder="Repeat password"
                                        {...formik.getFieldProps('password2')}
                                    />
                                    {(formik.touched.password2 && formik.errors.password2) || errors.password2 ? (
                                        <>
                                            <Form.Text className="text-muted">
                                                {formik.errors.password2}
                                            </Form.Text>
                                            <Form.Text className="text-danger">
                                                {errors.password2}
                                            </Form.Text>
                                        </>
                                    ) : null}
                                </Form.Group>

                                <Button variant="primary" type="submit">
                                    Sign up
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </Card.Body>
                <Card.Footer>
                    Already have an account? <Link to={path.SIGN_IN}>Log in</Link>
                </Card.Footer>
            </Card>
        </>
    )
};