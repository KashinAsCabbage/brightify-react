import { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';

export default function AvatarCustomizer() {
  const { userAvatar, setUserAvatar } = useTheme();
  // Array of all 15 custom JPG avatars from your public/avatars folder
  const customAvatars = [
    '/avatars/avatar-1.jpg',
    '/avatars/avatar-2.jpg',
    '/avatars/avatar-3.jpg',
    '/avatars/avatar-4.jpg',
    '/avatars/avatar-5.jpg',
    '/avatars/avatar-6.jpg',
    '/avatars/avatar-7.jpg',
    '/avatars/avatar-8.jpg',
    '/avatars/avatar-9.jpg',
    '/avatars/avatar-10.jpg',
    '/avatars/avatar-11.jpg',
    '/avatars/avatar-12.jpg',
    '/avatars/avatar-13.jpg',
    '/avatars/avatar-14.jpg',
    '/avatars/avatar-15.jpg'
  ];

  // Set the first image as the default preview
  const [selectedAvatar, setSelectedAvatar] = useState(userAvatar || customAvatars[0]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUserAvatar(publicUrl);
      setSelectedAvatar(publicUrl);
      setToastMessage('Custom Avatar Uploaded Successfully! 🌟');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setToastMessage('Error uploading avatar: ' + error.message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <h3 style={{ color: '#1e3a8a', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        🎨 Choose Your Avatar
      </h3>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Left Side: Live Preview Box */}
        <div style={{ flex: '1', minWidth: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <img 
            src={selectedAvatar} 
            alt="Selected Avatar" 
            style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'white', border: '4px solid white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '1rem', objectFit: 'cover' }} 
          />
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Look
          </span>
        </div>

        {/* Right Side: The Selection Grid */}
        <div style={{ flex: '2', minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select from Collection
          </label>
          
          {/* Scrollable Grid Container */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', 
            gap: '1rem',
            maxHeight: '220px', // Prevents the modal from getting too tall
            overflowY: 'auto', // Adds a scrollbar if needed
            paddingRight: '0.5rem'
          }}>
            {customAvatars.map((imgSrc, index) => (
              <button 
                key={index}
                onClick={() => setSelectedAvatar(imgSrc)}
                style={{ 
                  padding: '0.25rem', 
                  background: 'white', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer', 
                  border: selectedAvatar === imgSrc ? '3px solid #3b82f6' : '1px solid #e2e8f0',
                  boxShadow: selectedAvatar === imgSrc ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <img 
                  src={imgSrc} 
                  alt={`Option ${index + 1}`} 
                  style={{ width: '100%', aspectRatio: '1/1', borderRadius: '0.25rem', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>

          {/* Custom Upload Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or Upload Your Own
            </label>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isUploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: '#f1f5f9',
                color: '#334155',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px dashed #cbd5e1',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { if (!isUploading) e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseOut={(e) => { if (!isUploading) e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>

          {/* Save Button */}
          <button 
            onClick={async () => {
              setUserAvatar(selectedAvatar);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase
                    .from('profiles')
                    .update({ avatar_url: selectedAvatar })
                    .eq('id', user.id);
                }
              } catch (err) {
                console.error("Failed to save avatar to DB:", err);
              }
              setToastMessage('Avatar Equipped Successfully! ✨');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            }}
            style={{ marginTop: 'auto', background: '#1d4ed8', color: 'white', padding: '0.875rem', borderRadius: '2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.target.style.background = '#1e40af'}
            onMouseOut={(e) => e.target.style.background = '#1d4ed8'}
          >
            💾 Equip Avatar
          </button>
          
        </div>
      </div>

      {/* Toast Notification */}
      <div 
        style={{ 
          position: 'absolute', 
          top: showToast ? '1rem' : '-5rem', 
          left: '50%', 
          transform: 'translateX(-50%)',
          opacity: showToast ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          background: '#10b981',
          color: 'white', 
          fontWeight: 'bold', 
          padding: '0.75rem 1.5rem', 
          borderRadius: '9999px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          pointerEvents: 'none',
          zIndex: 9999
        }}
      >
        {toastMessage}
      </div>
    </div>
  );
}