import {BACKEND_URL} from '../constants';

export const SIGN_UP = BACKEND_URL + '/auth/register/';
export const LOGIN = BACKEND_URL + '/auth/login/';
export const DELETE_ACCOUNT = BACKEND_URL + '/auth/';
export const VERIFY_TOKEN = BACKEND_URL + '/api/get-user/';


export const ROOMS = BACKEND_URL + '/api/rooms/';
export const JOIN_ROOM = BACKEND_URL + '/api/rooms/join/';
export const JOIN_ACTIVITY = BACKEND_URL + '/api/activities/join/';
export const LEAVE_ACTIVITY = BACKEND_URL + '/api/activities/leave/';
export const UPLOAD_VOICE = BACKEND_URL + '/api/upload-voice/';
export const GET_VOICES = BACKEND_URL + '/api/rooms/voices/';
export const CHANGE_VOICE = BACKEND_URL + '/api/change-voice/';
export const GET_ACTIVITY_PARTICIPANTS = BACKEND_URL + '/api/get-participants/';
export const VOTE = BACKEND_URL + '/api/activities/vote/';
