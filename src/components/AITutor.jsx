import React, { useState, useRef, useEffect } from 'react';
import aiBeeLogo from '../assets/ai_bee_logo.jpg';

const AITutor = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hi! I am Beebo, your AI Study Advisor. Pick a subject below or type a question, and I will give you the best strategies tailored for it!' }
    ]);

    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const toggleAIAdvisor = () => setIsOpen(!isOpen);

    const handleSend = async (overrideText = null) => {
        const textToSend = overrideText || inputText;
        if (!textToSend.trim()) return;

        setMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
        setInputText('');
        setIsLoading(true);

        try {
            const apiKey = "AIzaSyBg2rqjjLi3XiLaemCIoP_XNd083AS-XwM"; 
            const systemPrompt = `You are Beebo, a cute study advisor. Give a 2-sentence study tip for: ${textToSend}`;

            // 👇 USING GEMINI 2.5 FLASH 👇
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const botReply = data.candidates[0].content.parts[0].text;
                setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
            }

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: `Beebo Error: ${error.message}` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <>
            {/* FLOATING BUTTON - LIFTED TO 150PX */}
            <div 
                title="BeeboAI" 
                onClick={toggleAIAdvisor}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    position: 'fixed', bottom: '150px', right: '30px', width: '80px', height: '80px',
                    borderRadius: '50%', cursor: 'pointer', zIndex: 9999,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: isHovered ? '0 6px 24px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.35)'
                }}
            >
                <img src={aiBeeLogo} alt="Helper Bee Mascot" style={{ flexShrink: 0, width: '100%', height: '100%', padding: 0, border: 'none', backgroundColor: 'transparent', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center' }} />
            </div>

            {/* CHAT PANEL */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '240px', right: '30px', width: '380px', height: '550px',
                    background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1e293b', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={aiBeeLogo} alt="AI Avatar" style={{ flexShrink: 0, width: '40px', height: '40px', padding: 0, border: 'none', backgroundColor: 'transparent', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center' }} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>Brightify AI Advisor</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>Powered by Gemini</p>
                            </div>
                        </div>
                        <button onClick={toggleAIAdvisor} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '20px' }}>✖</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
                        {messages.map((msg, index) => (
                            <div key={index} style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                background: msg.sender === 'user' ? '#3b82f6' : '#e2e8f0',
                                color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                                padding: '10px 16px', borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                                maxWidth: '85%', fontSize: '14px', lineHeight: '1.4', fontWeight: '500'
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', background: '#e2e8f0', color: '#0f172a', padding: '10px 16px', borderRadius: '16px 16px 16px 4px', fontSize: '14px', fontWeight: '500' }}>💭 Beebo is thinking...</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Preset Subject Pills */}
                    <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                        <button 
                            onClick={() => handleSend("Can you give me the best study method for Comprog 6?")} 
                            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}
                        >
                            💻 Comprog 6
                        </button>
                        
                        <button 
                            onClick={() => handleSend("What is the best way to study SQL databases and table manipulation?")} 
                            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}
                        >
                            🗄️ SQL
                        </button>
                        
                        <button 
                            onClick={() => handleSend("How should I study ASP.NET MVC and client-side development?")} 
                            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}
                        >
                            🌐 ASP.NET
                        </button>
                    </div>

                    {/* NEW CUSTOM INPUT AREA */}
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Beebo a question..."
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '20px',
                                backgroundColor: isLoading ? '#94a3b8' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Send
                        </button>
                    </div>

                </div>
            )}
        </>
    );
};

export default AITutor;