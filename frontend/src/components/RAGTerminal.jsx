import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { FiTerminal, FiX, FiChevronUp, FiChevronDown, FiBookOpen } from 'react-icons/fi';
import RAGExplanationTooltip from './RAGExplanationTooltip';

const TerminalContainer = styled.div`
  position: fixed;
  right: 20px;
  bottom: ${props => props.$minimized ? '20px' : '0'};
  width: ${props => props.$minimized ? '50px' : '380px'};
  height: ${props => props.$minimized ? '50px' : '300px'};
  background-color: ${props => props.$theme === 'dark' ? '#1e293b' : '#f8fafc'};
  color: ${props => props.$theme === 'dark' ? '#e2e8f0' : '#334155'};
  border: 1px solid ${props => props.$theme === 'dark' ? '#334155' : '#cbd5e1'};
  border-radius: ${props => props.$minimized ? '50%' : '8px 8px 0 0'};
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TerminalHeader = styled.div`
  padding: ${props => props.$minimized ? '0' : '8px 12px'};
  background-color: ${props => props.$theme === 'dark' ? '#334155' : '#e2e8f0'};
  display: flex;
  align-items: center;
  justify-content: ${props => props.$minimized ? 'center' : 'space-between'};
  border-bottom: ${props => props.$minimized ? 'none' : `1px solid ${props.$theme === 'dark' ? '#475569' : '#cbd5e1'}`};
  cursor: pointer;
  height: ${props => props.$minimized ? '50px' : 'auto'};
`;

const TerminalTitle = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TerminalControls = styled.div`
  display: flex;
  gap: 6px;
`;

const TerminalButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const TerminalContent = styled.div`
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Andale Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
  display: ${props => props.$minimized ? 'none' : 'block'};
  scrollbar-width: thin;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.$theme === 'dark' ? '#1e293b' : '#f8fafc'};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.$theme === 'dark' ? '#475569' : '#cbd5e1'};
    border-radius: 3px;
  }
`;

const blinkAnimation = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const pulseAnimation = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
`;

const typingAnimation = `
  @keyframes typing {
    0%, 100% { border-right-color: transparent; }
    50% { border-right-color: currentColor; }
  }
`;

const searchAnimation = `
  @keyframes search {
    0% { transform: translateX(-2px); }
    50% { transform: translateX(2px); }
    100% { transform: translateX(-2px); }
  }
`;

const flashAnimation = `
  @keyframes flash {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0.5; }
  }
`;

const celebrateAnimation = `
  @keyframes celebrate {
    0% { transform: translateY(0); }
    25% { transform: translateY(-5px); }
    50% { transform: translateY(0); }
    75% { transform: translateY(-3px); }
    100% { transform: translateY(0); }
  }
`;

const TerminalLine = styled.div`
  margin-bottom: 4px;
  color: ${props => {
    if (props.$type === 'error') return '#ef4444';
    if (props.$type === 'warning') return '#f59e0b';
    if (props.$type === 'success') return '#10b981';
    if (props.$type === 'info') return '#3b82f6';
    return 'inherit';
  }};
  display: flex;
  align-items: center;
  
  /* Apply animations based on animation type */
  ${props => {
    switch(props.$animation) {
      case 'typing':
        return `
          ${typingAnimation}
          & > span:last-child {
            border-right: 2px solid;
            animation: typing 1s infinite;
          }
        `;
      case 'pulse':
        return `
          ${pulseAnimation}
          animation: pulse 2s infinite;
        `;
      case 'search':
        return `
          ${searchAnimation}
          & > span:last-child {
            animation: search 1s infinite;
          }
        `;
      case 'flash':
        return `
          ${flashAnimation}
          animation: flash 2s;
        `;
      case 'celebrate':
        return `
          ${celebrateAnimation}
          animation: celebrate 1s;
          font-weight: bold;
        `;
      case 'progress':
        return ''; // Progress is handled separately
      default:
        return '';
    }
  }}
`;

const Timestamp = styled.span`
  color: ${props => props.$theme === 'dark' ? '#94a3b8' : '#64748b'};
  margin-right: 8px;
  font-size: 0.75rem;
`;

const TerminalText = styled.span`
  word-break: break-word;
  flex: 1;
`;

const ProgressBar = styled.div`
  margin-top: 4px;
  height: 6px;
  width: 100%;
  background-color: ${props => props.$theme === 'dark' ? '#334155' : '#e2e8f0'};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => `${props.$progress * 100}%`};
  background-color: #3b82f6;
  transition: width 0.3s ease-in-out;
`;

const Prefix = styled.span`
  color: ${props => props.$theme === 'dark' ? '#94a3b8' : '#64748b'};
  margin-right: 8px;
`;

/**
 * RAG Terminal Component
 * Displays a terminal-like interface showing RAG process steps
 */
const RAGTerminal = ({
  theme = 'light', // 'light' or 'dark'
  initialMinimized = false,
  events = [],
}) => {
  const [minimized, setMinimized] = useState(initialMinimized);
  const [terminalEvents, setTerminalEvents] = useState([]);
  const contentRef = useRef(null);

  useEffect(() => {
    // Add new events to the terminal
    if (events && events.length > 0) {
      setTerminalEvents(prev => [...prev, ...events]);
    }
  }, [events]);

  useEffect(() => {
    // Auto-scroll to bottom when new events are added
    if (contentRef.current && !minimized) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [terminalEvents, minimized]);

  // Clear terminal events
  const clearTerminal = (e) => {
    e.stopPropagation();
    setTerminalEvents([]);
  };

  // Toggle terminal minimized state
  const toggleMinimized = () => {
    setMinimized(!minimized);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <TerminalContainer $minimized={minimized} $theme={theme}>
      <TerminalHeader onClick={toggleMinimized} $minimized={minimized} $theme={theme}>
        {minimized ? (
          <FiTerminal size={20} />
        ) : (
          <>
            <TerminalTitle>
              <FiTerminal /> RAG Process <FiBookOpen size={12} style={{ marginLeft: '4px', opacity: 0.7 }} title="Hover over info icons for explanations" />
            </TerminalTitle>
            <TerminalControls>
              <TerminalButton onClick={clearTerminal} title="Clear terminal">
                <FiX size={16} />
              </TerminalButton>
              <TerminalButton onClick={toggleMinimized} title="Minimize">
                {minimized ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </TerminalButton>
            </TerminalControls>
          </>
        )}
      </TerminalHeader>
      
      <TerminalContent ref={contentRef} $minimized={minimized} $theme={theme}>
        {terminalEvents.length === 0 ? (
          <TerminalLine>
            <TerminalText>No RAG processes have been run yet. Upload a document or enter a URL to get started.</TerminalText>
          </TerminalLine>
        ) : (
          terminalEvents.map((event, index) => (
            <React.Fragment key={index}>
              <TerminalLine 
                $type={event.type || 'default'} 
                $animation={event.animation || 'none'}
              >
                <Timestamp $theme={theme}>{formatTime(event.timestamp)}</Timestamp>
                <Prefix>[{event.phase || 'system'}]</Prefix>
                <TerminalText>{event.message}</TerminalText>
                
                {/* Show explanation tooltip if available */}
                {event.metadata && event.metadata.explanation && (
                  <RAGExplanationTooltip 
                    explanation={event.metadata.explanation} 
                    phase={event.phase}
                    theme={theme} 
                  />
                )}
              </TerminalLine>
              
              {/* Show progress bar if animation is progress and progress value exists */}
              {event.animation === 'progress' && typeof event.progress === 'number' && (
                <ProgressBar $theme={theme}>
                  <ProgressFill $progress={event.progress} />
                </ProgressBar>
              )}
            </React.Fragment>
          ))
        )}
      </TerminalContent>
    </TerminalContainer>
  );
};

export default RAGTerminal;
