import React, {useEffect, useState} from 'react';
import {verifyToken} from '../api/requests';
import {SIGN_IN} from '../constants/routes'
import {redirect, useNavigate} from 'react-router-dom';
// import {redirect} from "react-router-dom";

const checkToken = async () => {
    try {
        const response = await verifyToken();
        if (response.status === 200) {
            return response.data.current_user;
        } else {
            return false;
        }
    } catch (error) {
        localStorage.clear();
        console.error('Error verifying token:', error);
        return false;
    }
};

export const isAuth = (WrappedComponent, props) => {
    const Comp = (props) => {
        const navigate = useNavigate();
        const [user, setUser] = useState(null);

        useEffect(() => {
            const fetchData = async () => {
                const result = await checkToken();
                console.log(result);
                if (result === false){
                    console.log('redirect');
                    navigate(SIGN_IN);
                }
                setUser(result);
            };
            fetchData();
        }, []);

        if (user === null) {
            return <div>Loading</div>;
        }
        else {
            return (
                <WrappedComponent {...props} user={user}/>
            );
        }
    };
    return <Comp {...props}/>;
};