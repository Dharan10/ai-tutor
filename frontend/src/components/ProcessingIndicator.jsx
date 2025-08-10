import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiLoader, FiFile, FiFileText, FiYoutube, FiGlobe } from 'react-icons/fi';

const ProcessingContainer = styled.div`
  position: ${props => props.$fixed ? 'fixed' : 'relative'};
  bottom: ${props => props.$fixed ? '20px' : 'auto'};
  right: ${props => props.$fixed ? '20px' : 'auto'};
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: var(--text-color);
  z-index: 100;
  border: 1px solid var(--border-color);
  max-width: ${props => props.$fixed ? '300px' : '100%'};
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ProcessingHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const ProcessingInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const FileName = styled.span`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
`;

const StatusText = styled.span`
  color: #6b7280;
  font-size: 0.8rem;
`;

const FileTypeIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  font-size: 1.2rem;
  color: ${props => {
    switch(props.$type) {
      case 'pdf': return '#FF5733';
      case 'docx': return '#2B579A';
      case 'youtube': return '#FF0000';
      case 'web': return '#0078D7';
      default: return '#6B7280';
    }
  }};
`;

const ProgressBarContainer = styled.div`
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
  position: relative;
`;

const ProgressBar = styled.div`
  height: 100%;
  background-color: var(--primary-color);
  position: absolute;
  left: 0;
  top: 0;
  transition: width 0.3s ease;
  width: ${props => props.$progress || '0%'};
`;

const Spinner = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ProcessingIndicator = ({ 
  fileName, 
  fileType = 'file', 
  isProcessing, 
  isFixed = true,
  onComplete = () => {} 
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting...');
  
  // Simulate progress updates
  useEffect(() => {
    let interval;
    
    if (isProcessing) {
      setProgress(0);
      let phase = 0;
      const phases = [
        { max: 30, text: 'Reading file...' },
        { max: 60, text: 'Processing content...' },
        { max: 90, text: 'Creating vector embeddings...' },
        { max: 98, text: 'Storing data...' }
      ];
      
      interval = setInterval(() => {
        setProgress(prevProgress => {
          // Update progress based on current phase
          const currentPhase = phases[phase];
          const newProgress = prevProgress + (Math.random() * 3);
          
          // Check if we should move to next phase
          if (newProgress >= currentPhase.max && phase < phases.length - 1) {
            phase++;
            setStatusText(phases[phase].text);
          }
          
          return newProgress < 99 ? newProgress : 99;
        });
      }, 800);
    } else if (progress > 0) {
      // Finish animation when processing completes
      setProgress(100);
      setStatusText('Complete!');
      
      // Notify parent after a delay
      setTimeout(onComplete, 1500);
    }
    
    return () => clearInterval(interval);
  }, [isProcessing, onComplete]);
  
  const getIcon = () => {
    if (isProcessing) {
      return <Spinner><FiLoader /></Spinner>;
    }
    
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return <FiFile />;
      case 'docx':
      case 'doc':
        return <FiFileText />;
      case 'youtube':
        return <FiYoutube />;
      case 'web':
        return <FiGlobe />;
      default:
        return <FiFile />;
    }
  };
  
  return (
    <ProcessingContainer $fixed={isFixed}>
      <ProcessingHeader>
        <FileTypeIcon $type={fileType}>
          {getIcon()}
        </FileTypeIcon>
        <ProcessingInfo>
          <FileName>{fileName}</FileName>
          <StatusText>{statusText}</StatusText>
        </ProcessingInfo>
      </ProcessingHeader>
      <ProgressBarContainer>
        <ProgressBar $progress={`${progress}%`} />
      </ProgressBarContainer>
    </ProcessingContainer>
  );
};

export default ProcessingIndicator;
