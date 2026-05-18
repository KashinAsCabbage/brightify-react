import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// For Vite, we import the worker URL directly so it builds correctly
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { motion } from 'framer-motion';

// Setup the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const StudyAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please upload a valid PDF file.');
    }
  };

  const extractTextFromPDF = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let extractedText = '';
    // Loop through each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText += pageText + ' ';
    }
    return extractedText;
  };

  const analyzeWithGemini = async (text) => {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    const systemPrompt = `You are a master learning strategist. Read the following text extracted from a student's class PDF. 

Determine the single best scientifically-backed study method for this specific material (e.g., Active Recall, Feynman Technique, Interleaving, etc.). 

You must output your response in STRICT JSON format matching this exact structure, with no markdown formatting or extra text outside the JSON: 
{ 
  "methodName": "Name of the study method", 
  "whyItWorks": "A 2-sentence explanation of why this method fits this specific text", 
  "howToExecute": ["Step 1...", "Step 2...", "Step 3..."] 
}`;

    const prompt = `${systemPrompt}

Text to analyze:
${text.substring(0, 30000)}`; // Limiting text to avoid token limits

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to analyze text with Gemini API.');
    }

    const data = await response.json();
    const jsonString = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonString);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);

      // 1. Extract Text
      const text = await extractTextFromPDF(file);

      if (!text.trim()) {
        throw new Error('Could not extract any readable text from this PDF.');
      }

      // 2. Send to Gemini
      const analysisResult = await analyzeWithGemini(text);

      // 3. Set Result
      setResult(analysisResult);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.card}
      >
        <h2 style={styles.title}>AI Study Strategist</h2>
        <p style={styles.subtitle}>Upload your class material and let our AI determine the best way to master it.</p>

        {/* Upload Section */}
        <div 
          style={styles.uploadArea}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={styles.uploadContent}>
            <svg style={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span style={styles.uploadText}>
              {file ? file.name : 'Click to upload PDF'}
            </span>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Action Button */}
        <button 
          style={{ ...styles.button, opacity: (!file || isAnalyzing) ? 0.6 : 1 }}
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
        >
          {isAnalyzing ? (
            <span style={styles.loadingText}>
              <div style={styles.spinner}></div> Analyzing...
            </span>
          ) : (
            'Analyze Material'
          )}
        </button>

        {/* Results Section */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.5 }}
            style={styles.resultContainer}
          >
            <div style={styles.methodHeader}>
              <span style={styles.badge}>Recommended Method</span>
              <h3 style={styles.methodName}>{result.methodName}</h3>
            </div>
            
            <div style={styles.whySection}>
              <h4 style={styles.sectionTitle}>Why it works</h4>
              <p style={styles.whyText}>{result.whyItWorks}</p>
            </div>

            <div style={styles.executionSection}>
              <h4 style={styles.sectionTitle}>How to execute</h4>
              <ul style={styles.stepList}>
                {result.howToExecute.map((step, index) => (
                  <motion.li 
                    key={index} 
                    style={styles.stepItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span style={styles.stepNumber}>{index + 1}</span>
                    <span style={styles.stepText}>{step}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: '"Inter", sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#1e293b',
    borderRadius: '24px',
    padding: '2.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 2rem 0',
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  uploadArea: {
    border: '2px dashed rgba(168, 85, 247, 0.4)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    transition: 'all 0.3s ease',
    marginBottom: '1.5rem',
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  uploadIcon: {
    width: '40px',
    height: '40px',
    color: '#a855f7',
  },
  uploadText: {
    color: '#cbd5e1',
    fontWeight: '500',
    fontSize: '1.1rem',
  },
  button: {
    width: '100%',
    padding: '1rem',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#a855f7',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    boxShadow: '0 4px 14px 0 rgba(168, 85, 247, 0.39)',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    borderTopColor: '#fff',
    animation: 'spin 1s ease-in-out infinite',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '0.5rem',
    borderRadius: '8px',
  },
  resultContainer: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  methodHeader: {
    marginBottom: '1.5rem',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  methodName: {
    margin: 0,
    fontSize: '1.75rem',
    color: '#f8fafc',
    fontWeight: '700',
  },
  whySection: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.9rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  whyText: {
    margin: 0,
    color: '#e2e8f0',
    lineHeight: '1.6',
    fontSize: '1rem',
  },
  executionSection: {
    marginTop: '1.5rem',
  },
  stepList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '1rem',
    borderRadius: '12px',
  },
  stepNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  stepText: {
    color: '#cbd5e1',
    lineHeight: '1.5',
    fontSize: '0.95rem',
  }
};

// Add keyframes for spinner if needed, usually we can just rely on basic CSS or standard inline styles.
// But to make it cleaner, injecting global style is bad practice in React, 
// so we'll just define it inline. However, inline CSS animation isn't fully supported via objects, 
// we'll inject a small style tag in the return for the spinner animation.

const StudyAnalyzerWithStyles = () => (
  <>
    <style>
      {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}
    </style>
    <StudyAnalyzer />
  </>
);

export default StudyAnalyzerWithStyles;
