import { useContext, useState, useEffect } from 'react';
import UserContext from '../Context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ClipLoader from "react-spinners/ClipLoader";

function Login() {
    const [EnteredUser, setEnteredUser] = useState('');
    const [EnteredEmail, setEnteredEmail] = useState('');
    const [EnteredPassword, setEnteredPassword] = useState('');
    const [Error, setError] = useState('');
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();
    const [loginLoader, setLoginLoader] = useState(false);

    useEffect(() => {
        if (user) navigate('/home');
    }, [user])

    async function handleLogin() {
        try {
            console.log("Entered user upper", EnteredUser);
            setLoginLoader(true);
            const response = await axios.post(`http://localhost:8080/api/login`, {
                name: EnteredUser,
                email: EnteredEmail,
                password: EnteredPassword,
            });

            if (response.status === 200) {
                const token = response.data.token;
                // const EnteredUser = response.data.user;
                localStorage.setItem('token', token);
                sessionStorage.setItem('user', EnteredUser);
                setUser(EnteredUser);
                console.log("Entered user", EnteredUser);
                navigate('/home');
            }
        } catch (error) {
            setError(error?.response?.data?.error || "Some error Occurred");
        } finally {
            setLoginLoader(false);
        }
    }


    return (
        <div className="flex justify-center items-center">
            <div className='mt-[12%] w-[400px]'>
                <form className='p-[2rem] rounded-[5px] flex gap-[1rem] flex-col' onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    <div className='flex items-center gap-2 pl-2'> <p className='text-[35px] font-bold'>Sign in to <span className='text-black italic'>Chess App </span></p></div>
                    <input placeholder="Enter Username" onChange={(e) => { setEnteredUser(e.target.value) }} className='p-[0.6rem] outline-none w-full bg-inherit border-[1.7px] border-[#333639] focus:border-black placeholder:text-[#71767A]' required></input>
                    <input placeholder="Enter Email" onChange={(e) => { setEnteredEmail(e.target.value) }} className='p-[0.6rem] outline-none w-full bg-inherit border-[1.7px] border-[#333639] focus:border-black placeholder:text-[#71767A]' required></input>
                    <input placeholder="Enter Password" onChange={(e) => { setEnteredPassword(e.target.value) }} className='p-[0.6rem] outline-none w-full bg-inherit border-[1.7px] border-[#333639] focus:border-black placeholder:text-[#71767A]' required></input>
                    <div><Link to="/forgetpassword" className='text-black'>Forget Password?</Link></div>
                    <p>Don't have an Account ? <span><Link to="/signup" className='text-black'>Signup</Link></span></p>
                    <button type="submit" className={`p-2 bg-black rounded-sm text-white ${loginLoader ? 'pt-1 pb-1 cursor-not-allowed bg-grey-200' : ''}`}>{loginLoader ?
                        <ClipLoader
                            color={'#fff'}
                            aria-label="Loading Spinner"
                            data-testid="loader"
                        /> : 'login'}</button>
                    {Error && <p className='text-red-600'>*{Error}</p>}
                </form>
            </div>
        </div>);
}
export default Login;