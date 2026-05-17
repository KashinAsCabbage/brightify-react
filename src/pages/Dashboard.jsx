import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import MainContent from '../components/MainContent';
import TeacherDashboard from '../components/TeacherDashboard';
import BackgroundParticles from '../components/BackgroundParticles/BackgroundParticles';
import { useTheme } from '../context/ThemeContext';
import styles from '../dashboard.module.css';
import AITutor from '../components/AITutor';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('student');
  const [userProfile, setUserProfile] = useState(null); // <--- Added this
  const { theme, particlesEnabled } = useTheme();


  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const fetchProfileData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
        setUserProfile(profile);
      }
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [navigate]);

  const userStats = userProfile || {};

  return (
    <>
      {particlesEnabled && <BackgroundParticles color="#f59e0b" count={20} shape="leaf" />}
      <div className={`${styles['dashboard-body']} ${!isSidebarOpen ? styles['expanded'] : ''}`}>
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          isSidebarOpen={isSidebarOpen}
          closeSidebar={closeSidebar}
          userRole={userRole}
        />
        <main className={styles['main-content']}>
          {/* PASS THE PROFILE DATA TO TOPHEADER HERE */}
          <TopHeader 
            toggleSidebar={toggleSidebar} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            userProfile={userProfile}
            userStats={userStats}
            setCurrentPage={setCurrentPage}
            fetchProfileData={fetchProfileData}
          />
          
          {currentPage === 'classroom' ? (
            <TeacherDashboard />
          ) : (
            <MainContent currentPage={currentPage} setCurrentPage={setCurrentPage} searchQuery={searchQuery} />
          )}
        </main>
      </div>

      {/* 👇 DROP BEEBO RIGHT HERE 👇 */}
      <AITutor />
      
    </>
  );
}