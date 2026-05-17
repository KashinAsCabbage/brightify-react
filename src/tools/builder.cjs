const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const componentsDir = path.join(srcDir, 'components');
const pagesDir = path.join(srcDir, 'pages');

if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });
if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

function convertToJSX(html, styleVar = 'styles') {
    // Convert class="foo bar" to className={`${styles['foo']} ${styles['bar']}`}
    let jsx = html.replace(/class="([^"]+)"/g, (match, classes) => {
        const clsList = classes.trim().split(/\s+/).filter(Boolean);
        if (clsList.length === 0) return '';
        if (clsList.length === 1) return `className={${styleVar}['${clsList[0]}']}`;
        return `className={\`${clsList.map(c => `\${${styleVar}['${c}']}`).join(' ')}\`}`;
    });
    
    // Fix unclosed tags
    jsx = jsx.replace(/<input([^>]*[^\/])>/g, '<input$1 />');
    jsx = jsx.replace(/<img([^>]*[^\/])>/g, '<img$1 />');
    jsx = jsx.replace(/<br>/g, '<br />');
    jsx = jsx.replace(/<hr>/g, '<hr />');

    // Convert inline styles
    jsx = jsx.replace(/style="([^"]+)"/g, (match, styleStr) => {
        const rules = styleStr.split(';').filter(Boolean);
        const styleObj = rules.map(rule => {
            let [key, val] = rule.split(':').map(s => s.trim());
            if(!key || !val) return '';
            key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            return `${key}: '${val}'`;
        }).filter(Boolean).join(', ');
        return `style={{ ${styleObj} }}`;
    });

    // Convert onclick to onClick and drop function arguments (to solve later)
    jsx = jsx.replace(/onclick="([^"]+)"/g, 'onClick={() => { /* TODO: hook up $1 */ }}');

    // Remove comments
    jsx = jsx.replace(/<!--[\s\S]*?-->/g, '');

    return jsx;
}

// 1. Process index.html for Dashboard components
const indexHtmlPath = path.join(__dirname, '../../../index.html');
const indexHtmlResult = fs.readFileSync(indexHtmlPath, 'utf8');

// Sidebar
const sidebarMatch = indexHtmlResult.match(/<aside class="sidebar">([\s\S]*?)<\/aside>/);
if (sidebarMatch) {
    const sidebarJsx = convertToJSX(`<aside className={styles['sidebar']}>` + sidebarMatch[1] + `</aside>`);
    fs.writeFileSync(path.join(componentsDir, 'Sidebar.jsx'), `import React from 'react';\nimport styles from '../dashboard.module.css';\n\nexport default function Sidebar() {\n  return (\n    ${sidebarJsx}\n  );\n}\n`);
}

// TopHeader
const topHeaderMatch = indexHtmlResult.match(/<header class="top-header">([\s\S]*?)<\/header>/);
if (topHeaderMatch) {
    const topHeaderJsx = convertToJSX(`<header className={styles['top-header']}>` + topHeaderMatch[1] + `</header>`);
    fs.writeFileSync(path.join(componentsDir, 'TopHeader.jsx'), `import React from 'react';\nimport styles from '../dashboard.module.css';\n\nexport default function TopHeader() {\n  return (\n    ${topHeaderJsx}\n  );\n}\n`);
}

// MainContent
const mainContentMatch = indexHtmlResult.match(/<div id="content-area" class="content-area">([\s\S]*?)<\/main>/);
if (mainContentMatch) {
    const caMatch = indexHtmlResult.match(/<div id="content-area" class="content-area">([\s\S]*?)<\/div>\s*<\/main>/);
    const contentHtml = caMatch ? `<div id="content-area" className={styles['content-area']}>` + caMatch[1] + `</div>` : `<div className={styles['content-area']}>Missing content</div>`;
    const mainJsx = convertToJSX(contentHtml);
    fs.writeFileSync(path.join(componentsDir, 'MainContent.jsx'), `import React from 'react';\nimport styles from '../dashboard.module.css';\n\nexport default function MainContent() {\n  return (\n    ${mainJsx}\n  );\n}\n`);
}

// Dashboard
fs.writeFileSync(path.join(pagesDir, 'Dashboard.jsx'), `import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import MainContent from '../components/MainContent';
import styles from '../dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className={styles['dashboard-body'] || 'dashboard-wrapper'}>
      <Sidebar />
      <main className={styles['main-content']}>
        <TopHeader />
        <MainContent />
      </main>
    </div>
  );
}
`);

// 2. Process login.html for Login.jsx
const loginHtmlPath = path.join(__dirname, '../../../login.html');
const loginHtmlResult = fs.readFileSync(loginHtmlPath, 'utf8');

const authContainerMatch = loginHtmlResult.match(/<div class="auth-container">([\s\S]*?)<\/div>\s*<\/div>/);
if (authContainerMatch) {
    let authHtml = `<div className={styles['auth-container']}>` + authContainerMatch[1] + `</div></div>`;
    let loginJsx = convertToJSX(authHtml);

    fs.writeFileSync(path.join(pagesDir, 'Login.jsx'), `import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import supabase from '../supabaseClient';
import styles from '../login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // GSAP Refs
  const cursorLightRef = useRef(null);
  const leafContainerRef = useRef(null);
  const authCardRef = useRef(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();

    const handleMouseMove = (e) => {
      if (cursorLightRef.current) {
        gsap.to(cursorLightRef.current, {
          x: e.clientX - 300,
          y: e.clientY - 300,
          duration: 2,
          ease: "power2.out"
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const createFallingLeaf = () => {
      if (!leafContainerRef.current) return;
      const leaf = document.createElement('div');
      leaf.className = styles['falling-leaf'];
      leaf.style.color = isLogin ? "#fb923c" : "#4ade80";
      leaf.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M17 8C8 10 5 16 5 22C5 22 7 16 16 13C20 11 21 3 21 3C21 3 20 6 17 8Z"/></svg>';
      
      const startX = Math.random() * window.innerWidth;
      const size = Math.random() * 15 + 10;
      
      leaf.style.position = 'absolute';
      leaf.style.top = '-50px';
      leaf.style.left = \`\${startX}px\`;
      leaf.style.width = \`\${size}px\`;
      leaf.style.height = \`\${size}px\`;
      leaf.style.opacity = Math.random() * 0.5 + 0.2;
      
      leafContainerRef.current.appendChild(leaf);
      
      const fallDuration = Math.random() * 6 + 6;
      
      gsap.to(leaf, {
        y: window.innerHeight + 100,
        rotation: Math.random() * 360 + 180,
        duration: fallDuration,
        ease: "none",
        onComplete: () => leaf.remove()
      });
      
      gsap.to(leaf, {
        x: startX + (Math.random() * 200 - 100),
        duration: Math.random() * 2 + 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
    };
    
    const interval = setInterval(createFallingLeaf, 600);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [isLogin, navigate]);

  const handleToggle = (e) => {
    e.preventDefault();
    if (authCardRef.current) {
      gsap.to(authCardRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        onComplete: () => {
          setIsLogin(!isLogin);
          gsap.to(authCardRef.current, { opacity: 1, y: 0, duration: 0.6 });
        }
      });
    } else {
      setIsLogin(!isLogin);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          alert("This email is already registered. Please try signing in.");
        } else {
          alert("Planting successful! Please sign in.");
          setIsLogin(true);
        }
      }
    } catch (error) {
      alert("Auth failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <div className={styles['forest-bg']} style={isLogin ? { transform: 'scale(1.1)', filter: 'sepia(0.4) hue-rotate(15deg)' } : {}}></div>
      <div className={styles['light-overlay']} ref={cursorLightRef}></div>
      <div id="leaf-container" className={styles['leaf-container']} ref={leafContainerRef}></div>

      <div className={styles['content-wrapper']}>
        <div className={\`\${styles['bloom-container']} \${isLogin ? styles['active-bloom'] : ''}\`}>
          <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 337" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 0 15px currentColor)' }}>
             <path d="M12 2v20M12 2L7 7M12 2l5 5M12 12l-5 5M12 12l5 5"/>
          </svg>
        </div>

        <div className={styles['auth-card']} ref={authCardRef}>
          <div className={styles['icon-header']}>
             <svg id="tree-icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none">
                 <path d="M17 20h5l-2-2h-3l2 2zM7 20H2l2-2h3l-2 2zM12 2v20M12 2L7 7M12 2l5 5M12 12l-5 5M12 12l5 5"/>
             </svg>
          </div>
          
          <h1>{isLogin ? "Return to Canopy" : "Plant Your Roots"}</h1>
          <p>{isLogin ? "Welcome back to the ancient grove" : "Begin your journey in the ecosystem"}</p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles['input-group']}>
                <input type="text" placeholder="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div className={styles['input-group']}>
              <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className={styles['input-group']}>
              <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className={styles['submit-btn']} disabled={isLoading} style={isLogin ? { background: '#9a3412' } : { background: '#166534' }}>
              {isLoading ? "Processing..." : (isLogin ? "Enter the Grove" : "Grow Account")}
            </button>
          </form>

          <p className={styles['toggle-text']}>
            <span>{isLogin ? "New to the forest?" : "Already rooted?"}</span> 
            <a href="#" onClick={handleToggle}>{isLogin ? "Plant Roots" : "Sign In"}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
`);
}

// 3. Create supabaseClient.js
fs.writeFileSync(path.join(srcDir, 'supabaseClient.js'), `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = 'YOUR_SUPABASE_URL';\nconst supabaseKey = 'YOUR_SUPABASE_ANON_KEY';\nconst supabase = createClient(supabaseUrl, supabaseKey);\n\nexport default supabase;\n`);

// 4. Create App.jsx
fs.writeFileSync(path.join(srcDir, 'App.jsx'), `import React from 'react';\nimport { BrowserRouter as Router, Routes, Route } from 'react-router-dom';\nimport Login from './pages/Login';\nimport Dashboard from './pages/Dashboard';\n\nfunction App() {\n  return (\n    <Router>\n      <Routes>\n        <Route path="/login" element={<Login />} />\n        <Route path="/" element={<Dashboard />} />\n      </Routes>\n    </Router>\n  );\n}\n\nexport default App;\n`);

// 5. Update main.jsx to point to main structure
const mainJsxPath = path.join(srcDir, 'main.jsx');
if (fs.existsSync(mainJsxPath)) {
    fs.writeFileSync(mainJsxPath, `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\n\ncreateRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n`);
}

console.log('React scaffolding complete.');
