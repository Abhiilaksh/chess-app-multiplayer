import { useNavigate } from "react-router-dom";
//import { v4 as uuidv4 } from 'uuid';

function Room() {
    const navigate = useNavigate();
    function createRoom() {
        sessionStorage.clear("game")
        // const uuid = uuidv4();
        navigate(`/game`);
    }

    return (
        <div>
            <button onClick={createRoom}>Play</button>
        </div>
    )
}
export default Room;