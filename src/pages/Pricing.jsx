import React, { useState } from 'react';
import styles from './Pricing.module.css';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

export default function Pricing() {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = () => {
    setIsUpgrading(true);
    // Simulate loading for Stripe redirect
    setTimeout(() => {
      setIsUpgrading(false);
      // In the future, redirect to Stripe payment link here
      // window.location.href = 'YOUR_STRIPE_PAYMENT_LINK';
      alert('Redirecting to Stripe Checkout...');
    }, 1500);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
          <BackButton />
        </div>
        
        <div className={styles.headerSection}>
          <h1 className={styles.title}>Unlock Your Full Potential</h1>
          <p className={styles.subtitle}>
            Upgrade to Brightify Elite and dominate the leaderboards.
          </p>
        </div>

        <div className={styles.cardsContainer}>
          
          {/* Free Tier: Scholar */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Scholar</h2>
            <div className={styles.cardPrice}>
              $0<span className={styles.pricePeriod}>/month</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-check ${styles.featureIcon} ${styles.basicIcon}`}></i>
                Basic Study Stacks
              </li>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-check ${styles.featureIcon} ${styles.basicIcon}`}></i>
                3 Arena Duels per day
              </li>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-check ${styles.featureIcon} ${styles.basicIcon}`}></i>
                Standard Profile
              </li>
            </ul>

            <button className={`${styles.btn} ${styles.btnBasic}`} disabled>
              Current Plan
            </button>
          </div>

          {/* Premium Tier: Brightify Elite */}
          <div className={`${styles.card} ${styles.premiumCard}`}>
            <div className={styles.badge}>Most Popular</div>
            
            <h2 className={styles.cardTitle}>Brightify Elite</h2>
            <div className={styles.cardPrice}>
              $4.99<span className={styles.pricePeriod}>/month</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-bolt ${styles.featureIcon}`}></i>
                Unlimited Arena Duels
              </li>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-chart-line ${styles.featureIcon}`}></i>
                Advanced Study Analytics
              </li>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-gem ${styles.featureIcon}`}></i>
                Exclusive Cosmetic Drops
              </li>
              <li className={styles.featureItem}>
                <i className={`fa-solid fa-ban ${styles.featureIcon}`}></i>
                Ad-Free Experience
              </li>
            </ul>

            <button 
              className={`${styles.btn} ${styles.btnPremium}`}
              onClick={handleUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <div className={styles.spinner}></div>
              ) : (
                "Upgrade Now"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
