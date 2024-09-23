import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Presentation from './components/Presentation';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/presentation/:nickname" element={<Presentation />} />
                <Route path="/presentation/:presentationId" element={<Presentation />} />
            </Routes>
        </Router>
    );
}

export default App;
