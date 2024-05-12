import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {isAuth} from './hoc/isAuth';
import * as path from './constants/routes';
import {NotFound} from "./components/NotFound";
import {Login} from "./components/Login";
import {SignUp} from "./components/SignUp";
import {Main} from "./components/Main";

function Room() {
    return null;
}

const router = createBrowserRouter([
    {
        path: path.MAIN,
        element: isAuth(Main),
        children: [
            {
                path: path.ROOM,
                element: <Room/>,
            },
        ],
    },
    {
        path: path.SIGN_IN,
        element: <Login/>,
    },
    {
        path: path.SIGN_UP,
        element: <SignUp/>,
    },
    {
        path: path.NOT_FOUND,
        element: <NotFound/>
    }
]);

export const App = () => {
    return (
        <div className="App">
            <RouterProvider router={router}/>
        </div>
    );
}
