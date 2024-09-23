import React from 'react';

const Slide = ({ content, isActive }) => {
    return (
        <div
            id={`slide-${isActive ? 'active' : 'inactive'}`}
            className={`slide ${isActive ? 'active' : ''}`}
        >
            <textarea
                value={content}
                onChange={(e) => { /* handle content change */ }}
            />
        </div>
    );
};

export default Slide;
