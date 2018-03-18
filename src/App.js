import ReactDOM from "react-dom";
import React, { Component } from 'react';
import Chat from "./Chat";

class App extends Component {
  render() {
    return (
      <div>
          <Chat/>
      </div>
    );
  }
}

export default App;
ReactDOM.render(<App />, document.getElementById("app"));
