import React from 'react';
import styled from 'styled-components';
import { FaFilePdf, FaFileWord, FaGlobe, FaYoutube } from 'react-icons/fa';

const Card = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  background-color: white;
  
  &:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const SourceIcon = styled.div`
  margin-right: 0.75rem;
  color: var(--primary-color);
  font-size: 1.25rem;
  min-width: 1.5rem;
`;

const SourceInfo = styled.div`
  flex: 1;
  overflow: hidden;
`;

const SourceTitle = styled.div`
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
`;

const SourceText = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SourceCard = ({ source, onClick }) => {
  const getSourceIcon = () => {
    switch (source.source_type) {
      case 'pdf':
        return <FaFilePdf />;
      case 'docx':
        return <FaFileWord />;
      case 'youtube':
        return <FaYoutube />;
      case 'web':
      default:
        return <FaGlobe />;
    }
  };

  const getSourceTitle = () => {
    if (source.title) return source.title;
    
    // Extract domain if it's a web URL
    if (source.source.startsWith('http')) {
      try {
        const url = new URL(source.source);
        return url.hostname;
      } catch (e) {
        return source.source;
      }
    }
    
    return source.source.split('/').pop();
  };

  return (
    <Card onClick={() => onClick(source)}>
      <SourceIcon>{getSourceIcon()}</SourceIcon>
      <SourceInfo>
        <SourceTitle>{getSourceTitle()}</SourceTitle>
        <SourceText>{source.text}</SourceText>
      </SourceInfo>
    </Card>
  );
};

export default SourceCard;
