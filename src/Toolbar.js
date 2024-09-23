import React from 'react';

const Toolbar = ({ onAddSlide, onExportPDF }) => {
    return (
        <div className="toolbar">
            <button onClick={onAddSlide}>Add Slide</button>
            <button onClick={onExportPDF}>Export to PDF</button>
        </div>
    );
};

export default Toolbar;
