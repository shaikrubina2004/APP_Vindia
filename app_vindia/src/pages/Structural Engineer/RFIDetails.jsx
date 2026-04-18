import { useState } from "react";
import "./rfi.css";

export default function RFIDetails() {
  const [messages, setMessages] = useState([
    { sender: "Site Engineer", text: "Please clarify beam detail." },
    { sender: "Structural Engineer", text: "Refer drawing S-102." },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input) return;

    setMessages([...messages, { sender: "You", text: input }]);
    setInput("");
  };

  return (
    <div className="rfi-details">
      
      {/* HEADER */}
      <div className="rfi-details-header">
        <h3>RFI-001</h3>
        <span className="status pending">Pending</span>
      </div>

      {/* INFO */}
      <div className="rfi-details-info">
        <p><strong>Project:</strong> Sky Tower</p>
        <p><strong>Subject:</strong> Beam Reinforcement</p>
      </div>

      {/* CHAT */}
      <div className="rfi-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.sender === "You" ? "you" : ""}`}>
            <strong>{msg.sender}</strong>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="rfi-chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type response..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>

    </div>
  );
}