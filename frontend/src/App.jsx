import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiInfo } from 'react-icons/fi';

// Import pages
import Home from './pages/Home';
import RAGExplanation from './pages/RAGExplanation';

// Import RAG process components
import { RAGProcessProvider } from './context/RAGProcessContext';
import RAGTerminal from './components/RAGTerminal';

// Styled Components
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: white;
  border-bottom: 1px solid var(--border-color);
  
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    
    h1 {
      font-size: 1.25rem;
    }
  }
`;

const InfoButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: transparent;
  border: 1px solid var(--primary-color);
  border-radius: 0.5rem;
  color: var(--primary-color);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--primary-color);
    color: white;
  }
  
  @media (max-width: 768px) {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function App() {
  return (
    <RAGProcessProvider>
      <AppContainer>
        <Header>
          <h1>AI Tutor</h1>
          <InfoButton to="/explanation">
            <span>How RAG Works</span>
            <FiInfo />
          </InfoButton>
        </Header>
        
        <ContentContainer>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explanation" element={<RAGExplanation />} />
          </Routes>
        </ContentContainer>
        
        <RAGTerminal theme="dark" initialMinimized={false} />
      </AppContainer>
    </RAGProcessProvider>
  );
}

export default App;
