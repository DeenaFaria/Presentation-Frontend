import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';

const socket = io('https://collaborative-presentation-backend-1.onrender.com');

function Home() {
    const [nickname, setNickname] = useState('');
    const [presentations, setPresentations] = useState([]);
    const navigate = useNavigate();
    const [hasJoined, setHasJoined] = useState(false);


    useEffect(() => {
        // Always listen for presentation list updates
        socket.on('presentation_list', (presentationList) => {
            setPresentations(presentationList);
        });
    
        // Request the presentation list after entering nickname
        if (hasJoined) {
            socket.emit('get_presentations');
        }
    
        return () => {
            socket.off('presentation_list');
        };
    }, [hasJoined]); // Listen to presentation list updates even if presentations change
    

    const handleJoin = () => {
        if (nickname) setHasJoined(true); // Set the flag to show presentations
    };

    const handleCreatePresentation = () => {
        const presentationId = uuidv4(); // Generate a unique presentation ID
        const role = 'Editor'; // Set role as Editor for the creator
        socket.emit('create_presentation', presentationId, nickname, role); // Send the role to the server
        navigate(`/presentation/${presentationId}`, { state: { nickname, presentationId, role } }); // Navigate to the new presentation with role
    };

    const handleJoinPresentation = (presentationId) => {
        const role = 'Viewer'; // Default role for users joining a presentation
        navigate(`/presentation/${presentationId}`, { state: { nickname, presentationId, role } });
    };

    return (
        <div>
            {!hasJoined ? (
                <>
                    <h1>Enter your nickname</h1>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Your nickname"
                    />
                    <button onClick={handleJoin} disabled={!nickname}>
                        Continue
                    </button>
                </>
            ) : (
                <>
                    <h2>Create or Join a Presentation</h2>
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
                </>
            )}
        </div>
    );
}

export default Home;
