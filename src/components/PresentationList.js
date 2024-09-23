import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');  // Make sure this points to your server

function PresentationList() {
    const [presentations, setPresentations] = useState([]);
    const [nickname, setNickname] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch the presentation list when component loads
        socket.emit('get_presentations');

        // Receive the updated presentation list
        socket.on('presentation_list', (data) => {
            setPresentations(data);
        });

        // Cleanup on component unmount
        return () => {
            socket.off('presentation_list');
        };
    }, []);

    const createPresentation = () => {
        const presentationId = Math.random().toString(36).substring(2, 15);  // Generate a random ID
        const presentationName = prompt('Enter the presentation name:');
        if (presentationName) {
            socket.emit('create_presentation', presentationId, presentationName);
            navigate(`/presentation/${presentationId}`, { state: { nickname } });
        }
    };

    const joinPresentation = (presentationId) => {
        navigate(`/presentation/${presentationId}`, { state: { nickname } });
    };

    return (
        <div>
            <h1>Welcome {nickname}</h1>
            <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="Enter your nickname"
            />
            <button onClick={createPresentation}>Create Presentation</button>

            <h2>Available Presentations</h2>
            {presentations.length === 0 ? (
                <p>No presentations available</p>
            ) : (
                <ul>
                    {presentations.map((presentation) => (
                        <li key={presentation.id}>
                            {presentation.name}
                            <button onClick={() => joinPresentation(presentation.id)}>Join</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default PresentationList;
