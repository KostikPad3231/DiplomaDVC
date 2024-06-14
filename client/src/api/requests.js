import axios from 'axios';
import * as API_URL from './routes';

export const signUp = async (values) => {
    return axios.post(API_URL.SIGN_UP, {...values});
};

export const login = async values => {
    const formData = new FormData();
    formData.append('username', values.username);
    formData.append('password', values.password);

    return axios.post(API_URL.LOGIN, formData);
};

export const logout = async () => {
    return axios({
        method: 'post',
        url: API_URL.LOG_OUT,
        headers: {Authorization: `Bearer ${localStorage.getItem("token")}`},
    });
};

export const verifyToken = async () => {
    return axios({
        method: 'get',
        url: API_URL.VERIFY_TOKEN,
        headers: {Authorization: `Bearer ${localStorage.getItem("token")}`},
    });
};

export const getRooms = async () => {
    return axios({
        method: 'get',
        url: API_URL.ROOMS,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const deleteRoom = async (roomId) => {
    return axios({
        method: 'delete',
        url: API_URL.ROOMS + roomId + '/',
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const createRoom = async (values) => {
    return axios({
        method: 'post',
        url: API_URL.ROOMS,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: values,
    });
};

export const joinRoom = async (values) => {
    return axios({
        method: 'post',
        url: API_URL.JOIN_ROOM,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: values,
    });
};

export const uploadVoice = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios({
        method: 'post',
        url: API_URL.UPLOAD_VOICE,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: formData
    });
};