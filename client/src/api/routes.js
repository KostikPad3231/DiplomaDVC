import {BACKEND_URL} from '../constants';

export const PROFILE = BACKEND_URL + '/api/user/me/';
export const SIGN_UP = BACKEND_URL + '/auth/register/';
export const LOGIN = BACKEND_URL + '/auth/login/';
export const LOG_OUT = BACKEND_URL + '/auth/logout/';
export const VERIFY_TOKEN = BACKEND_URL + '/api/get-user/';


export const ROOMS = BACKEND_URL + '/api/rooms/';
export const JOIN_ROOM = BACKEND_URL + '/api/rooms/join/';
export const UPLOAD_VOICE = BACKEND_URL + '/api/upload-voice/';
