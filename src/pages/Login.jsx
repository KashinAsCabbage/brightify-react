import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import styles from '../login.module.css';
import BackgroundParticles from '../components/BackgroundParticles/BackgroundParticles';


export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [usertag, setUsertag] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isEmailValid = email === '' || email.endsWith('@gmail.com');
  const isUsertagValid = /^[a-zA-Z0-9_]+$/.test(usertag) || usertag === '';

  // GSAP Refs
  const cursorLightRef = useRef(null);
  const leafContainerRef = useRef(null);
  const authCardRef = useRef(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
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
      leaf.style.left = `${startX}px`;
      leaf.style.width = `${size}px`;
      leaf.style.height = `${size}px`;
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

    const generateUserTag = () => {
      return '#' + Math.floor(1000 + Math.random() * 9000).toString();
    };

    if (!isLogin) {
      if (!isEmailValid) {
        toast.error('Please enter a valid @gmail.com email!');
        return;
      }
      if (!isUsertagValid) {
        toast.error('Please enter a valid Usertag!');
        return;
      }

      // FIRST: Check password strength
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      if (password.length < 8 || !hasLetter || !hasNumber) {
        toast.error('Password must be at least 8 characters and include both numbers and letters.');
        return;
      }

      // SECOND: Check if passwords match
      if (password !== confirmPassword) {
        toast.error('Confirmation password is incorrect!');
        return;
      }
    }
    setIsLoading(true);

    try {
      const authEmail = `${usertag}@brightify.local`;
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: { data: { first_name: firstName, middle_name: middleName, last_name: lastName, username: usertag } }
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("This Usertag is already registered. Please try signing in.");
        } else if (data.user) {
          const userTag = generateUserTag();
          const role = teacherCode === 'BRIGHT-TEACH-2026' ? 'teacher' : 'student';
          
          const { error: profileError } = await supabase.from('profiles').insert([{ 
            id: data.user.id, 
            username: usertag,
            user_tag: userTag,
            role: role
          }]);
          
          if (profileError) {
            if (profileError.code === '23505' || (profileError.message && profileError.message.includes('duplicate key value'))) {
              toast.error('That Usertag is already taken! Please choose another.');
              setUsertag('');
            } else {
              console.error("Profile insertion failed:", profileError);
              toast.error("Account created, but profile initialization failed.");
            }
          } else {
            toast.success("Planting successful! Please sign in.");
            setIsLogin(true);
            setEmail('');
            setUsertag('');
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setPassword('');
            setConfirmPassword('');
            setTeacherCode('');
          }
        }
      }
    } catch (error) {
      toast.error("Auth failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <BackgroundParticles color="#f59e0b" count={25} shape="leaf" />
      <div className={styles['forest-bg']} style={isLogin ? { transform: 'scale(1.1)', filter: 'sepia(0.4) hue-rotate(15deg)' } : {}}></div>
      <div className={styles['light-overlay']} ref={cursorLightRef}></div>
      <div id="leaf-container" className={styles['leaf-container']} ref={leafContainerRef}></div>

      <div className={styles['content-wrapper']} style={{ position: 'relative', zIndex: 10 }}>
        <div className={`${styles['bloom-container']} ${isLogin ? styles['active-bloom'] : ''}`}>
          <svg id="life-tree" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 337" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 0 15px currentColor)' }}>
                    <g transform="translate(0,337) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                        
                        <path className={styles['trunk']} d="M2866 3133 c-16 -34 -30 -82 -33 -114 -5 -54 -4 -58 30 -95 l36 -39 33 33 c31 30 33 37 33 100 -1 53 -7 78 -28 120 -15 28 -31 52 -35 52 -4 0 -21 -26 -36 -57z M2620 3044 c-29 -34 -31 -39 -25 -89 5 -37 3 -60 -8 -80 l-14 -28 -18 27 c-16 23 -17 35 -8 66 12 47 -2 88 -40 113 -36 23 -37 23 -37 -24 0 -33 6 -47 31 -70 38 -35 33 -59 -13 -60 l-33 -1 31 -7 c17 -4 36 -11 42 -15 16 -10 34 -83 27 -107 -11 -34 -35 -3 -35 45 0 42 -13 66 -37 66 -23 0 -13 -44 22 -100 38 -59 40 -66 25 -105 -10 -26 -10 -26 -34 -8 -13 10 -27 30 -30 44 -8 39 -116 80 -116 44 0 -25 53 -74 86 -78 47 -7 77 -26 70 -45 -19 -59 -45 -125 -46 -115 0 14 -140 167 -140 153 0 -5 5 -12 10 -15 6 -3 10 -10 10 -15 0 -11 -76 22 -102 44 -25 22 -24 80 2 106 40 40 12 100 -47 100 l-22 0 25 -48 c24 -47 25 -51 12 -103 -13 -48 -17 -54 -43 -57 -15 -2 -45 4 -65 13 -30 14 -42 15 -59 5 -23 -12 -41 -48 -41 -82 0 -19 2 -20 18 -6 29 26 60 39 128 53 65 14 66 13 115 -16 28 -16 54 -29 58 -29 5 0 14 -7 21 -15 10 -13 9 -15 -11 -16 -15 -1 -7 -5 19 -11 32 -7 46 -17 59 -41 20 -35 74 -199 68 -205 -8 -8 -175 72 -196 94 -12 13 -26 43 -30 67 l-6 42 -2 -47 c-1 -39 4 -53 30 -82 16 -19 39 -38 50 -41 30 -10 22 -22 -20 -29 -21 -3 -62 -21 -90 -40 -51 -34 -51 -35 -62 -13 -7 11 -16 59 -20 104 -5 46 -16 96 -25 111 -8 15 -12 18 -8 7 4 -11 9 -40 12 -65 4 -42 3 -44 -14 -30 -18 14 -18 14 -1 -6 9 -11 17 -30 17 -43 0 -21 -1 -21 -27 -4 -26 17 -27 17 -14 0 16 -20 16 -20 -34 -2 -22 8 -54 14 -70 15 -50 0 -56 15 -34 78 11 31 17 64 13 74 -5 18 -64 68 -79 68 -4 0 -5 -19 -2 -42 4 -29 14 -50 32 -65 20 -17 24 -28 19 -48 -8 -32 -24 -43 -24 -16 0 51 -38 78 -127 90 -65 9 -68 -2 -23 -71 36 -55 79 -76 121 -61 21 8 31 8 39 -2 15 -18 -9 -26 -113 -34 -81 -7 -91 -11 -122 -41 -19 -18 -32 -37 -29 -42 8 -12 106 -9 131 5 12 7 31 24 43 40 28 36 42 35 24 -2 -15 -30 -11 -76 8 -87 18 -11 29 20 23 63 -5 35 -3 43 14 52 27 15 36 14 23 -2 -7 -8 -9 -40 -6 -82 4 -58 9 -74 31 -97 l27 -28 -30 0 c-26 -1 -24 -3 16 -17 24 -8 60 -27 78 -41 l35 -26 -29 -8 c-30 -9 -59 -30 -84 -63 -9 -13 -3 -10 18 8 71 58 120 45 186 -48 25 -34 55 -69 68 -78 23 -16 23 -16 -17 -18 -148 -5 -265 39 -354 136 -31 34 -41 53 -41 79 0 29 4 34 29 39 24 5 32 14 42 47 7 22 9 43 6 46 -3 4 -21 -2 -39 -13 -28 -16 -35 -27 -43 -73 l-11 -54 -22 36 c-26 41 -28 73 -7 82 10 4 15 20 15 51 0 43 -1 45 -20 35 -11 -6 -28 -22 -37 -36 -13 -21 -14 -30 -5 -45 28 -45 51 -118 39 -123 -7 -2 -5 -5 4 -5 9 -1 25 -13 34 -27 10 -15 40 -49 68 -76 57 -55 58 -54 -58 -23 -47 13 -95 45 -95 64 0 5 -14 14 -30 21 -34 14 -88 8 -144 -15 -32 -14 -36 -18 -25 -31 41 -50 147 -69 190 -35 23 18 26 18 58 2 l33 -18 -44 -16 c-24 -9 -55 -17 -69 -17 -14 0 -34 -9 -43 -19 -19 -21 -38 -89 -30 -103 10 -16 93 52 105 87 25 67 110 68 318 5 62 -19 71 -24 55 -33 -11 -6 -36 -25 -56 -43 -49 -44 -95 -67 -124 -61 -13 2 -21 0 -18 -4 3 -5 -2 -9 -10 -9 -9 0 -22 -13 -30 -29 -25 -48 -80 -57 -96 -16 -12 31 -64 55 -120 55 l-41 0 22 -40 c23 -41 73 -80 101 -80 9 0 21 7 28 15 7 8 26 15 42 15 20 0 40 10 61 32 19 19 47 34 69 38 l37 7 -31 -43 c-17 -24 -40 -51 -50 -61 -17 -15 -18 -15 -18 0 0 24 -36 21 -60 -3 -26 -26 -25 -40 3 -40 22 -1 22 -1 -3 -15 -37 -21 -74 -18 -104 10 -49 45 -93 26 -110 -47 -8 -33 -2 -35 31 -8 19 14 41 20 81 20 54 0 54 0 39 -22 -8 -13 -23 -23 -33 -24 -11 -1 -26 -2 -35 -3 -24 -2 -68 -118 -54 -141 9 -14 82 26 101 54 8 14 16 39 16 58 0 19 9 43 21 56 27 29 39 28 27 -4 -6 -14 -10 -41 -10 -59 0 -24 -6 -38 -20 -45 -25 -13 -44 -77 -33 -108 9 -24 9 -24 42 13 31 36 32 40 26 99 -5 48 -2 68 12 96 10 19 25 35 33 35 8 0 21 8 28 17 7 10 21 22 30 27 15 8 17 2 20 -48 1 -31 4 -69 5 -85 2 -23 -4 -33 -27 -46 -29 -15 -52 -65 -36 -75 14 -9 59 35 62 62 4 37 25 40 33 4 4 -20 0 -42 -14 -70 -36 -69 -20 -83 35 -30 l33 32 6 -25 c4 -14 5 -39 3 -54 -3 -27 -6 -29 -40 -26 -20 2 -46 -2 -58 -8 -26 -14 -70 -104 -70 -143 0 -25 3 -27 23 -22 41 12 111 60 124 85 7 14 15 36 17 50 3 14 10 32 16 40 8 13 12 12 31 -7 22 -21 22 -23 6 -75 -21 -69 -30 -118 -23 -118 15 0 86 51 100 72 31 43 15 88 -31 88 -13 0 -23 4 -23 9 0 5 -10 22 -23 38 -24 28 -53 111 -43 120 13 13 56 -29 56 -53 0 -16 12 -37 31 -55 36 -34 49 -36 49 -10 0 36 -19 70 -47 85 l-28 15 35 1 c19 1 52 7 73 14 39 15 51 3 20 -20 -29 -20 -15 -144 15 -144 10 0 32 60 32 85 0 10 -5 33 -12 51 -9 27 -9 37 6 58 21 33 36 33 36 1 0 -14 7 -42 15 -62 26 -63 12 -115 -36 -132 -29 -10 -41 -29 -54 -88 -9 -43 12 -44 60 -2 27 24 35 39 35 64 0 19 5 46 11 62 8 22 12 25 19 13 16 -31 22 -100 10 -135 -15 -45 -10 -51 29 -31 55 29 66 92 20 116 -22 12 -59 67 -59 89 0 17 70 -42 91 -78 29 -49 75 -71 148 -71 95 0 106 12 56 56 -22 20 -60 45 -84 56 -37 17 -49 18 -88 8 -40 -9 -48 -9 -65 7 -20 18 -19 18 14 27 45 11 88 12 117 2 22 -8 23 -6 17 20 -10 40 -24 54 -53 54 -16 0 -29 -10 -41 -30 -13 -23 -24 -30 -48 -30 -78 0 -107 114 -51 199 15 23 49 56 75 72 42 27 54 30 108 27 49 -3 70 -10 100 -33 l39 -28 -30 33 c-79 87 -214 91 -295 10 -20 -20 -20 -20 -59 19 -22 22 -45 49 -51 61 -17 32 -75 53 -127 45 -24 -3 -43 -10 -43 -14 0 -15 85 -92 109 -98 15 -4 36 0 52 10 26 15 29 14 53 -8 14 -13 26 -34 26 -47 0 -29 -65 -115 -109 -145 -37 -25 -107 -31 -143 -12 -20 11 -20 12 -4 24 15 12 13 13 -16 12 -30 -2 -35 2 -56 45 -20 39 -23 56 -17 96 8 61 42 122 56 101 6 -10 9 -7 9 13 0 36 61 81 132 98 151 37 341 -28 479 -162 46 -44 109 -124 109 -138 0 -4 -26 6 -57 22 -51 26 -67 29 -129 26 -60 -3 -77 -8 -109 -32 -37 -29 -75 -94 -75 -131 0 -15 6 -11 22 16 48 83 160 107 256 54 99 -54 157 -156 156 -275 0 -90 -28 -156 -100 -238 -88 -101 -210 -173 -359 -212 -101 -27 -157 -59 -219 -127 -27 -29 -57 -53 -67 -53 -11 0 -19 -4 -19 -10 0 -13 16 -13 42 1 26 14 32 6 18 -23 l-11 -23 18 21 c10 12 25 35 35 52 26 48 106 88 217 107 122 22 232 64 299 115 28 22 52 36 52 31 0 -4 -27 -35 -60 -69 -72 -72 -134 -104 -250 -127 -118 -24 -150 -43 -204 -120 -25 -36 -43 -65 -40 -65 2 0 33 27 68 59 63 58 87 70 178 86 l38 7 -21 -51 c-17 -39 -28 -53 -48 -57 -80 -17 -122 -59 -120 -119 1 -27 2 -26 9 9 9 47 37 73 88 82 46 8 59 18 82 65 15 28 35 45 81 68 34 17 64 29 67 26 3 -2 -7 -20 -22 -39 -51 -67 -25 -50 88 59 87 83 121 123 140 165 14 30 26 63 26 73 0 9 5 17 11 17 16 0 2 -105 -22 -160 -25 -56 -57 -91 -134 -143 -33 -23 -78 -55 -100 -72 -22 -16 -59 -38 -82 -49 -30 -13 -45 -27 -52 -50 l-11 -31 19 23 c18 21 55 40 109 56 21 7 22 5 22 -51 0 -46 -5 -66 -26 -96 -14 -21 -24 -40 -22 -43 8 -7 68 80 69 100 4 89 8 107 31 126 25 21 57 35 64 27 3 -3 -2 -21 -10 -41 -8 -20 -11 -36 -6 -36 8 0 50 79 50 96 0 5 23 24 50 43 51 35 84 71 113 126 l16 30 1 -28 c0 -48 -26 -92 -79 -133 -30 -23 -59 -57 -72 -84 -12 -25 -37 -65 -54 -90 -18 -25 -35 -59 -38 -76 -7 -39 8 -97 30 -115 15 -13 15 -11 0 18 -10 18 -17 42 -17 53 0 26 58 110 76 110 21 0 27 -38 10 -62 -20 -28 -20 -67 -1 -92 18 -23 19 -16 4 17 -9 20 -8 30 7 53 14 21 19 47 19 98 l0 70 69 56 69 56 22 -20 c13 -12 44 -39 70 -60 l47 -40 -5 -57 c-4 -45 -1 -66 14 -93 14 -27 17 -41 9 -61 -14 -37 -12 -44 5 -15 18 32 18 54 0 89 -12 25 -12 31 0 47 14 18 15 18 40 -11 14 -16 32 -43 41 -58 14 -26 14 -32 -5 -70 l-20 -41 22 22 c35 35 31 116 -8 171 -16 23 -43 66 -60 96 -16 29 -50 70 -75 90 -55 45 -69 69 -69 115 0 19 3 28 6 20 16 -40 66 -99 112 -130 38 -26 54 -44 61 -71 6 -20 20 -44 32 -55 21 -19 21 -19 13 1 -13 32 -18 65 -10 65 9 0 68 -41 77 -55 4 -5 8 -32 8 -58 0 -53 16 -92 51 -122 21 -19 21 -17 -4 26 -26 45 -33 82 -21 126 l6 22 52 -20 c28 -11 58 -30 67 -42 17 -21 17 -21 12 7 -5 22 -18 33 -66 57 -34 16 -73 40 -87 52 -14 13 -55 45 -92 72 -106 76 -148 149 -148 254 l1 56 20 -59 c26 -75 67 -135 121 -177 24 -19 67 -60 97 -92 60 -65 81 -70 31 -7 -35 44 -27 51 31 25 45 -19 71 -43 98 -87 18 -30 32 -40 77 -53 42 -12 59 -23 74 -48 11 -18 20 -27 20 -21 0 30 -47 79 -86 89 -48 12 -74 31 -74 54 0 9 -7 26 -15 38 -14 21 -14 21 28 16 87 -10 134 -32 177 -83 48 -58 99 -81 53 -24 -98 121 -118 134 -241 149 -75 10 -179 65 -240 127 -29 29 -52 56 -52 60 0 5 22 -8 49 -27 68 -49 157 -83 275 -106 54 -11 118 -28 140 -38 49 -21 106 -68 106 -86 0 -16 39 -64 40 -48 0 6 -4 15 -10 18 -21 13 -8 23 28 20 20 -1 28 -1 16 2 -12 2 -41 27 -66 56 -56 64 -115 98 -237 132 -195 54 -334 158 -407 304 -26 50 -29 66 -29 151 0 74 4 103 19 130 77 143 214 202 324 140 25 -14 53 -40 63 -60 l20 -35 -5 39 c-6 45 -48 102 -96 130 -51 30 -137 25 -211 -11 -32 -16 -59 -28 -59 -25 0 2 16 26 36 53 59 81 156 162 248 207 74 37 98 44 169 49 102 7 171 -8 227 -48 30 -22 40 -36 40 -57 0 -21 2 -24 10 -12 9 13 12 12 23 -5 49 -81 47 -190 -6 -233 -23 -20 -67 -3 -87 34 -20 36 -54 54 -103 54 l-38 0 16 -30 c21 -40 56 -61 96 -59 19 2 45 -3 58 -10 36 -20 10 -36 -57 -36 -50 0 -63 4 -100 33 -23 19 -54 54 -68 78 -23 38 -25 48 -15 72 17 40 47 57 67 37 30 -30 74 -19 121 30 24 25 43 49 43 54 0 14 -74 21 -113 10 -22 -6 -44 -21 -55 -37 -9 -15 -33 -43 -53 -63 l-36 -36 -29 23 c-26 22 -48 32 -97 48 -15 5 -16 9 -7 26 8 15 17 19 31 15 10 -4 27 -4 37 -1 19 6 58 64 49 73 -13 12 -78 -21 -101 -52 -17 -21 -57 -49 -111 -75 -46 -23 -90 -48 -96 -56 -17 -21 -4 -17 37 11 94 64 244 0 284 -120 24 -74 -17 -155 -79 -155 -24 0 -34 7 -46 31 -13 24 -22 30 -43 27 -21 -2 -30 -11 -38 -38 -7 -19 -10 -37 -9 -38 2 -2 19 2 39 9 27 10 41 10 61 1 14 -7 35 -12 45 -12 24 0 26 -13 5 -30 -12 -10 -24 -10 -55 -1 -57 17 -108 0 -167 -54 -58 -53 -50 -65 43 -65 65 0 118 25 139 66 13 25 95 100 95 86 0 -25 -21 -63 -54 -96 -20 -19 -36 -40 -36 -47 0 -14 65 -79 79 -79 8 0 10 11 4 38 -9 45 -6 118 6 141 8 14 11 12 20 -10 5 -15 9 -42 9 -60 -1 -25 7 -40 35 -66 51 -46 71 -44 62 4 -10 55 -23 73 -60 89 -44 18 -54 62 -31 130 9 26 16 56 16 66 0 27 18 22 39 -13 10 -17 20 -26 22 -20 3 7 17 6 44 -3 56 -20 106 -22 133 -7 13 7 26 11 28 8 3 -2 0 -25 -7 -51 -11 -44 -41 -79 -110 -127 -36 -25 -17 -75 46 -117 44 -30 50 -32 53 -15 2 17 -17 99 -32 134 -4 9 1 25 13 40 24 28 34 20 51 -43 12 -43 73 -99 124 -115 19 -6 37 -9 39 -6 9 8 -14 88 -34 120 -26 42 -51 55 -97 51 -34 -3 -37 -1 -40 26 -4 32 24 116 39 116 5 0 9 -13 9 -30 0 -22 12 -42 44 -75 25 -25 53 -45 63 -45 10 0 33 -9 51 -20 l32 -20 0 33 c-1 52 -19 67 -83 67 -48 0 -58 4 -76 26 -23 29 -27 74 -10 105 12 24 29 16 29 -15 0 -24 38 -66 59 -66 8 0 11 6 7 16 -3 9 -6 22 -6 29 0 7 -16 23 -36 34 -32 19 -35 25 -28 49 4 15 10 51 13 80 l6 53 23 -17 c22 -15 23 -21 17 -70 -9 -72 29 -149 49 -98 12 32 6 82 -14 107 -28 36 -25 56 4 28 30 -28 51 -103 36 -131 -17 -32 -11 -58 20 -92 25 -28 31 -31 40 -18 13 20 3 71 -19 95 -11 11 -23 40 -29 65 -5 25 -13 53 -17 64 -7 16 -5 17 12 8 32 -17 41 -35 45 -82 3 -41 7 -48 52 -78 27 -18 53 -29 57 -25 11 11 -5 88 -25 118 -15 23 -31 30 -62 26 -6 -1 -19 10 -28 24 l-16 25 47 0 c30 0 60 -7 81 -20 l32 -20 0 28 c0 36 -26 72 -52 72 -11 0 -33 -11 -50 -25 -33 -28 -75 -32 -104 -10 -16 13 -16 14 -1 9 26 -9 21 18 -7 46 -28 25 -62 21 -52 -6 5 -14 4 -15 -9 -4 -16 13 -85 104 -85 112 0 3 18 1 39 -5 25 -7 43 -19 50 -34 6 -13 15 -23 20 -23 6 0 1 15 -10 34 l-20 34 29 10 c48 17 62 38 62 98 0 30 -3 54 -7 54 -4 0 -27 -19 -50 -42 -36 -35 -43 -49 -43 -80 0 -21 -5 -38 -11 -38 -5 0 -7 5 -4 10 4 6 -8 10 -29 10 -37 0 -177 66 -183 87 -6 19 209 83 276 83 84 0 99 -7 126 -59 20 -41 83 -95 86 -74 7 47 -21 109 -53 118 -122 32 -131 38 -92 58 27 14 31 13 53 -4 34 -27 93 -24 152 8 27 14 48 31 46 36 -1 5 -25 19 -52 29 -63 25 -121 19 -151 -15 -11 -14 -32 -32 -45 -40 -28 -18 -152 -50 -147 -37 2 4 34 40 71 80 l68 72 55 -7 c53 -6 56 -5 89 28 49 49 46 61 -12 54 -37 -4 -54 -12 -73 -35 -21 -24 -70 -50 -70 -36 0 2 14 33 31 69 29 62 30 67 15 90 -9 13 -25 29 -36 35 -19 10 -20 8 -20 -35 0 -31 5 -47 15 -51 20 -8 18 -31 -4 -73 -20 -37 -25 -34 -35 21 -9 49 -86 107 -86 64 0 -39 23 -77 51 -83 25 -5 29 -10 29 -40 0 -26 -10 -44 -45 -82 -79 -85 -191 -131 -318 -131 l-68 0 38 38 c21 20 55 58 76 85 50 62 77 68 142 33 l50 -28 -29 30 c-16 17 -42 34 -57 37 -16 4 -29 10 -29 13 0 12 90 64 123 72 31 8 31 8 5 9 -33 1 -35 11 -8 36 25 22 27 90 4 123 -22 32 -32 27 -44 -20 -9 -31 -9 -52 0 -85 10 -34 10 -46 0 -58 -18 -22 -27 -19 -33 13 -4 17 -16 33 -32 40 -34 16 -35 15 -35 -9 0 -29 18 -59 35 -59 23 0 18 -13 -18 -41 -52 -41 -52 -41 -53 26 0 46 -7 77 -26 115 l-26 51 26 31 c51 61 145 84 218 53 19 -8 41 -12 50 -8 9 3 28 -6 47 -24 45 -43 69 -53 126 -53 56 0 60 5 31 42 -29 38 -93 61 -136 49 -44 -12 -139 15 -110 31 10 6 28 7 41 4 38 -10 84 13 114 58 16 23 31 51 33 61 2 17 -2 20 -27 17 -102 -8 -154 -41 -156 -95 l-1 -32 -13 35 c-18 46 -18 60 -1 60 22 0 46 40 46 77 0 41 -9 41 -49 4 -36 -34 -37 -45 -14 -118 19 -62 13 -72 -42 -73 -16 -1 -48 -7 -70 -15 -50 -18 -50 -18 -34 2 12 14 10 14 -13 -1 -28 -18 -28 -18 -28 5 0 12 8 32 18 43 16 20 16 20 -2 6 -17 -14 -18 -12 -14 30 3 25 8 54 12 65 4 11 0 7 -9 -8 -11 -18 -18 -57 -20 -106 -1 -54 -8 -86 -20 -105 -18 -27 -18 -27 -39 -8 -29 27 -78 51 -123 60 l-38 8 46 31 c26 18 52 46 59 63 13 32 8 96 -9 113 -7 7 -7 -2 0 -26 12 -43 -6 -91 -46 -120 -23 -16 -176 -79 -181 -74 -5 4 52 170 69 203 16 32 38 43 92 45 30 2 30 2 -5 9 l-35 7 28 11 c32 13 76 6 84 -13 8 -22 60 -38 98 -31 41 8 43 14 14 45 -33 35 -63 42 -108 26 -54 -19 -60 -7 -9 22 35 20 46 22 71 13 17 -5 42 -10 57 -10 15 0 49 -11 75 -25 27 -13 50 -23 51 -22 1 1 -1 18 -5 37 -4 23 -16 40 -33 50 -24 13 -30 13 -65 -6 -30 -17 -45 -19 -70 -12 -28 7 -33 13 -33 39 0 17 -4 38 -9 48 -7 13 -3 32 14 69 l24 52 -22 0 c-49 0 -91 -64 -56 -86 6 -3 17 -21 25 -40 19 -46 4 -75 -56 -108 -59 -32 -65 -32 -44 -1 32 48 -2 23 -71 -54 l-70 -77 -24 59 -24 60 24 18 c13 10 35 19 49 19 33 0 66 24 85 61 15 28 14 29 -5 29 -38 0 -88 -28 -103 -57 -22 -41 -55 -70 -61 -52 -29 87 -33 156 -11 199 13 25 22 30 53 31 30 2 32 3 10 6 -16 2 -28 8 -28 13 0 18 -26 -1 -44 -32 l-19 -31 -18 24 c-10 13 -19 31 -19 39 0 13 -2 13 -9 1 -8 -13 -12 -13 -27 0 -11 9 -15 9 -10 2 11 -19 -68 -17 -104 2 -28 14 -30 14 -30 -3 0 -10 5 -23 12 -30 15 -15 54 -16 63 -2 12 19 63 10 92 -15 31 -27 20 -31 -37 -15 -46 13 -99 -2 -134 -39 l-28 -29 41 -7 c54 -9 94 1 121 31 25 26 58 32 64 12 3 -7 7 -38 9 -70 l5 -56 -41 19 c-44 19 -108 24 -142 9 -15 -6 -8 -9 28 -9 52 -1 110 -26 143 -63 45 -49 59 -89 59 -173 0 -69 -4 -89 -31 -145 -17 -36 -55 -94 -86 -130 -69 -83 -93 -122 -139 -233 l-36 -89 -8 164 c-8 191 0 232 52 278 39 34 85 39 123 13 l25 -16 -24 26 c-47 52 -126 44 -181 -19 -33 -38 -38 -32 -15 22 8 19 12 41 8 50 -9 24 36 109 71 135 17 13 51 26 76 30 l45 6 -54 2 c-52 1 -57 -1 -93 -40 -46 -49 -49 -46 -8 6 32 41 36 64 19 114 -13 38 -21 39 -48 4 -31 -38 -36 -71 -18 -107 15 -29 15 -37 -2 -111 l-17 -80 -11 258 c-6 142 -14 261 -17 264 -16 16 -20 -27 -25 -260 l-6 -252 -19 60 c-11 33 -23 64 -27 69 -4 4 1 22 12 40 10 17 19 43 19 58 0 25 -43 88 -60 88 -4 0 -13 -20 -19 -45 -9 -37 -9 -51 4 -75 9 -17 20 -30 25 -30 6 0 10 -5 10 -12 0 -17 -60 43 -61 61 0 11 -2 12 -6 4 -3 -8 -25 -14 -56 -14 l-52 -2 47 -6 c26 -4 60 -16 75 -27 30 -22 73 -97 73 -127 0 -28 -20 -10 -40 38 -19 43 -66 87 -108 100 -20 6 -23 4 -18 -12 3 -10 8 -30 12 -46 8 -36 58 -77 94 -77 20 0 35 -8 48 -27 23 -33 47 -102 38 -110 -3 -4 -6 -1 -6 5 0 24 -63 82 -100 92 -44 12 -110 -5 -118 -30 -4 -12 -2 -13 9 -2 7 6 31 12 52 12 31 0 46 -7 72 -33 50 -50 58 -96 50 -281 l-7 -159 -18 49 c-45 124 -85 195 -161 282 -55 63 -87 122 -105 193 -20 76 -13 134 21 206 21 43 35 56 77 77 35 18 68 26 102 26 37 0 47 3 36 10 -25 16 -112 11 -159 -10 l-43 -20 6 22 c3 13 6 40 6 60 0 28 6 40 21 49 18 9 26 6 51 -18 26 -24 37 -28 88 -28 33 1 62 4 66 8 5 4 -4 20 -19 35 -26 25 -34 27 -107 27 -44 -1 -80 2 -80 5 0 4 9 15 20 25 19 17 30 17 117 -1 26 -5 32 -3 38 16 9 29 0 36 -30 22 -14 -7 -40 -12 -56 -12 -47 0 -30 24 20 28 35 3 45 9 61 35 22 35 27 97 9 97 -29 0 -78 -43 -93 -81 -22 -54 -76 -101 -76 -66 0 7 14 26 30 42 25 24 30 36 30 77 0 26 -4 48 -9 48 -5 0 -23 -16 -41 -36z m-565 -713 c22 -10 53 -33 69 -50 l30 -31 -24 -42 c-17 -30 -26 -65 -30 -116 l-5 -74 -47 38 c-41 34 -45 40 -28 46 21 8 40 38 40 63 0 12 -6 15 -22 10 -30 -9 -58 -42 -51 -60 8 -23 -15 -18 -27 5 -7 14 -8 26 0 39 20 38 1 169 -23 154 -6 -4 -7 -1 -2 7 4 7 2 16 -6 21 -28 17 86 8 126 -10z m355 -57 c96 -19 185 -122 259 -301 61 -149 112 -426 64 -350 -19 30 -113 102 -173 132 -71 36 -103 65 -119 108 -35 91 28 197 117 197 37 0 46 -10 25 -25 -26 -19 -3 -65 32 -65 33 0 33 27 -1 68 -37 44 -82 57 -129 37 -21 -8 -39 -15 -41 -15 -9 0 -3 89 6 92 12 4 20 62 10 78 -5 8 -14 3 -28 -14 -16 -22 -18 -32 -11 -64 14 -61 10 -92 -17 -148 -26 -54 -30 -121 -10 -166 11 -25 -8 -23 -70 6 -67 31 -128 86 -153 140 -36 73 -23 184 27 239 32 36 121 70 162 61 8 -1 31 -6 50 -10z m1131 -8 c103 -43 146 -187 86 -289 -14 -24 -43 -59 -63 -77 -37 -32 -127 -80 -151 -80 -15 0 -17 16 -3 25 21 13 11 114 -16 166 -29 58 -32 89 -14 143 11 34 10 39 -11 62 -31 33 -39 30 -39 -16 0 -25 6 -42 16 -48 13 -7 14 -13 4 -31 -6 -13 -9 -29 -6 -36 7 -20 -5 -26 -21 -10 -20 21 -77 18 -104 -4 l-24 -20 42 6 c53 7 94 -20 117 -77 21 -54 20 -93 -4 -140 -16 -31 -35 -47 -99 -80 -43 -23 -106 -66 -139 -96 -33 -29 -62 -54 -65 -54 -8 0 20 152 42 231 45 160 109 283 189 364 26 27 61 54 77 61 40 18 144 17 186 0z"/>
                        
                        <path className={styles['leaf']} d="M1987 2324 c-11 -11 20 -59 47 -74 31 -16 41 -9 32 24 -11 43 -57 72 -79 50z"/>
                        <path className={styles['leaf']} d="M2233 2203 c-22 -8 -15 -21 33 -58 52 -39 101 -46 128 -19 21 20 20 26 -5 58 -18 23 -27 26 -82 25 -34 0 -68 -3 -74 -6z"/>
                        <path className={styles['leaf']} d="M2226 2117 c-18 -66 7 -160 52 -200 20 -19 21 -18 31 20 6 21 11 51 11 66 0 37 -33 100 -63 120 -24 15 -25 15 -31 -6z"/>
                        <path className={styles['leaf']} d="M2514 1918 c12 -74 70 -139 145 -163 24 -7 24 -6 18 40 -11 80 -47 119 -141 155 l-29 11 7 -43z"/>
                        <path className={styles['leaf']} d="M3455 2213 c-47 -11 -71 -63 -43 -91 18 -18 66 -14 107 9 40 22 68 57 54 69 -11 10 -92 18 -118 13z"/>
                        <path className={styles['leaf']} d="M3527 2102 c-39 -40 -50 -86 -36 -149 6 -29 15 -53 20 -53 5 0 23 21 40 48 26 42 29 54 27 111 -2 36 -8 66 -13 68 -6 2 -23 -9 -38 -25z"/>
                        <path className={styles['leaf']} d="M3173 2025 c-6 -11 -14 -35 -18 -52 -8 -39 11 -45 40 -13 17 19 17 23 3 52 -14 30 -16 31 -25 13z"/>
                        <path className={styles['leaf']} d="M3235 1941 c-23 -10 -53 -32 -67 -49 -25 -30 -55 -129 -42 -141 12 -12 100 47 126 85 27 38 49 124 32 124 -5 0 -27 -9 -49 -19z"/>
                        <path className={styles['leaf']} d="M3137 3074 c-18 -18 -6 -84 20 -114 25 -30 27 -31 40 -14 23 31 15 68 -20 102 -18 18 -36 29 -40 26z"/>
                        <path className={styles['leaf']} d="M3010 3027 c0 -59 29 -97 74 -97 42 0 47 5 35 40 -11 29 -36 56 -81 85 l-28 17 0 -45z"/>
                        <path className={styles['leaf']} d="M3288 3038 c-38 -36 -46 -62 -28 -103 5 -11 9 -15 9 -9 1 6 12 16 25 22 26 12 41 57 34 102 -3 23 -4 23 -40 -12z"/>
                        <path className={styles['leaf']} d="M2330 3026 c0 -26 25 -79 46 -98 14 -12 35 -16 80 -15 56 2 60 3 40 16 -12 8 -42 34 -68 58 -26 24 -51 43 -57 43 -5 0 -16 3 -25 6 -11 4 -16 1 -16 -10z"/>
                        <path className={styles['leaf']} d="M3411 3020 c-24 -11 -50 -28 -57 -38 -19 -24 -13 -66 9 -70 51 -10 85 22 108 100 9 34 1 35 -60 8z"/>
                        <path className={styles['leaf']} d="M2800 2893 c0 -45 21 -76 49 -71 28 6 23 36 -13 75 l-35 38 -1 -42z"/>
                        <path className={styles['leaf']} d="M2968 2903 c-33 -37 -39 -57 -24 -79 12 -16 14 -16 34 4 15 15 22 34 22 62 0 22 -1 40 -3 40 -2 0 -15 -12 -29 -27z"/>
                        <path className={styles['leaf']} d="M2050 2877 c0 -13 7 -46 15 -75 18 -58 55 -95 94 -90 22 3 26 9 29 41 4 47 -23 88 -82 122 -52 31 -56 31 -56 2z"/>
                        <path className={styles['leaf']} d="M3695 2871 c-51 -32 -78 -67 -79 -107 -1 -47 19 -62 60 -43 33 16 59 64 69 127 8 48 -2 53 -50 23z"/>
                        <path className={styles['leaf']} d="M2317 2868 c-35 -12 -31 -26 13 -50 56 -30 110 -20 110 20 0 36 -64 52 -123 30z"/>
                        <path className={styles['leaf']} d="M3290 2860 c-6 -12 -8 -29 -5 -40 3 -11 -1 -30 -11 -45 -9 -14 -14 -28 -10 -32 3 -3 6 -2 6 4 0 6 14 27 30 48 32 40 40 85 15 85 -8 0 -19 -9 -25 -20z"/>
                        <path className={styles['leaf']} d="M3378 2867 c-34 -13 -36 -31 -6 -51 30 -21 61 -20 108 4 47 24 49 33 15 48 -31 14 -80 14 -117 -1z"/>
                        <path className={styles['leaf']} d="M2268 2775 c-24 -33 -23 -72 3 -85 16 -9 25 -8 40 6 23 21 24 36 4 74 -19 36 -25 37 -47 5z"/>
                        <path className={styles['leaf']} d="M3486 2764 c-15 -33 -15 -38 -1 -60 26 -40 65 -24 65 26 0 26 -24 70 -39 70 -4 0 -15 -16 -25 -36z"/>
                        <path className={styles['leaf']} d="M3293 2748 c-19 -22 -20 -68 -3 -68 17 0 33 46 23 65 -8 13 -12 14 -20 3z"/>
                        <path className={styles['leaf']} d="M2485 2729 c-5 -15 -1 -28 15 -43 l21 -21 -3 39 c-3 44 -23 59 -33 25z"/>
                        <path className={styles['leaf']} d="M2830 2711 c0 -35 26 -62 36 -36 7 17 -13 65 -28 65 -4 0 -8 -13 -8 -29z"/>
                        <path className={styles['leaf']} d="M2945 2716 c-8 -13 -13 -31 -9 -40 6 -16 8 -16 25 0 20 18 26 64 9 64 -5 0 -16 -11 -25 -24z"/>
                        <path className={styles['leaf']} d="M2670 2669 c-27 -11 -70 -48 -70 -60 0 -13 46 -18 81 -9 34 10 88 55 77 65 -11 11 -65 14 -88 4z"/>
                        <path className={styles['leaf']} d="M3040 2656 c0 -35 118 -79 150 -56 13 9 10 15 -18 40 -27 25 -41 30 -82 30 -37 0 -50 -4 -50 -14z"/>
                        <path className={styles['leaf']} d="M2137 2608 l-32 -33 44 -3 c59 -4 83 3 99 29 17 27 3 39 -46 39 -25 0 -42 -9 -65 -32z"/>
                        <path className={styles['leaf']} d="M2420 2622 c0 -11 9 -27 20 -37 19 -17 20 -17 20 -1 0 23 -18 56 -30 56 -6 0 -10 -8 -10 -18z"/>
                        <path className={styles['leaf']} d="M3358 2620 c-19 -26 -23 -50 -9 -50 16 0 33 29 29 52 l-3 23 -17 -25z"/>
                        <path className={styles['leaf']} d="M2290 2530 c0 -67 34 -114 98 -134 19 -6 22 -4 22 18 0 55 -38 114 -92 142 l-28 15 0 -41z"/>
                        <path className={styles['leaf']} d="M2550 2560 c0 -17 56 -70 74 -70 23 0 20 23 -6 47 -28 26 -68 39 -68 23z"/>
                        <path className={styles['leaf']} d="M3211 2557 c-13 -7 -31 -22 -39 -34 -14 -22 -13 -23 9 -23 30 0 43 9 58 37 14 27 2 35 -28 20z"/>
                        <path className={styles['leaf']} d="M3454 2538 c-40 -35 -64 -82 -64 -123 0 -29 10 -31 50 -10 47 25 70 62 70 116 0 27 -4 49 -10 49 -5 0 -26 -15 -46 -32z"/>
                        <path className={styles['leaf']} d="M1976 2524 c-14 -36 -6 -104 14 -124 37 -37 70 -22 70 34 0 21 -57 106 -71 106 -4 0 -10 -7 -13 -16z"/>
                        <path className={styles['leaf']} d="M2121 2518 c29 -57 64 -73 90 -42 11 14 10 20 -14 40 -16 14 -41 24 -58 24 -28 0 -29 -2 -18 -22z"/>
                        <path className={styles['leaf']} d="M3059 2517 c-19 -12 -42 -38 -51 -56 -9 -19 -22 -39 -27 -44 -17 -17 -13 -28 7 -18 9 5 36 14 60 21 37 10 46 18 63 53 10 23 19 48 19 55 0 19 -34 14 -71 -11z"/>
                        <path className={styles['leaf']} d="M3605 2516 c-39 -39 -13 -70 40 -50 14 6 45 53 45 69 0 16 -64 2 -85 -19z"/>
                        <path className={styles['leaf']} d="M3771 2493 c-33 -50 -39 -84 -17 -102 17 -14 61 1 70 24 8 21 8 88 0 109 -10 25 -20 19 -53 -31z"/>
                        <path className={styles['leaf']} d="M2606 2447 c-17 -22 -26 -46 -26 -70 0 -39 8 -67 19 -67 15 0 53 82 54 116 2 53 -16 62 -47 21z"/>
                        <path className={styles['leaf']} d="M3149 2453 c-7 -20 -7 -38 0 -63 14 -43 47 -84 61 -75 19 12 11 97 -12 132 -28 40 -35 41 -49 6z"/>
                        <path className={styles['leaf']} d="M2154 2408 c10 -52 33 -80 64 -76 23 2 27 8 27 33 0 22 -8 35 -34 52 -49 33 -65 31 -57 -9z"/>
                        <path className={styles['leaf']} d="M3589 2417 c-26 -17 -34 -30 -34 -52 0 -25 4 -31 27 -33 30 -4 52 22 63 76 8 40 -7 42 -56 9z"/>
                        <path className={styles['leaf']} d="M3757 2312 c-9 -10 -20 -33 -23 -51 l-7 -33 31 16 c26 14 62 60 62 81 0 13 -48 3 -63 -13z"/>
                        <path className={styles['leaf']} d="M3935 2275 c-8 -57 7 -82 31 -50 16 22 11 61 -10 83 -11 11 -15 6 -21 -33z"/>
                        <path className={styles['leaf']} d="M2704 2266 c-8 -48 2 -88 38 -137 38 -52 52 -41 53 39 0 49 -5 65 -28 95 -35 46 -54 47 -63 3z"/>
                        <path className={styles['leaf']} d="M3034 2263 c-24 -32 -29 -47 -29 -95 1 -80 15 -90 54 -37 34 48 46 92 36 138 -9 41 -26 39 -61 -6z"/>
                        <path className={styles['leaf']} d="M1570 2115 c0 -17 37 -63 62 -76 11 -6 36 -8 58 -4 l38 6 -32 35 c-23 24 -44 36 -78 43 -36 6 -48 5 -48 -4z"/>
                        <path className={styles['leaf']} d="M1864 2061 c-48 -29 -49 -39 -6 -52 34 -10 45 -8 85 9 51 23 58 36 28 52 -30 15 -73 12 -107 -9z"/>
                        <path className={styles['leaf']} d="M3830 2069 l-25 -10 30 -25 c37 -29 81 -39 118 -25 37 14 34 27 -13 51 -43 22 -72 24 -110 9z"/>
                        <path className={styles['leaf']} d="M1961 1951 c-18 -11 -11 -22 38 -55 30 -21 48 -27 82 -24 23 2 44 8 46 15 3 7 -15 26 -38 42 -43 31 -98 41 -128 22z"/>
                        <path className={styles['leaf']} d="M3728 1939 c-37 -19 -63 -51 -51 -63 3 -3 25 -6 48 -6 31 0 53 8 83 30 45 32 51 44 26 54 -28 11 -68 5 -106 -15z"/>
                        <path className={styles['leaf']} d="M1756 1807 c-14 -74 18 -131 71 -125 23 2 29 8 31 35 3 26 -5 41 -39 78 -23 25 -45 45 -49 45 -4 0 -11 -15 -14 -33z"/>
                        <path className={styles['leaf']} d="M3848 1789 c-21 -17 -38 -35 -38 -40 0 -5 18 -9 39 -9 42 0 71 26 71 62 0 27 -30 21 -72 -13z"/>
                        <path className={styles['leaf']} d="M1918 1789 c-10 -5 -18 -21 -18 -34 0 -20 5 -25 24 -25 24 0 86 44 86 61 0 12 -71 11 -92 -2z"/>
                        <path className={styles['leaf']} d="M2325 1669 c16 -31 50 -50 73 -42 7 3 20 -1 29 -8 13 -11 12 -6 -4 21 -24 38 -56 60 -91 60 -22 0 -22 -1 -7 -31z"/>
                        <path className={styles['leaf']} d="M4110 1679 c-14 -5 -34 -23 -43 -39 -13 -21 -27 -30 -45 -31 -27 -2 -27 -2 -2 -6 14 -2 39 -11 57 -20 31 -16 33 -16 70 10 33 23 73 73 73 91 0 9 -82 6 -110 -5z"/>
                        <path className={styles['leaf']} d="M2005 1586 c3 -10 0 -34 -6 -53 -6 -21 -8 -54 -4 -81 l7 -47 34 38 c43 47 48 103 10 113 -13 3 -29 15 -35 27 -9 16 -10 17 -6 3z"/>
                        <path className={styles['leaf']} d="M3785 1581 c-3 -11 -16 -21 -28 -23 -34 -5 -34 -51 -1 -99 15 -21 31 -39 35 -39 14 0 22 49 14 88 -4 20 -8 49 -8 65 0 32 -3 34 -12 8z"/>
                        <path className={styles['leaf']} d="M1795 1460 c-13 -15 -16 -30 -13 -65 7 -59 15 -66 38 -35 26 33 34 74 20 99 -13 26 -22 26 -45 1z"/>
                        <path className={styles['leaf']} d="M2099 1455 c-15 -8 -31 -27 -37 -43 -9 -28 -9 -28 30 -31 33 -2 45 4 74 33 19 19 34 39 34 45 0 16 -70 13 -101 -4z"/>
                        <path className={styles['leaf']} d="M3586 1275 c-20 -20 -20 -55 -2 -100 19 -45 33 -44 45 3 15 54 13 77 -8 96 -17 16 -20 16 -35 1z"/>
                        <path className={styles['leaf']} d="M3718 1265 c-29 -16 -57 -80 -41 -96 17 -17 73 45 73 80 0 17 -1 31 -2 31 -2 -1 -15 -7 -30 -15z"/>
                        <path className={styles['leaf']} d="M1765 1206 c-9 -14 -15 -37 -13 -51 l3 -27 48 42 c26 23 47 46 47 51 0 5 -16 9 -35 9 -26 0 -39 -6 -50 -24z"/>
                    </g>
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
              <>
                <div className={styles['input-group']}>
                  <input type="text" placeholder="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className={styles['input-group']}>
                  <input type="text" placeholder="Middle Name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className={styles['input-group']}>
                  <input type="text" placeholder="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </>
            )}
            {!isLogin && (
              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Teacher Code (Optional)</label>
                <input type="text" placeholder="Leave blank if you are a student." value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} />
                <span className={styles['helper-text']}>Only required for teacher accounts.</span>
              </div>
            )}
            <div className={styles['input-group']}>
              <label className={styles['input-label']}>Usertag</label>
              <input type="text" placeholder="Usertag" required maxLength={15} value={usertag} onChange={(e) => setUsertag(e.target.value)} />
              {!isUsertagValid && (
                <span className={styles['helper-text']} style={{color: '#ef4444'}}>Only letters, numbers, and underscores allowed.</span>
              )}
            </div>
            {!isLogin && (
              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Email</label>
                <input type="email" placeholder="Email (@gmail.com)" required value={email} onChange={(e) => setEmail(e.target.value)} />
                {!isEmailValid && (
                  <span className={styles['helper-text']} style={{color: '#ef4444'}}>Only @gmail.com emails are allowed.</span>
                )}
              </div>
            )}
            <div className={styles['input-group']}>
              <input type="password" placeholder={!isLogin ? "Create Password" : "Password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {!isLogin && (
              <div className={styles['input-group']}>
                <input type="password" placeholder="Confirm Password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            )}
            <button type="submit" className={`${styles['submit-btn']} ${isLogin ? styles['signin-btn'] : ''}`} disabled={isLoading || (!isLogin && !isEmailValid) || !isUsertagValid}>
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
