import React, { useState } from 'react';
import styled from 'styled-components';
import { FiInfo, FiX } from 'react-icons/fi';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  margin-left: 5px;
`;

const TooltipIcon = styled.span`
  cursor: pointer;
  color: ${props => props.$theme === 'dark' ? '#94a3b8' : '#64748b'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  
  &:hover {
    color: ${props => props.$theme === 'dark' ? '#e2e8f0' : '#334155'};
  }
`;

const TooltipContent = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  background-color: ${props => props.$theme === 'dark' ? '#334155' : '#f8fafc'};
  color: ${props => props.$theme === 'dark' ? '#e2e8f0' : '#334155'};
  border: 1px solid ${props => props.$theme === 'dark' ? '#475569' : '#cbd5e1'};
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: left;
  
  &:after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: ${props => props.$theme === 'dark' ? '#475569' : '#cbd5e1'} transparent transparent transparent;
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.$theme === 'dark' ? '#475569' : '#cbd5e1'};
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  color: ${props => props.$theme === 'dark' ? '#e2e8f0' : '#334155'};
`;

const TooltipCloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$theme === 'dark' ? '#94a3b8' : '#64748b'};
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${props => props.$theme === 'dark' ? '#e2e8f0' : '#334155'};
  }
`;

const TooltipBody = styled.div`
  white-space: normal;
`;

/**
 * RAG Explanation Tooltip Component
 * Shows educational explanation tooltips for RAG process phases
 */
const RAGExplanationTooltip = ({ explanation, phase, theme = 'light' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  if (!explanation) {
    return null;
  }
  
  const showTooltip = () => setIsVisible(true);
  const hideTooltip = (e) => {
    e.stopPropagation();
    setIsVisible(false);
  };
  
  // Convert phase to title case
  const formatPhaseTitle = (phase) => {
    if (!phase) return 'Information';
    return phase.charAt(0).toUpperCase() + phase.slice(1).toLowerCase();
  };
  
  return (
    <TooltipContainer>
      <TooltipIcon 
        onClick={showTooltip}
        onMouseEnter={showTooltip}
        $theme={theme}
        title="View RAG process explanation"
      >
        <FiInfo size={14} />
      </TooltipIcon>
      
      {isVisible && (
        <TooltipContent $theme={theme}>
          <TooltipHeader $theme={theme}>
            <TooltipTitle $theme={theme}>
              {formatPhaseTitle(phase)} Phase
            </TooltipTitle>
            <TooltipCloseButton onClick={hideTooltip} $theme={theme}>
              <FiX size={16} />
            </TooltipCloseButton>
          </TooltipHeader>
          <TooltipBody>
            {explanation}
          </TooltipBody>
        </TooltipContent>
      )}
    </TooltipContainer>
  );
};

export default RAGExplanationTooltip;
