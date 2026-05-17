import React from 'react';
import styles from '../dashboard.module.css';

export default function Sidebar({ currentPage, setCurrentPage, isSidebarOpen, closeSidebar, userRole }) {
  return (
    <aside className={`${styles['sidebar']} ${!isSidebarOpen ? styles['hidden'] : ''}`}>

      {/* Mobile Close Button */}
      <button className={styles['mobileCloseBtn']} onClick={closeSidebar}>
        <i className="fa-solid fa-xmark"></i>
      </button>

      {/* Logo */}
      <div className={styles['sidebar-header']}>
        <div
          className={styles['brand']}
          onClick={() => setCurrentPage('home')}
          style={{ cursor: 'pointer' }}
        >
          BRIGHTIFY
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={styles['sidebar-nav']}>
        <ul className={styles['nav-list']}>

          <li>
            <button
              onClick={() => setCurrentPage('home')}
              className={`${styles['nav-btn']} ${currentPage === 'home' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-house"></i>
              <span>Home</span>
            </button>
          </li>

          {userRole === 'teacher' && (
            <li>
              <button
                onClick={() => setCurrentPage('classroom')}
                className={`${styles['nav-btn']} ${currentPage === 'classroom' ? styles['active'] : ''}`}
              >
                <i className="fa-solid fa-chalkboard-user"></i>
                <span>Classroom</span>
              </button>
            </li>
          )}

          <li>
            <button
              onClick={() => setCurrentPage('stacks')}
              className={`${styles['nav-btn']} ${currentPage === 'stacks' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>Stacks</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('portfolio')}
              className={`${styles['nav-btn']} ${currentPage === 'portfolio' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-folder-open"></i>
              <span>Portfolio</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('throne')}
              className={`${styles['nav-btn']} ${currentPage === 'throne' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-crown"></i>
              <span>Throne &amp; Drops</span>
            </button>
          </li>

       <li>
              <button
                onClick={() => setCurrentPage('duels')}
                className={`${styles['nav-btn']} ${currentPage === 'duels' ? styles['active'] : ''}`}
              >
                <i className="fa-solid fa-shield-halved"></i>
                <span>Duels</span>
              </button>
            </li>
          <li>
            <button
              onClick={() => setCurrentPage('analytics')}
              className={`${styles['nav-btn']} ${currentPage === 'analytics' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>Analytics</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('friends')}
              className={`${styles['nav-btn']} ${currentPage === 'friends' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-user-group"></i>
              <span>Friends</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('calendar')}
              className={`${styles['nav-btn']} ${currentPage === 'calendar' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-calendar-days"></i>
              <span>Calendar</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('achievements')}
              className={`${styles['nav-btn']} ${currentPage === 'achievements' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-trophy"></i>
              <span>Achievements</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('challenges')}
              className={`${styles['nav-btn']} ${currentPage === 'challenges' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-bullseye"></i>
              <span>Challenges</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('timer')}
              className={`${styles['nav-btn']} ${currentPage === 'timer' ? styles['active'] : ''} ${styles['pomodoro-btn']}`}
            >
              <i className="fa-solid fa-stopwatch"></i>
              <span>Focus Timer</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setCurrentPage('memory-map')}
              className={`${styles['nav-btn']} ${currentPage === 'memory-map' ? styles['active'] : ''}`}
            >
              <i className="fa-solid fa-tree"></i>
              <span>Memory Map</span>
            </button>
          </li>

          <li className={styles['nav-shop-container']}>
            <button
              onClick={() => setCurrentPage('shop')}
              className={`${styles['nav-btn']} ${styles['nav-shop-btn']}`}
            >
              <i className="fa-solid fa-shop"></i>
              <span>Shop</span>
            </button>
          </li>

        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className={styles['sidebar-footer']}>
        Brightify v1.0 <br /> Plant Trees with Ecosia
      </div>

    </aside>
  );
}
