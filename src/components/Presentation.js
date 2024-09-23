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
    const { nickname, presentationId } = location.state;
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen'); // Tool state to select between pen, rectangle, etc.
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Join the presentation when the component mounts
        socket.emit('join_presentation', { presentationId, nickname });

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
                drawRectangle(ctx, data.x0, data.y0, data.x1, data.y1);
            } else if (data.tool === 'circle') {
                drawCircle(ctx, data.x0, data.y0, data.x1, data.y1);
            }
        });

        return () => {
            socket.off('canvas_data');
            socket.off('drawing');
        };
    }, [presentationId, nickname]);

    // Start drawing
    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setStartPosition({ x: offsetX, y: offsetY });
        setIsDrawing(true);
    };

    // Handle drawing on the canvas
    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'pen' || tool === 'eraser') {
            drawLine(ctx, startPosition.x, startPosition.y, offsetX, offsetY, tool);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool, presentationId });
            setStartPosition({ x: offsetX, y: offsetY });
        }
    };

    // Finish drawing
    const finishDrawing = ({ nativeEvent }) => {
        if (!isDrawing) return;

        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'rectangle') {
            drawRectangle(ctx, startPosition.x, startPosition.y, offsetX, offsetY);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool: 'rectangle', presentationId });
        } else if (tool === 'circle') {
            drawCircle(ctx, startPosition.x, startPosition.y, offsetX, offsetY);
            socket.emit('drawing', { x0: startPosition.x, y0: startPosition.y, x1: offsetX, y1: offsetY, tool: 'circle', presentationId });
        }

        setIsDrawing(false);
    };

    // Drawing functions
    const drawLine = (ctx, x0, y0, x1, y1, tool) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = tool === 'eraser' ? 'white' : 'black';
        ctx.lineWidth = tool === 'eraser' ? 10 : 2;
        ctx.stroke();
        ctx.closePath();
    };

    const drawRectangle = (ctx, x0, y0, x1, y1) => {
        ctx.strokeStyle = 'black';
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    };

    const drawCircle = (ctx, x0, y0, x1, y1) => {
        const radius = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.stroke();
    };

    // Export canvas content to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        html2canvas(canvasRef.current).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 0, 0);
            doc.save('presentation.pdf');
        });
    };

    return (
        <div>
            <h2>Presentation: {presentationId}</h2>

            {/* Toolbar for selecting tools */}
            <div className="toolbar">
                <button onClick={() => setTool('pen')}>Pen</button>
                <button onClick={() => setTool('rectangle')}>Rectangle</button>
                <button onClick={() => setTool('circle')}>Circle</button>
                <button onClick={() => setTool('eraser')}>Eraser</button>
                <button onClick={exportToPDF}>Export to PDF</button>
            </div>

            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
                style={{ border: '1px solid black' }}
            />
        </div>
    );
};

export default Presentation;
