import React, {useState} from 'react';
import {Formik} from 'formik';
import {Form, Card, Button} from 'react-bootstrap';
import * as Yup from 'yup';
import {login} from '../api/requests';
import {Link, useNavigate} from 'react-router-dom';

import {MIN_PASSWORD_LENGTH} from '../constants';
import * as path from "../constants/routes";


const LoginSchema = Yup.object({
    username: Yup.string()
        .required('Required'),
    password: Yup.string()
        .min(
            MIN_PASSWORD_LENGTH,
            `Password has to be no more than ${MIN_PASSWORD_LENGTH} characters`
        )
        .required('Required')
});

export const Login = () => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState([]);
    const handleLogin = async values => {
        try {
            console.log(values);
            const response = await login(values);
            if (response.status === 200) {
                console.log(response.data);
                localStorage.setItem('token', response.data.access_token);
                navigate(path.MAIN);
            }
        } catch (error) {
            const errors = {};
            const errorData = error.response.data;
            for (const key in errorData) {
                const element = errorData[key];
                errors[key] = element.toString();
            }
            setErrors(errors);
        }
    };

    return (
        <>
            <Card className="my-3 w-25 mx-auto">
                <Card.Header>
                    {errors.non_field_errors && (
                        <p className="link-danger">{errors.non_field_errors}</p>
                    )}
                </Card.Header>
                <Card.Body>
                    <Formik
                        initialValues={{
                            username: '',
                            password: '',
                        }}
                        validationSchema={LoginSchema}
                        onSubmit={values => {
                            handleLogin(values);
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
                                            <Form.Text className="text-muted">
                                                {errors.username}
                                            </Form.Text>
                                        </>
                                    ) : null}
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        name="password"
                                        type="password"
                                        placeholder="Password"
                                        {...formik.getFieldProps('password')}
                                    />
                                    {(formik.touched.password && formik.errors.password) || errors.password ? (
                                        <>
                                            <Form.Text className="text-muted">
                                                {formik.errors.password}
                                            </Form.Text>
                                            <Form.Text className="text-muted">
                                                {errors.password}
                                            </Form.Text>
                                        </>
                                    ) : null}
                                </Form.Group>

                                <Button variant="primary" type="submit">
                                    Log in
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </Card.Body>
                <Card.Footer>
                    Don't have an account yet? <Link to={path.SIGN_UP}>Sign up</Link>
                </Card.Footer>
            </Card>
        </>
    )
};