import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import styles from '../dashboard.module.css';

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, streak_count')
      .eq('role', 'student');
      
    if (error) {
      console.error('Error fetching students:', error);
    } else {
      setStudents(data || []);
    }
  };

  const addStreak = async (studentId, currentStreak) => {
    const newStreak = (currentStreak || 0) + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ streak_count: newStreak })
      .eq('id', studentId);
      
    if (error) {
      console.error('Error updating streak:', error);
    } else {
      fetchStudents();
    }
  };

  return (
    <div className={styles['page-section']} style={{ padding: '2rem', width: '100%' }}>
      <h2 className={`${styles['section-heading']} ${styles['large']}`}>Classroom Dashboard</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-dim)' }}>
        Welcome, Teacher! Here you can manage your students and their progress.
      </p>
      
      <div className={styles['portfolio-table-container']}>
        <table className={styles['portfolio-table']} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Current Streak</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td className={styles['cell-title']} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className={styles['friend-avatar-mini']} style={{ margin: 0, width: '30px', height: '30px' }}>
                       <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${student.full_name || student.id}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    </div>
                    {student.full_name || 'Anonymous Student'}
                  </td>
                  <td className={styles['cell-meta']} style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                    🔥 {student.streak_count || 0}
                  </td>
                  <td>
                    <button 
                      className={styles['hero-btn']} 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', width: 'auto' }} 
                      onClick={() => addStreak(student.id, student.streak_count)}
                    >
                      +1 Streak 🔥
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-dim)' }}>
                  No students enrolled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
