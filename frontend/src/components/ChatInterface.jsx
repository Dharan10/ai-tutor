import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FiSend, FiLink, FiLoader, FiUpload } from 'react-icons/fi';

import SourceCard from './SourceCard';
import ProcessingIndicator from './ProcessingIndicator';
import { useRAGProcess } from '../context/RAGProcessContext';

// Styled Components
const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Message = styled.div`
  margin-bottom: 1.5rem;
  max-width: 80%;
  ${props => props.$isUser ? 'margin-left: auto;' : ''}
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const MessageBubble = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: ${props => props.$isUser ? 'var(--primary-color)' : 'var(--ai-message-bg)'};
  color: ${props => props.$isUser ? 'white' : 'var(--text-color)'};
  border: ${props => props.$isUser ? 'none' : '1px solid var(--border-color)'};
  
  .markdown {
    overflow-wrap: break-word;
  }
`;

const MessageMeta = styled.div`
  font-size: 0.75rem;
  margin-top: 0.25rem;
  color: #6b7280;
  display: flex;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
`;

const SourcesPanel = styled.div`
  width: 300px;
  border-left: 1px solid var(--border-color);
  padding: 1rem;
  overflow-y: auto;
  display: ${props => props.$show ? 'block' : 'none'};
  
  h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
    font-weight: 500;
  }
  
  @media (max-width: 1024px) {
    width: 250px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const InputContainer = styled.div`
  border-top: 1px solid var(--border-color);
  padding: 1rem 2rem;
  background-color: white;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const InputForm = styled.form`
  display: flex;
  gap: 0.75rem;
`;

const InputWrapper = styled.div`
  flex: 1;
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
`;

const TextInput = styled.textarea`
  width: 100%;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  height: 56px;
  max-height: 200px;
  
  &:focus {
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  background-color: ${props => props.$primary ? 'var(--primary-color)' : 'white'};
  color: ${props => props.$primary ? 'white' : 'var(--text-color)'};
  border: ${props => props.$primary ? 'none' : '1px solid var(--border-color)'};
  border-radius: 0.5rem;
  height: 56px;
  width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.$primary ? 'var(--primary-hover)' : 'var(--secondary-color)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadContainer = styled.div`
  position: relative;
  overflow: hidden;
`;

const HiddenFileInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
`;

const UrlInputContainer = styled.div`
  position: fixed;
  bottom: 6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  z-index: 10;
  display: ${props => props.$show ? 'block' : 'none'};
`;

const UrlInputForm = styled.form`
  display: flex;
  gap: 0.5rem;
`;

const UrlInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  
  &:focus {
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
`;

const StatusMessage = styled.div`
  text-align: center;
  padding: 1rem;
  color: ${props => props.$error ? 'var(--error-color)' : '#6b7280'};
`;

const SourceDetails = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 1.5rem;
  z-index: 10;
  display: ${props => props.$show ? 'block' : 'none'};
  max-height: 80vh;
  overflow-y: auto;
  
  h3 {
    margin-bottom: 1rem;
  }
  
  p {
    margin-bottom: 0.5rem;
  }
  
  a {
    display: block;
    margin-top: 1rem;
    word-break: break-all;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 5;
  display: ${props => props.$show ? 'block' : 'none'};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  
  &:hover {
    color: var(--text-color);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  
  h2 {
    margin-bottom: 1rem;
    font-weight: 600;
  }
  
  p {
    margin-bottom: 2rem;
    max-width: 600px;
  }
`;

const Spinner = styled.div`
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedSource, setSelectedSource] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [processingUrl, setProcessingUrl] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Get RAG process context
  const { addEvent, startNewSession } = useRAGProcess();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle question submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    
    const userMessage = {
      id: Date.now(),
      text: question,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);
    setError('');
    
    // Log to RAG terminal
    addEvent({
      message: `Question received: "${question.trim()}"`,
      type: 'info',
      phase: 'query',
    });
    
    try {
      // Log to RAG terminal
      addEvent({
        message: 'Searching vector database for relevant documents...',
        type: 'info',
        phase: 'retrieval',
      });
      
      const response = await axios.post('/api/ask', {
        question: question.trim(),
        num_chunks: 5,
      });
      
      // Log to RAG terminal
      addEvent({
        message: `Found ${response.data.sources?.length || 0} relevant document chunks`,
        type: 'success',
        phase: 'retrieval',
      });
      
      // Log to RAG terminal
      addEvent({
        message: 'Generating answer using retrieved context...',
        type: 'info',
        phase: 'generation',
      });
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.answer,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        sources: response.data.sources || [],
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      
      // Log to RAG terminal
      addEvent({
        message: 'Answer generated successfully',
        type: 'success',
        phase: 'generation',
      });
    } catch (err) {
      console.error('Error asking question:', err);
      setError('Failed to get an answer. Please try again.');
      
      // Log to RAG terminal
      addEvent({
        message: `Error: ${err.response?.data?.detail || err.message || 'Failed to get answer'}`,
        type: 'error',
        phase: 'generation',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle URL submission
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || uploading) return;
    
    setUploading(true);
    setError('');
    setShowUrlInput(false); // Hide URL input immediately
    
    // Start a new session (clear previous vector store data)
    startNewSession();
    
    // Determine URL type (YouTube or web)
    const urlType = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'web';
    
    // Set the processing URL
    setProcessingUrl({
      url: url,
      type: urlType
    });
    
    // Add immediate loading message
    const loadingMessage = {
      id: Date.now(),
      text: `Processing content from ${url}... Please wait, this may take a minute.`,
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
      isSystem: true,
    };
    
    setMessages((prev) => [...prev, loadingMessage]);
    
    // Log to RAG terminal
    addEvent({
      message: `Processing ${urlType} content from: ${url}`,
      type: 'info',
      phase: 'ingestion',
    });
    
    try {
      // Log to RAG terminal - fetching content
      addEvent({
        message: `Fetching content from URL...`,
        type: 'info',
        phase: 'ingestion',
      });
      
      const formData = new FormData();
      formData.append('urls', url.trim());
      
      const response = await axios.post('/api/ingest', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Add a longer timeout for large web pages or videos
        timeout: 180000, // 3 minutes
      });
      
      if (response.data.success) {
        setUrl('');
        
        // Log to RAG terminal - content extracted
        addEvent({
          message: `Content extracted successfully`,
          type: 'success',
          phase: 'extraction',
        });
        
        // Log to RAG terminal - chunking
        addEvent({
          message: `Splitting content into semantic chunks...`,
          type: 'info',
          phase: 'chunking',
        });
        
        // Log to RAG terminal - embedding
        addEvent({
          message: `Creating vector embeddings for ${response.data.document_count} chunks...`,
          type: 'info',
          phase: 'embedding',
        });
        
        // Log to RAG terminal - storage
        addEvent({
          message: `Storing embeddings in vector database...`,
          type: 'info',
          phase: 'storage',
        });
        
        // Log to RAG terminal - complete
        addEvent({
          message: `Ingestion complete. ${response.data.document_count} chunks processed and ready for querying`,
          type: 'success',
          phase: 'complete',
        });
        
        // Replace loading message with success message
        const successMessage = {
          id: Date.now(),
          text: `Added content from ${url}. You can now ask questions about it! (${response.data.document_count} chunks processed)`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true,
        };
        
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessage.id));
        setMessages((prev) => [...prev, successMessage]);
      }
    } catch (err) {
      console.error('Error ingesting URL:', err);
      // Replace loading message with error message
      const errorMsg = err.response?.data?.detail || 'Failed to process the URL. Please check the URL and try again.';
      
      // Log to RAG terminal - error
      addEvent({
        message: `Error: ${errorMsg}`,
        type: 'error',
        phase: 'ingestion',
      });
      
      setMessages((prev) => prev.filter(msg => msg.id !== loadingMessage.id));
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Error processing ${url}: ${errorMsg}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true,
        isError: true,
      }]);
      
      setError(errorMsg);
    } finally {
      // Set a small delay before removing the processing indicator
      setTimeout(() => {
        setProcessingUrl(null);
        setUploading(false);
      }, 1000);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || uploading) return;
    
    setUploading(true);
    setError('');
    
    // Start a new session (clear previous vector store data)
    startNewSession();
    
    // Get file name and type
    const file = files[0]; // Handle the first file for the processing indicator
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Set the processing file
    setProcessingFile({
      name: fileName,
      type: fileExtension
    });
    
    // Add immediate loading message
    const fileNames = Array.from(files)
      .map((file) => file.name)
      .join(', ');
    
    const loadingMessage = {
      id: Date.now(),
      text: `Processing ${fileNames}... Please wait, this may take a minute.`,
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
      isSystem: true,
    };
    
    setMessages((prev) => [...prev, loadingMessage]);
    
    // Log to RAG terminal
    addEvent({
      message: `Processing ${files.length} file(s): ${fileNames}`,
      type: 'info',
      phase: 'ingestion',
    });
    
    try {
      // Log to RAG terminal - extracting content
      addEvent({
        message: `Extracting content from document(s)...`,
        type: 'info',
        phase: 'extraction',
      });
      
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      const response = await axios.post('/api/ingest', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Add a longer timeout for large files
        timeout: 180000, // 3 minutes
      });
      
      if (response.data.success) {
        // Log to RAG terminal - content extracted
        addEvent({
          message: `Content extracted successfully`,
          type: 'success',
          phase: 'extraction',
        });
        
        // Log to RAG terminal - chunking
        addEvent({
          message: `Splitting content into semantic chunks...`,
          type: 'info',
          phase: 'chunking',
        });
        
        // Log to RAG terminal - embedding
        addEvent({
          message: `Creating vector embeddings for ${response.data.document_count} chunks...`,
          type: 'info',
          phase: 'embedding',
        });
        
        // Log to RAG terminal - storage
        addEvent({
          message: `Storing embeddings in vector database...`,
          type: 'info',
          phase: 'storage',
        });
        
        // Log to RAG terminal - complete
        addEvent({
          message: `Ingestion complete. ${response.data.document_count} chunks processed and ready for querying`,
          type: 'success',
          phase: 'complete',
        });
        
        // Replace loading message with success message
        const successMessage = {
          id: Date.now(),
          text: `Added content from ${fileNames}. You can now ask questions about it! (${response.data.document_count} chunks processed)`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true,
        };
        
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessage.id));
        setMessages((prev) => [...prev, successMessage]);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      // Replace loading message with error message
      const errorMsg = err.response?.data?.detail || 'Failed to upload files. Please try again.';
      setError(errorMsg);
      
      // Log to RAG terminal - error
      addEvent({
        message: `Error: ${errorMsg}`,
        type: 'error',
        phase: 'ingestion',
      });
      
      setMessages((prev) => prev.filter(msg => msg.id !== loadingMessage.id));
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Error processing ${fileNames}: ${errorMsg}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true,
        isError: true,
      }]);
    } finally {
      // Set a small delay before removing the processing indicator
      setTimeout(() => {
        setProcessingFile(null);
        setUploading(false);
      }, 1000);
    }
  };
  
  // Handle source click
  const handleSourceClick = (source) => {
    setSelectedSource(source);
  };
  
  // Handle textarea height adjustment
  const handleTextareaChange = (e) => {
    setQuestion(e.target.value);
    
    // Adjust height
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };
  
  // Handle key press in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Get current sources from the last AI message
  const getCurrentSources = () => {
    const aiMessages = messages.filter(m => !m.isUser);
    if (aiMessages.length === 0) return [];
    
    const lastAiMessage = aiMessages[aiMessages.length - 1];
    return lastAiMessage.sources || [];
  };
  
  const sources = getCurrentSources();
  const showSources = sources.length > 0;

  return (
    <>
      <ChatContainer>
        <MessagesContainer>
          {messages.length === 0 ? (
            <EmptyState>
              <h2>Welcome to AI Tutor!</h2>
              <p>
                Upload documents or provide URLs to learn from them. I'll answer your questions
                based on the content you provide.
              </p>
              <p>
                You can upload PDFs, Word documents, web pages, or YouTube videos.
              </p>
            </EmptyState>
          ) : (
            messages.map((message) => (
              <Message key={message.id} $isUser={message.isUser}>
                <MessageBubble $isUser={message.isUser}>
                  <div className="markdown">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                </MessageBubble>
                <MessageMeta $isUser={message.isUser}>
                  {message.isUser ? 'You' : 'AI Tutor'} • {message.timestamp}
                </MessageMeta>
              </Message>
            ))
          )}
          
          {loading && (
            <Message>
              <MessageBubble>
                <Spinner><FiLoader /></Spinner> Thinking...
              </MessageBubble>
            </Message>
          )}
          
          {error && (
            <StatusMessage $error>{error}</StatusMessage>
          )}
          
          <div ref={messagesEndRef} />
        </MessagesContainer>
        
        {showSources && (
          <SourcesPanel $show={showSources}>
            <h3>Sources</h3>
            {sources.map((source) => (
              <SourceCard 
                key={source.id} 
                source={source} 
                onClick={handleSourceClick}
              />
            ))}
          </SourcesPanel>
        )}
      </ChatContainer>
      
      <InputContainer>
        <InputForm onSubmit={handleSubmit}>
          <InputWrapper>
            <TextInput
              value={question}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={loading || uploading}
            />
          </InputWrapper>
          
          <ButtonsContainer>
            <UploadContainer>
              <Button 
                type="button" 
                disabled={loading || uploading}
                title="Upload documents"
              >
                {uploading ? <FiLoader /> : <FiUpload />}
              </Button>
              <HiddenFileInput
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                onChange={handleFileUpload}
                disabled={loading || uploading}
              />
            </UploadContainer>
            
            <Button 
              type="button" 
              onClick={() => setShowUrlInput(true)}
              disabled={loading || uploading}
              title="Add web page or YouTube video"
            >
              <FiLink />
            </Button>
            
            <Button 
              $primary 
              type="submit" 
              disabled={!question.trim() || loading || uploading}
              title="Send message"
            >
              <FiSend />
            </Button>
          </ButtonsContainer>
        </InputForm>
      </InputContainer>
      
      {/* URL Input Modal */}
      <Overlay $show={showUrlInput} onClick={() => setShowUrlInput(false)} />
      <UrlInputContainer $show={showUrlInput}>
        <h3>Add Web Page or YouTube Video</h3>
        <UrlInputForm onSubmit={handleUrlSubmit}>
          <UrlInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            required
          />
          <Button 
            $primary 
            type="submit"
            disabled={uploading}
          >
            {uploading ? <FiLoader /> : <FiSend />}
          </Button>
        </UrlInputForm>
        <CloseButton onClick={() => setShowUrlInput(false)}>×</CloseButton>
      </UrlInputContainer>
      
      {/* Source Details Modal */}
      <Overlay $show={!!selectedSource} onClick={() => setSelectedSource(null)} />
      <SourceDetails $show={!!selectedSource}>
        {selectedSource && (
          <>
            <h3>Source Details</h3>
            <p><strong>Title:</strong> {selectedSource.title || 'N/A'}</p>
            <p><strong>Type:</strong> {selectedSource.source_type}</p>
            <p><strong>Content:</strong></p>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
              {selectedSource.text}
            </div>
            <a href={selectedSource.source} target="_blank" rel="noopener noreferrer">
              View source
            </a>
          </>
        )}
        <CloseButton onClick={() => setSelectedSource(null)}>×</CloseButton>
      </SourceDetails>
      
      {/* Processing Indicators */}
      {processingFile && (
        <ProcessingIndicator
          fileName={processingFile.name}
          fileType={processingFile.type}
          isProcessing={uploading}
          onComplete={() => setProcessingFile(null)}
        />
      )}
      
      {processingUrl && (
        <ProcessingIndicator
          fileName={processingUrl.url}
          fileType={processingUrl.type}
          isProcessing={uploading}
          onComplete={() => setProcessingUrl(null)}
        />
      )}
    </>
  );
};

export default ChatInterface;
