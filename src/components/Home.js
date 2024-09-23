import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function Home() {
    const [nickname, setNickname] = useState('');
    const [presentations, setPresentations] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        socket.emit('get_presentations'); // Request presentations
        socket.on('presentation_list', (presentationList) => {
            setPresentations(presentationList);
        });

        // Clean up the socket listener when the component unmounts
        return () => {
            socket.off('presentation_list');
        };
    }, []);

    const handleCreatePresentation = () => {
        const presentationId = uuidv4(); // Generate a unique presentation ID
        socket.emit('create_presentation', presentationId, nickname);
        navigate(`/presentation/${presentationId}`, { state: { nickname, presentationId } }); // Navigate to the new presentation
    };

    const handleJoinPresentation = (presentationId) => {
        // Join the selected presentation
        navigate(`/presentation/${presentationId}`, { state: { nickname, presentationId } });
    };

    return (
        <div>
            <h1>Enter your nickname</h1>
            <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
            />
            <button onClick={handleCreatePresentation} disabled={!nickname}>
                Create Presentation
            </button>

            <h2>Join an existing presentation</h2>
            {presentations.length === 0 ? (
                <p>No presentations available. Create one!</p>
            ) : (
                <ul>
                    {presentations.map((presentation) => (
                        <li key={presentation.id}>
                            {presentation.name}
                            <button onClick={() => handleJoinPresentation(presentation.id)}>
                                Join
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Home;
