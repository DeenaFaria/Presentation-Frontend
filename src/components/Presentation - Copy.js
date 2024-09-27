import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Presentation.css';

const socket = io('http://localhost:3001');

const Presentation = () => {
    const canvasRef = useRef(null);
    const location = useLocation();
    const { nickname, presentationId, role } = location.state;
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen');
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [users, setUsers] = useState({});
    const [currentRole, setCurrentRole] = useState(role);
    const [slides, setSlides] = useState([]); // Store slide data
    const [currentSlide, setCurrentSlide] = useState(0); // Track the current active slide

    // Function to create a new slide
    const createNewSlide = () => {
        return {
            drawings: [], // Store drawing data per slide
        };
    };

    useEffect(() => {
        // Join the presentation when the component mounts
        socket.emit('join_presentation', { presentationId, nickname });

        // Receive the list of connected users
        socket.on('user_list', (connectedUsers) => {
            console.log('Received user list:', connectedUsers);
            setUsers(connectedUsers); // Update state with the user list
        });

        // Listen for the role update broadcast
        socket.on('role_updated', ({ userId, newRole }) => {
            console.log(`Received role update for user ${userId}: ${newRole}`);
            setUsers(prevUsers => ({
                ...prevUsers,
                [userId]: { ...prevUsers[userId], role: newRole }
            }));
            if (userId === socket.id) {
                setCurrentRole(newRole);
            }
        });

        // Receive slides data
        socket.on('slide_data', (slidesData) => {
            setSlides(slidesData); // Update the list of slides
        });

        // When a new slide is added
        socket.on('slide_added', (newSlideId) => {
            setSlides((prevSlides) => [...prevSlides, createNewSlide()]); // Add new slide
            setCurrentSlide(newSlideId); // Switch to the new slide
            clearCanvas(); // Clear the canvas when a new slide is added
        });

        return () => {
            socket.off('slide_data');
            socket.off('slide_added');
            socket.off('user_list');
            socket.off('role_updated');
        };
    }, [presentationId, nickname]);

    // Clear the canvas function
    const clearCanvas = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const startDrawing = ({ nativeEvent }) => {
        if (currentRole !== 'Editor') return; // Allow only editors to draw
        const { offsetX, offsetY } = nativeEvent;
        setStartPosition({ x: offsetX, y: offsetY });
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || currentRole !== 'Editor') return;

        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'pen' || tool === 'eraser') {
            drawLine(ctx, startPosition.x, startPosition.y, offsetX, offsetY, tool);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool, presentationId, slideIndex: currentSlide });
            setStartPosition({ x: offsetX, y: offsetY });
        }
    };

    const finishDrawing = ({ nativeEvent }) => {
        if (!isDrawing || currentRole !== 'Editor') return;

        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'rectangle') {
            drawRectangle(ctx, startPosition.x, startPosition.y, offsetX, offsetY);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool: 'rectangle', presentationId, slideIndex: currentSlide });
        } else if (tool === 'circle') {
            drawCircle(ctx, startPosition.x, startPosition.y, offsetX, offsetY);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool: 'circle', presentationId, slideIndex: currentSlide });
        }

        setIsDrawing(false);
    };

    // Draw line helper function
    const drawLine = (ctx, x0, y0, x1, y1, tool) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = tool === 'pen' ? 'black' : 'white'; // Use white for eraser
        ctx.lineWidth = tool === 'pen' ? 2 : 10;
        ctx.stroke();
        ctx.closePath();
    };

    // Draw rectangle helper function
    const drawRectangle = (ctx, x0, y0, x1, y1) => {
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    };

    // Draw circle helper function
    const drawCircle = (ctx, x0, y0, x1, y1) => {
        const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    };

    const switchSlide = (index) => {
        setCurrentSlide(index);
        clearCanvas(); // Clear canvas on slide change
        const currentSlideData = slides[index];

        if (currentSlideData && currentSlideData.drawings) {
            currentSlideData.drawings.forEach((drawing) => {
                drawLine(canvasRef.current.getContext('2d'), drawing.x0, drawing.y0, drawing.x1, drawing.y1, drawing.tool);
            });
        }
    };

    const exportToPDF = () => {
        const pdf = new jsPDF();
        const canvasPromises = slides.map((_, index) => {
            switchSlide(index);
            return html2canvas(canvasRef.current).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0);
                if (index < slides.length - 1) {
                    pdf.addPage();
                }
            });
        });

        Promise.all(canvasPromises).then(() => {
            pdf.save('presentation.pdf');
        });
    };

    // Toggle user role function
    const toggleUserRole = (userId) => {
        const newRole = users[userId].role === 'Editor' ? 'Viewer' : 'Editor';
        socket.emit('toggle_role', { userId, newRole, presentationId });
    };

    return (
        <div className="presentation">
            <div className="toolbar">
                <button onClick={() => setTool('pen')}>Pen</button>
                <button onClick={() => setTool('eraser')}>Eraser</button>
                <button onClick={() => setTool('rectangle')}>Rectangle</button>
                <button onClick={() => setTool('circle')}>Circle</button>
                <button onClick={() => socket.emit('add_slide', presentationId)}>Add Slide</button>
                <button onClick={exportToPDF}>Export to PDF</button>
                <div>
                    <h4>Connected Users:</h4>
                    <ul>
                        {Object.keys(users).map((userId) => (
                            <li key={userId}>
                                {users[userId].nickname} ({users[userId].role})
                                {currentRole === 'Editor' && (
                                    <button onClick={() => toggleUserRole(userId)}>
                                        {users[userId].role === 'Editor' ? 'Make Viewer' : 'Make Editor'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="slides-container">
                <div className="thumbnails">
                    {slides.map((slide, index) => (
                        <div key={index} className={`thumbnail ${currentSlide === index ? 'active' : ''}`} onClick={() => switchSlide(index)}>
                            {/* Here you can render a thumbnail for each slide, e.g., a small canvas preview */}
                            Slide {index + 1}
                        </div>
                    ))}
                </div>
                <div className="canvas-container">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={finishDrawing}
                        onMouseLeave={finishDrawing}
                    />
                </div>
            </div>
        </div>
    );
};

export default Presentation;
