import React, { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Shop({ buzzBalance, handlePurchase, currentPage }) {
  const [treesSavedCount, setTreesSavedCount] = useState(0);
  const [currentGardenSeed, setCurrentGardenSeed] = useState(null);
  const [adoptingTree, setAdoptingTree] = useState(null);
  const [treeStats, setTreeStats] = useState({});

  useEffect(() => {
    if (currentPage === 'shop') {
      const fetchProfileData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('trees_saved_count, garden_seed').eq('id', user.id).single();
        if (data) {
          setTreesSavedCount(data.trees_saved_count || 0);
          setCurrentGardenSeed(data.garden_seed);
        }
      };

      const fetchTreeStats = async () => {
        const { data, error } = await supabase.from('global_tree_stats').select('*');
        if (!error && data) {
          const statsMap = {};
          data.forEach(stat => {
            statsMap[stat.tree_name] = stat.adoptions_left;
          });
          setTreeStats(statsMap);
        }
      };

      fetchProfileData();
      fetchTreeStats();
    }
  }, [currentPage]);

  const handleAdopt = async (price, treeName) => {
    if (currentGardenSeed && currentGardenSeed !== treeName) {
      const proceed = window.confirm(`You are already growing a ${currentGardenSeed}. Adopting a ${treeName} will replace it and reset your growth to 0 XP. Are you sure?`);
      if (!proceed) return;
    }

    setAdoptingTree(treeName);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAdoptingTree(null);
      return;
    }

    // ✨ THE FIX: parseInt(price) guarantees Postgres gets a strict number
    const { error: rpcError } = await supabase.rpc('process_tree_adoption', {
      user_id: user.id,
      tree_price: parseInt(price, 10),
      tree_name: treeName
    });

    if (rpcError) {
      toast.error(rpcError.message || 'Transaction failed!');
      setAdoptingTree(null);
      return;
    }

    toast.success(`Successfully adopted a ${treeName}! Check your garden.`);
    setCurrentGardenSeed(treeName);
    setTimeout(() => window.location.reload(), 1000);
  };

  const isRareLocked = treesSavedCount < 2;
  const shopItems = [
    { id: 'watering-can', category: 'Gardening', name: 'Extra Watering Can', icon: '💧', desc: 'Water your plant again today.', cost: 500, btnClass: 'btn-royal' },
    { id: 'super-fertilizer', category: 'Gardening', name: 'Super Fertilizer', premium: true, icon: '🧪', desc: 'Instantly grow 1 full stage.', cost: 2000, btnClass: 'btn-plum' },
    { id: 'snake-quiz', category: 'Arcade Games', name: 'Snake Quiz', icon: '🐍', desc: 'Eat the correct answers.', cost: 0, btnClass: 'btn-gray', isUnlocked: true },
    { id: 'witty-rain', category: 'Arcade Games', name: 'Witty Rain', icon: '🌧️', desc: 'Type before the term falls.', cost: 1000, btnClass: 'btn-sky', unlockAction: true }
  ];

  const renderShopItems = (categoryLabel) => {
    return shopItems
      .filter(item => item.category === categoryLabel)
      .map(item => {
        const canAfford = buzzBalance >= item.cost;
        const disabled = !canAfford && !item.isUnlocked;

        let buttonText;
        if (item.isUnlocked) {
            buttonText = 'Unlocked';
        } else if (disabled) {
            buttonText = 'Locked';
        } else if (item.unlockAction) {
            buttonText = `Unlock (${item.cost} Buzz)`;
        } else {
            buttonText = `${item.cost} Buzz`;
        }

        return (
          <div key={item.id} className={styles['shop-item']}>
              {item.premium && <div className={styles['premium-tag']}>PREMIUM</div>}
              <div className={styles['shop-icon']}>{item.icon}</div>
              <h4 className={styles['shop-item-title']}>{item.name}</h4>
              <p className={styles['shop-item-desc']}>{item.desc}</p>
              <button 
                  className={`${disabled ? styles.disabledBtn : styles.buyBtn} ${styles[item.btnClass]}`} 
                  onClick={() => !disabled && !item.isUnlocked && handlePurchase(item.cost, item.name)}
                  disabled={disabled}
              >
                  {buttonText}
              </button>
          </div>
        );
      });
  };

  return (
    <section id="shop" className={`${styles['page-section']} ${currentPage === 'shop' ? styles['fade-in'] : styles['hidden-page']}`}>
        <div className={`${styles['hero-card']} ${styles['shop-hero']}`}>
            <div className={styles['hero-content']}>
                <h2 className={styles['hero-title']}>Buzz Shop</h2>
                <p className={styles['hero-desc']}>Spend your hard-earned Buzz on games and growth.</p>
            </div>
            <div className={styles['hero-balance-container']}>
                <p className={styles['hero-balance-label']}>Your Balance</p>
                <p className={styles['hero-balance-amount']}>{buzzBalance} Buzz</p>
            </div>
        </div>

        <h3 className={`${styles['section-heading']} ${styles['mt-8']}`}>Gardening</h3>
        <div className={styles['shop-grid']}>
            {renderShopItems('Gardening')}
        </div>

        <h3 className={`${styles['section-heading']} ${styles['mt-8']}`}>Arcade Games</h3>
        <div className={styles['shop-grid']}>
            {renderShopItems('Arcade Games')}
        </div>

        
        <div className={styles['tree-shop-banner']}>
            <div className={styles['tree-shop-banner-bg']}></div>
            <div className={styles['tree-shop-banner-content']}>
                <div className={styles['tree-shop-banner-icon']}>🌿</div>
                <div>
                    <h3 className={styles['tree-shop-banner-title']}>Philippine Tree Shop</h3>
                    <p className={styles['tree-shop-banner-sub']}>Spend your Buzz to symbolically adopt native and endangered Philippine trees. Every adoption funds real reforestation efforts!</p>
                </div>
                <div className={styles['tree-shop-banner-stats']}>
                    <div className={styles['tree-banner-stat']}>
                        <span className={styles['tree-banner-stat-val']}>47</span>
                        <span className={styles['tree-banner-stat-label']}>Trees Adopted</span>
                    </div>
                    <div className={styles['tree-banner-stat']}>
                        <span className={styles['tree-banner-stat-val']}>12</span>
                        <span className={styles['tree-banner-stat-label']}>Species Saved</span>
                    </div>
                </div>
            </div>
        </div>

        
        <div className={styles['tree-filter-bar']}>
            <button className={`${styles['tree-filter-btn']} ${styles['active']}`}>🌳 All Trees</button>
            <button className={styles['tree-filter-btn']}>🔴 Endangered</button>
            <button className={styles['tree-filter-btn']}>🟢 Native</button>
            <button className={styles['tree-filter-btn']}>💜 Critically Rare</button>
        </div>

        
        <div className={styles['tree-shop-grid']} id="tree-shop-grid">

            <div className={styles['tree-card']} data-category="native" data-tree="Narra" data-locked="false" data-urgency="47">
                <div className={`${styles['tree-card-image']} ${styles['narra-bg']}`}>
                    <span className={styles['tree-emoji']}>🌳</span>
                    <div className={`${styles['tree-status-badge']} ${styles['native']}`}>Native</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Narra</h4>
                    <p className={styles['tree-sci-name']}>Pterocarpus indicus</p>
                    <p className={styles['tree-desc']}>The national tree of the Philippines, known for its golden flowers and prized hardwood. Found in primary and secondary forests across Luzon.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Luzon, Visayas</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 30m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#166534' }}>
                                ⚠️ {treeStats['Narra'] !== undefined ? treeStats['Narra'] : 47} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Narra'] !== undefined ? treeStats['Narra'] : 47}%`, background: '#166534' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 800 Buzz</div>
                        <button className={styles['tree-adopt-btn']} onClick={() => handleAdopt(800, 'Narra')} disabled={adoptingTree === 'Narra'}>
                          {adoptingTree === 'Narra' ? 'Processing...' : '🌱 Adopt'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="endangered" data-tree="Molave" data-locked="false" data-urgency="23">
                <div className={`${styles['tree-card-image']} ${styles['molave-bg']}`}>
                    <span className={styles['tree-emoji']}>🌲</span>
                    <div className={`${styles['tree-status-badge']} ${styles['endangered']}`}>Endangered</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Molave</h4>
                    <p className={styles['tree-sci-name']}>Vitex parviflora</p>
                    <p className={styles['tree-desc']}>One of the hardest and most durable Philippine timbers, now endangered due to illegal logging. Sacred in many indigenous communities.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Nationwide</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 25m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#dc2626' }}>
                                ⚠️ {treeStats['Molave'] !== undefined ? treeStats['Molave'] : 23} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Molave'] !== undefined ? treeStats['Molave'] : 23}%`, background: '#dc2626' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 1,200 Buzz</div>
                        <button className={`${styles['tree-adopt-btn']} ${styles['urgent']}`} onClick={() => handleAdopt(1200, 'Molave')} disabled={adoptingTree === 'Molave'}>
                          {adoptingTree === 'Molave' ? 'Processing...' : '🆘 Adopt Now'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="rare" data-tree="Kamagong" data-locked={isRareLocked} data-urgency="8">
                <div className={`${styles['tree-card-image']} ${styles['kamagong-bg']}`}>
                    <span className={styles['tree-emoji']}>🪵</span>
                    <div className={`${styles['tree-status-badge']} ${styles['rare']}`}>Critically Rare</div>
                    {isRareLocked && (
                      <div className={styles['tree-lock-overlay']}>
                          <div className={styles['tree-lock-content']}>
                              <i className={`${styles['fa-solid']} ${styles['fa-lock']} ${styles['tree-lock-icon']}`}></i>
                              <p className={styles['tree-lock-text']}>Adopt 2 Endangered trees first to unlock</p>
                          </div>
                      </div>
                    )}
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Kamagong</h4>
                    <p className={styles['tree-sci-name']}>Diospyros blancoi</p>
                    <p className={styles['tree-desc']}>Philippine ebony — one of the world's rarest and most valuable woods. Nearly extinct in the wild due to over-harvesting for furniture.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Palawan, Mindanao</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 20m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#7c3aed' }}>
                                ⚠️ {treeStats['Kamagong'] !== undefined ? treeStats['Kamagong'] : 8} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Kamagong'] !== undefined ? treeStats['Kamagong'] : 8}%`, background: '#7c3aed' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 2,500 Buzz</div>
                        <button 
                          className={`${styles['tree-adopt-btn']} ${styles['urgent']}`} 
                          onClick={() => handleAdopt(2500, 'Kamagong')}
                          disabled={isRareLocked || adoptingTree === 'Kamagong'}
                          style={isRareLocked ? { background: '#6b7280', cursor: 'not-allowed' } : {}}
                        >
                          {isRareLocked ? 'Locked 🔒' : (adoptingTree === 'Kamagong' ? 'Processing...' : '🆘 Adopt Now')}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="native" data-tree="Dao" data-locked="false" data-urgency="61">
                <div className={`${styles['tree-card-image']} ${styles['dao-bg']}`}>
                    <span className={styles['tree-emoji']}>🍃</span>
                    <div className={`${styles['tree-status-badge']} ${styles['native']}`}>Native</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Dao</h4>
                    <p className={styles['tree-sci-name']}>Dracontomelon dao</p>
                    <p className={styles['tree-desc']}>A majestic rainforest tree known for its wide spreading crown that provides shade for entire ecosystems. Used in traditional Filipino medicine.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Luzon, Mindanao</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 40m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#166534' }}>
                                ⚠️ {treeStats['Dao'] !== undefined ? treeStats['Dao'] : 61} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Dao'] !== undefined ? treeStats['Dao'] : 61}%`, background: '#166534' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 600 Buzz</div>
                        <button className={styles['tree-adopt-btn']} onClick={() => handleAdopt(600, 'Dao')} disabled={adoptingTree === 'Dao'}>
                          {adoptingTree === 'Dao' ? 'Processing...' : '🌱 Adopt'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="rare" data-tree="Almaciga" data-locked={isRareLocked} data-urgency="5">
                <div className={`${styles['tree-card-image']} ${styles['almaciga-bg']}`}>
                    <span className={styles['tree-emoji']}>🌲</span>
                    <div className={`${styles['tree-status-badge']} ${styles['rare']}`}>Critically Rare</div>
                    {isRareLocked && (
                      <div className={styles['tree-lock-overlay']}>
                          <div className={styles['tree-lock-content']}>
                              <i className={`${styles['fa-solid']} ${styles['fa-lock']} ${styles['tree-lock-icon']}`}></i>
                              <p className={styles['tree-lock-text']}>Adopt 2 Endangered trees first to unlock</p>
                          </div>
                      </div>
                    )}
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Almaciga</h4>
                    <p className={styles['tree-sci-name']}>Agathis philippinensis</p>
                    <p className={styles['tree-desc']}>An ancient conifer tree that has survived for millions of years. Its resin was historically exported worldwide. Now critically threatened.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Palawan, Sierra Madre</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 60m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#7c3aed' }}>
                                ⚠️ {treeStats['Almaciga'] !== undefined ? treeStats['Almaciga'] : 5} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Almaciga'] !== undefined ? treeStats['Almaciga'] : 5}%`, background: '#7c3aed' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 3,000 Buzz</div>
                        <button 
                          className={`${styles['tree-adopt-btn']} ${styles['urgent']}`} 
                          onClick={() => handleAdopt(3000, 'Almaciga')}
                          disabled={isRareLocked || adoptingTree === 'Almaciga'}
                          style={isRareLocked ? { background: '#6b7280', cursor: 'not-allowed' } : {}}
                        >
                          {isRareLocked ? 'Locked 🔒' : (adoptingTree === 'Almaciga' ? 'Processing...' : '🆘 Adopt Now')}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="endangered" data-tree="Banuyo" data-locked="false" data-urgency="19">
                <div className={`${styles['tree-card-image']} ${styles['banuyo-bg']}`}>
                    <span className={styles['tree-emoji']}>🌿</span>
                    <div className={`${styles['tree-status-badge']} ${styles['endangered']}`}>Endangered</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Banuyo</h4>
                    <p className={styles['tree-sci-name']}>Wallaceodendron celebicum</p>
                    <p className={styles['tree-desc']}>A towering dipterocarp tree once common in Philippine lowland forests. Provides critical habitat for Philippine eagles and other wildlife.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Mindanao, Visayas</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 35m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#dc2626' }}>
                                ⚠️ {treeStats['Banuyo'] !== undefined ? treeStats['Banuyo'] : 19} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Banuyo'] !== undefined ? treeStats['Banuyo'] : 19}%`, background: '#dc2626' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 1,500 Buzz</div>
                        <button className={`${styles['tree-adopt-btn']} ${styles['urgent']}`} onClick={() => handleAdopt(1500, 'Banuyo')} disabled={adoptingTree === 'Banuyo'}>
                          {adoptingTree === 'Banuyo' ? 'Processing...' : '🆘 Adopt Now'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="endangered" data-tree="Apitong" data-locked="false" data-urgency="14">
                <div className={`${styles['tree-card-image']} ${styles['apitong-bg']}`}>
                    <span className={styles['tree-emoji']}>🌳</span>
                    <div className={`${styles['tree-status-badge']} ${styles['endangered']}`}>Endangered</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Apitong</h4>
                    <p className={styles['tree-sci-name']}>Dipterocarpus grandiflorus</p>
                    <p className={styles['tree-desc']}>The giant of Philippine forests, producing winged seeds that spiral down like helicopters. Essential for forest regeneration and carbon storage.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Luzon to Mindanao</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 50m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#dc2626' }}>
                                ⚠️ {treeStats['Apitong'] !== undefined ? treeStats['Apitong'] : 14} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Apitong'] !== undefined ? treeStats['Apitong'] : 14}%`, background: '#dc2626' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 1,800 Buzz</div>
                        <button className={`${styles['tree-adopt-btn']} ${styles['urgent']}`} onClick={() => handleAdopt(1800, 'Apitong')} disabled={adoptingTree === 'Apitong'}>
                          {adoptingTree === 'Apitong' ? 'Processing...' : '🆘 Adopt Now'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['tree-card']} data-category="native" data-tree="Tindalo" data-locked="false" data-urgency="38">
                <div className={`${styles['tree-card-image']} ${styles['tindalo-bg']}`}>
                    <span className={styles['tree-emoji']}>🌺</span>
                    <div className={`${styles['tree-status-badge']} ${styles['native']}`}>Native</div>
                </div>
                <div className={styles['tree-card-body']}>
                    <h4 className={styles['tree-name']}>Tindalo</h4>
                    <p className={styles['tree-sci-name']}>Afzelia rhomboidea</p>
                    <p className={styles['tree-desc']}>A beautiful flowering tree with bright red seeds wrapped in golden arils. Revered for its ornamental value and used in traditional boat building.</p>
                    <div className={styles['tree-facts']}>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-location-dot']}`}></i> Visayas, Mindanao</span>
                        <span className={styles['tree-fact']}><i className={`${styles['fa-solid']} ${styles['fa-ruler-vertical']}`}></i> Up to 30m tall</span>
                    </div>
                    <div className={styles['tree-urgency-bar']}>
                        <div className={styles['tree-urgency-header']}>
                            <span className={styles['tree-urgency-label']} style={{ color: '#166534' }}>
                                ⚠️ {treeStats['Tindalo'] !== undefined ? treeStats['Tindalo'] : 38} adoptions left to save this species!
                            </span>
                        </div>
                        <div className={styles['tree-urgency-track']}>
                            <div className={styles['tree-urgency-fill']} style={{ width: `${treeStats['Tindalo'] !== undefined ? treeStats['Tindalo'] : 38}%`, background: '#166534' }}></div>
                        </div>
                    </div>
                    <div className={styles['tree-card-footer']}>
                        <div className={styles['tree-price']}><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> 900 Buzz</div>
                        <button className={styles['tree-adopt-btn']} onClick={() => handleAdopt(900, 'Tindalo')} disabled={adoptingTree === 'Tindalo'}>
                          {adoptingTree === 'Tindalo' ? 'Processing...' : '🌱 Adopt'}
                        </button>
                    </div>
                </div>
            </div>

            
            <div className={styles['tree-leaderboard-card']}>
                <div className={styles['tree-lb-header']}>
                    <span className={styles['tree-lb-title']}>🏆 Top Tree Savers</span>
                    <span className={styles['tree-lb-sub']}>This Month</span>
                </div>
                <div className={styles['tree-lb-list']} id="tree-lb-list">
                    <div className={`${styles['tree-lb-row']} ${styles['gold-row']}`}>
                        <span className={styles['tree-lb-rank']}>🥇</span>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah" className={styles['tree-lb-avatar']} alt="Avatar" />
                        <div className={styles['tree-lb-info']}>
                            <p className={styles['tree-lb-name']}>Sarah J.</p>
                            <p className={styles['tree-lb-trees']}>5 trees adopted</p>
                        </div>
                        <span className={styles['tree-lb-score']}>5 🌳</span>
                    </div>
                    <div className={`${styles['tree-lb-row']} ${styles['silver-row']}`}>
                        <span className={styles['tree-lb-rank']}>🥈</span>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Mike" className={styles['tree-lb-avatar']} alt="Avatar"  />
                        <div className={styles['tree-lb-info']}>
                            <p className={styles['tree-lb-name']}>Mike T.</p>
                            <p className={styles['tree-lb-trees']}>3 trees adopted</p>
                        </div>
                        <span className={styles['tree-lb-score']}>3 🌳</span>
                    </div>
                    <div className={`${styles['tree-lb-row']} ${styles['bronze-row']}`}>
                        <span className={styles['tree-lb-rank']}>🥉</span>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Ana" className={styles['tree-lb-avatar']} alt="Avatar" />
                        <div className={styles['tree-lb-info']}>
                            <p className={styles['tree-lb-name']}>Ana R.</p>
                            <p className={styles['tree-lb-trees']}>2 trees adopted</p>
                        </div>
                        <span className={styles['tree-lb-score']}>2 🌳</span>
                    </div>
                    <div className={`${styles['tree-lb-row']} ${styles['you-row']}`} id="tree-lb-you">
                        <span className={styles['tree-lb-rank']}>👤</span>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" className={styles['tree-lb-avatar']} alt="Avatar" />
                        <div className={styles['tree-lb-info']}>
                            <p className={styles['tree-lb-name']}>You</p>
                            <p className={styles['tree-lb-trees']} id="lb-your-count">0 trees adopted</p>
                        </div>
                        <span className={styles['tree-lb-score']} id="lb-your-score">0 🌳</span>
                    </div>
                </div>
            </div>

        </div>

    </section>
  );
}