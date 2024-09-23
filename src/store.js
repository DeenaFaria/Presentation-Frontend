import { createStore } from 'redux';

const initialState = {
    presentations: [],  // List of presentations
    currentPresentation: null,  // Active presentation
    nickname: '',  // User nickname
};

const presentationReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_NICKNAME':
            return { ...state, nickname: action.payload };
        case 'CREATE_PRESENTATION':
            return { ...state, presentations: [...state.presentations, action.payload] };
        case 'JOIN_PRESENTATION':
            return { ...state, currentPresentation: action.payload };
        default:
            return state;
    }
};

const store = createStore(presentationReducer);

export default store;
