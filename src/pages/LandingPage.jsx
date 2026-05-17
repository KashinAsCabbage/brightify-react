import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState('General');
  const [feedbackText, setFeedbackText] = useState('');

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    // Mock submission logic
    console.log('Feedback submitted:', { category: feedbackCategory, text: feedbackText });
    alert('Thank you for your feedback!');
    
    // Clear state
    setFeedbackCategory('General');
    setFeedbackText('');
  };

  return (
    <div className={styles.landingWrapper}>
      {/* Sticky Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>Brightify</div>
        <div className={styles.navLinks}>
          <a href="#home" className={styles.navLink}>Home</a>
          <a href="#about" className={styles.navLink}>About</a>
          <a href="#feedback" className={styles.navLink}>Feedback</a>
        </div>
      </nav>

      <div className={styles.darkOverlay}>
        
        {/* Hero Section */}
        <section id="home" className={styles.heroSection}>
          <div className={styles.icon}>🌿</div>
          <h1 className={styles.title}>Level Up Your Grades. Dominate the Arena.</h1>
          <p className={styles.subtitle}>
            Plant your roots in the ecosystem of knowledge. Turn your study reviewers into epic, real-time battles.
          </p>
          <button 
            className={styles.ctaButton}
            onClick={() => navigate('/login')}
          >
            Enter the Forest
          </button>
        </section>

        {/* About Us Section */}
        <section id="about" className={styles.aboutSection}>
          <div className={styles.aboutContent}>
            <h2 className={styles.sectionTitle}>About Us</h2>
            <p className={styles.missionStatement}>
              We are shifting the paradigm from passive memorization to active, multiplayer gamification. 
              Learning should be an adventure, not a chore.
            </p>
            <p className={styles.techStack}>
              Built with bleeding-edge tech: <strong>React, Vite, and Supabase</strong>.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.glassCard}>
              <h3 className={styles.cardTitle}>Accessible to All</h3>
              <p className={styles.cardText}>
                Education without boundaries. Free and open to everyone willing to learn.
              </p>
            </div>
            <div className={styles.glassCard}>
              <h3 className={styles.cardTitle}>Community First</h3>
              <p className={styles.cardText}>
                Learn together, grow together. Join a squad and climb the leaderboards.
              </p>
            </div>
            <div className={styles.glassCard}>
              <h3 className={styles.cardTitle}>Data-Driven</h3>
              <p className={styles.cardText}>
                Smart algorithms tailor flashcards to your exact learning needs.
              </p>
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section id="feedback" className={styles.feedbackSection}>
          <h2 className={styles.sectionTitle}>Leave Feedback</h2>
          <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.formLabel}>Category</label>
              <select 
                id="category"
                className={styles.formSelect}
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Bug">Bug</option>
                <option value="Suggestion">Suggestion</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="feedbackText" className={styles.formLabel}>Your Message</label>
              <textarea 
                id="feedbackText"
                className={styles.formTextarea}
                rows="5"
                placeholder="Tell us what you think..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              ></textarea>
            </div>

            <button type="submit" className={styles.submitButton}>
              Send Feedback
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
