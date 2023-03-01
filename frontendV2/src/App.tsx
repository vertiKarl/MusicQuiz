import React from 'react';
import logo from './logo.svg';
import './App.css';
import Navbar from './Components/navbar';
import Lobby from './Components/lobby';

function App() {
  return (
    <div className="App background-rainbow">
      <Navbar></Navbar>
      <div className="Page">
        <Lobby></Lobby>
      </div>
    </div>
  );
}

export default App;
