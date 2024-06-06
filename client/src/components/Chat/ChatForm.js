import {PaperPlane, HappyOutline} from 'react-ionicons'
import React, {useState} from "react";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react';
import {Button, Form} from "react-bootstrap";
import {Formik} from "formik";
import * as Yup from "yup";

export const ChatForm = ({user, sendMessage}) => {
    const [text, setText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChangeText = (event) => {
        setText(event.target.value);
    };

    const handleEmojiShow = () => {
        setShowEmoji((state) => !state);
    };

    const handleEmojiSelect = (event) => {
        console.log(event);
        setText((text) => (text += event.native));
    };

    const handleSendMessage = async event => {
        event.preventDefault();
        try {
            const trimmedText = text.trim();
            if (trimmedText) {
                console.log('trimmed:', text, user.username);
                const response = await sendMessage({'username': user.username, text});
                console.log(response);
                setText('');
            }
        } catch (error) {
            console.log(error);
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
            <Form onSubmit={handleSendMessage} style={{margin: '10px 0'}}>
        <Form.Group className='d-flex'>
          <Button variant='primary' type='button' onClick={handleEmojiShow}>
                            <HappyOutline
                                color={'#00000'}
                                height="20px"
                                width="20px"
                            />
                        </Button>
          <Form.Control
            value={text}
            onChange={handleChangeText}
            type='text'
            placeholder='Write your message here'
          />
          <Button variant="success" type="submit">
                            <PaperPlane
                                color={'#00000'}
                                height="20px"
                                width="20px"
                            />
                        </Button>
        </Form.Group>
      </Form>
            {/*<Formik*/}
            {/*    initialValues={{*/}
            {/*        text: '',*/}
            {/*    }}*/}
            {/*    validationSchema={SendMessageSchema}*/}
            {/*    onSubmit={async values => {*/}
            {/*        await handleSendMessage(values);*/}
            {/*    }}*/}
            {/*>*/}
            {/*    {formik => (*/}
            {/*        <Form noValidate onSubmit={formik.handleSubmit}>*/}
            {/*            <Button variant='primary' type='button' onClick={handleEmojiShow}>*/}
            {/*                <HappyOutline*/}
            {/*                    color={'#00000'}*/}
            {/*                    height="20px"*/}
            {/*                    width="20px"*/}
            {/*                />*/}
            {/*            </Button>*/}

            {/*            <Form.Group className="mb-3" controlId="text">*/}
            {/*                <Form.Control*/}
            {/*                    name="text"*/}
            {/*                    type="text"*/}
            {/*                    placeholder="Write your message here"*/}
            {/*                    {...formik.getFieldProps('text')}*/}
            {/*                    onChange={handleChangeText}*/}
            {/*                />*/}
            {/*                {errors.description ? (*/}
            {/*                    <>*/}
            {/*                        <Form.Text className="text-muted">*/}
            {/*                            {formik.errors.text}*/}
            {/*                        </Form.Text>*/}
            {/*                        <Form.Text className="text-danger">*/}
            {/*                            {errors.text}*/}
            {/*                        </Form.Text>*/}
            {/*                    </>*/}
            {/*                ) : null}*/}
            {/*            </Form.Group>*/}

            {/*            <Button variant="success" type="submit">*/}
            {/*                <PaperPlane*/}
            {/*                    color={'#00000'}*/}
            {/*                    height="20px"*/}
            {/*                    width="20px"*/}
            {/*                />*/}
            {/*            </Button>*/}
            {/*        </Form>*/}
            {/*    )}*/}
            {/*</Formik>*/}
            {showEmoji && <Picker data={data} onEmojiSelect={handleEmojiSelect} emojiSize={20}/>}
        </>
    );
}