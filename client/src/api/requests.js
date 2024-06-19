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

export const deleteAccount = async () => {
    return axios({
        method: 'delete',
        url: API_URL.DELETE_ACCOUNT,
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

export const getRoomLeaderboard = async (roomId) => {
    return axios({
        method: 'get',
        url: API_URL.ROOMS + `${roomId}/leaderboard`,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const deleteRoom = async (roomId) => {
    return axios({
        method: 'delete',
        url: API_URL.ROOMS + roomId,
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

export const leaveRoom = async (roomId) => {
    return axios({
        method: 'post',
        url: API_URL.ROOMS + `${roomId}/leave`,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`}
    });
};

export const joinActivity = async (values) => {
    return axios({
        method: 'post',
        url: API_URL.JOIN_ACTIVITY,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: values,
    })
}

export const leaveActivity = async (values) => {
    return axios({
        method: 'post',
        url: API_URL.LEAVE_ACTIVITY,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: values,
    })
}

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

export const getVoices = async (roomId) => {
    return axios({
        method: 'get',
        url: API_URL.GET_VOICES + roomId.toString(),
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const changeVoice = async (roomId, userTo) => {
    return axios({
        method: 'post',
        url: API_URL.CHANGE_VOICE + `?room_id=${roomId}&user_to=${userTo}`,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const getActivityParticipants = async (activityId) => {
    return axios({
        method: 'get',
        url: API_URL.GET_ACTIVITY_PARTICIPANTS + activityId.toString(),
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
    });
};

export const vote = async (activityId, votes) => {
    return axios({
        method: 'post',
        url: API_URL.VOTE,
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
        data: {activity_id: activityId, votes}
    });
};