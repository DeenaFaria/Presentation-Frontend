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
              //  thumbnail: '' // Store generated thumbnail
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
            
            // Update the local user list with the new role
            setUsers(prevUsers => ({
                ...prevUsers,
                [userId]: { ...prevUsers[userId], role: newRole }
            }));

            // If the current user is the one whose role was updated, update their role in state
            if (userId === socket.id) {
                setCurrentRole(newRole);
            }
        });

        

        // Receive and draw existing canvas data when joining
        socket.on('canvas_data', (drawings) => {
            const ctx = canvasRef.current.getContext('2d');
            drawings.forEach(({ x0, y0, x1, y1, tool }) => {
                drawLine(ctx, x0, y0, x1, y1, tool);
            });
        });

        // Receive and draw new drawings
        socket.on('drawing', (data) => {
            const ctx = canvasRef.current.getContext('2d');
            if (data.tool === 'pen' || data.tool === 'eraser') {
                drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.tool);
            } else if (data.tool === 'rectangle') {
                drawRectangle(ctx, data.x0, data.y0, data.width, data.height);
            } else if (data.tool === 'circle') {
                drawCircle(ctx, data.x0, data.y0, data.radius);
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
            socket.off('canvas_data');
            socket.off('drawing');
            socket.off('slide_data');
            socket.off('slide_added');
            socket.off('user_list');
            socket.off('role_updated');
        };
    }, [presentationId, nickname]);

    const startDrawing = ({ nativeEvent }) => {
        if (currentRole !== 'Editor') return; // Allow only editors to draw

        const { offsetX, offsetY } = nativeEvent;
        setStartPosition({ x: offsetX, y: offsetY });
        setIsDrawing(true);
    };

        // Clear the canvas function
        const clearCanvas = () => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        };

  // Update the drawing functions to store drawings in the current slide
const draw = ({ nativeEvent }) => {
    if (!isDrawing || currentRole !== 'Editor') return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    if (tool === 'pen' || tool === 'eraser') {
        drawLine(ctx, startPosition.x, startPosition.y, offsetX, offsetY, tool);
        
        // Store the drawing in the current slide
        setSlides((prevSlides) => {
            const newSlides = [...prevSlides];
            newSlides[currentSlide].drawings.push({
                x0: startPosition.x,
                y0: startPosition.y,
                x1: offsetX,
                y1: offsetY,
                tool
            });
            return newSlides;
        });

        socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool, presentationId, slideIndex: currentSlide });
        setStartPosition({ x: offsetX, y: offsetY });
    }
};

const finishDrawing = ({ nativeEvent }) => {
    if (!isDrawing || currentRole !== 'Editor') return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    if (tool === 'rectangle') {
        const width = offsetX - startPosition.x;
        const height = offsetY - startPosition.y;
        drawRectangle(ctx, startPosition.x, startPosition.y, width, height);
        
        // Store rectangle with width and height
        setSlides((prevSlides) => {
            const newSlides = [...prevSlides];
            newSlides[currentSlide].drawings.push({
                x0: startPosition.x,
                y0: startPosition.y,
                width,
                height,
                tool: 'rectangle'
            });
            return newSlides;
        });

        socket.emit('drawing', {
            x0: startPosition.x,
            y0: startPosition.y,
            width,
            height,
            tool: 'rectangle',
            presentationId,
            slideIndex: currentSlide
        });
    } else if (tool === 'circle') {
        const radius = Math.sqrt((offsetX - startPosition.x) ** 2 + (offsetY - startPosition.y) ** 2);
        drawCircle(ctx, startPosition.x, startPosition.y, radius);

        // Store circle with radius
        setSlides((prevSlides) => {
            const newSlides = [...prevSlides];
            newSlides[currentSlide].drawings.push({
                x0: startPosition.x,
                y0: startPosition.y,
                radius,
                tool: 'circle'
            });
            return newSlides;
        });

        socket.emit('drawing', {
            x0: startPosition.x,
            y0: startPosition.y,
            radius,
            tool: 'circle',
            presentationId,
            slideIndex: currentSlide
        });
    }

    setIsDrawing(false);
};

    // Drawing helper functions
    const drawLine = (ctx, x0, y0, x1, y1, tool) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = tool === 'eraser' ? 'white' : 'black';
        ctx.lineWidth = tool === 'eraser' ? 10 : 2;
        ctx.stroke();
        ctx.closePath();
    };

    const drawRectangle = (ctx, x0, y0, width, height) => {
        ctx.strokeStyle = 'black';
        ctx.strokeRect(x0, y0, width, height);
    };
    
    const drawCircle = (ctx, x0, y0, radius) => {
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.stroke();
    };
    

    const switchSlide = (index) => {
        // Update the current slide
        setCurrentSlide(index);
        
        // Clear the canvas before drawing the new slide
        clearCanvas(); 
    
        // Get the current slide's data
        const currentSlideData = slides[index];
    
        // If current slide has drawings, redraw them
        if (currentSlideData && currentSlideData.drawings) {
            const ctx = canvasRef.current.getContext('2d');
            currentSlideData.drawings.forEach((drawing) => {
                if (drawing.tool === 'pen' || drawing.tool === 'eraser') {
                    drawLine(ctx, drawing.x0, drawing.y0, drawing.x1, drawing.y1, drawing.tool);
                } else if (drawing.tool === 'rectangle') {
                    drawRectangle(ctx, drawing.x0, drawing.y0, drawing.width, drawing.height);
                } else if (drawing.tool === 'circle') {
                    drawCircle(ctx, drawing.x0, drawing.y0, drawing.radius);
                }
            });
        }
    };
    
    
  
    
    
    
    

    const exportToPDF = async () => {
        const pdf = new jsPDF();
    
        for (let i = 0; i < slides.length; i++) {
            // Switch to the slide and wait for the canvas to update
            await new Promise((resolve) => {
                switchSlide(i);
                setTimeout(resolve, 500); // Wait for 500ms to ensure the canvas renders
            });
    
            // Capture the current canvas content as an image
            const canvas = await html2canvas(canvasRef.current);
            const imgData = canvas.toDataURL('image/png');
    
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 size page
    
            if (i < slides.length - 1) {
                pdf.addPage(); // Add a new page for the next slide
            }
        }
    
        pdf.save('presentation.pdf');
    };
    
    

    const switchRole = (userId) => {
        const updatedUsers = { ...users };
        const user = updatedUsers[userId];

        if (user) {
            user.role = user.role === 'Viewer' ? 'Editor' : 'Viewer';
            setUsers(updatedUsers);
            socket.emit('switch_role', { userId, presentationId, newRole: user.role });
        }
    };

    return (
        <div className="presentation-container">
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div className="thumbnails">
            {slides.map((slide, index) => (
                <div key={index} className={`thumbnail ${currentSlide === index ? 'active' : ''}`} onClick={() => switchSlide(index)}>
                   Slide {index + 1}
                </div>
            ))}
            </div>
            <div>
                <h2>Presentation: {presentationId}</h2>
                {currentRole === 'Editor' && (
                    <div className="toolbar">
                        <button onClick={() => setTool('pen')}>Pen</button>
                        <button onClick={() => setTool('rectangle')}>Rectangle</button>
                        <button onClick={() => setTool('circle')}>Circle</button>
                        <button onClick={() => setTool('eraser')}>Eraser</button>
                        <button onClick={() => socket.emit('add_slide', presentationId)}>Add Slide</button>
                        <button onClick={exportToPDF}>Export to PDF</button>
                    </div>
                )}

            

                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={finishDrawing}
                    onMouseLeave={finishDrawing}
                    style={{ border: '1px solid black', marginRight: '20px' }}
                />
            </div>

            <div style={{ flex: '1', marginLeft: '20px' }}>
                <h3>Connected Users</h3>
                <ul>
                    {Object.entries(users).map(([userId, user]) => (
                        <li key={userId}>
                            {user.nickname} ({user.role}){' '}
                            <button onClick={() => switchRole(userId)}>
                                {user.role === 'Viewer' ? 'Make Editor' : 'Make Viewer'}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        </div>
    );
};

export default Presentation;
