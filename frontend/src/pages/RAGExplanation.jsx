import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiHome, FiInfo, FiFileText, FiDatabase, FiSearch, FiMessageSquare } from 'react-icons/fi';

const PageContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    color: var(--primary-color);
    margin: 0;
  }
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary-color);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--primary-color);
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--primary-color);
    color: white;
  }
`;

const Section = styled.section`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eaeaea;
`;

const SubSection = styled.div`
  margin-bottom: 2rem;
`;

const SubTitle = styled.h3`
  font-size: 1.5rem;
  color: #333;
  margin: 1.5rem 0 1rem;
`;

const Paragraph = styled.p`
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const List = styled.ul`
  margin-bottom: 2rem;
  padding-left: 1.5rem;
  
  li {
    margin-bottom: 0.75rem;
    line-height: 1.6;
  }
`;

const Diagram = styled.div`
  background-color: #f3f4f6;
  border-radius: 0.75rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  text-align: center;
  
  pre {
    font-family: monospace;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
  }
`;

const Process = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const Step = styled.div`
  flex: 1;
  min-width: 250px;
  background-color: #f3f4f6;
  border-left: 5px solid var(--primary-color);
  border-radius: 0.5rem;
  padding: 1.25rem;
  
  h4 {
    margin-top: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    margin-bottom: 0;
  }
`;

const InfoBox = styled.div`
  background-color: #e6f7ff;
  border-left: 5px solid #1890ff;
  padding: 1.25rem;
  border-radius: 0.5rem;
  margin: 2rem 0;
`;

const ImagePlaceholder = styled.div`
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  padding: 3rem 1rem;
  text-align: center;
  margin: 2rem 0;
  border: 1px dashed #ccc;
`;

const RAGExplanation = () => {
  return (
    <PageContainer>
      <Header>
        <h1>Understanding Retrieval-Augmented Generation (RAG)</h1>
        <BackButton to="/">
          <FiChevronLeft /> Back to Chat
        </BackButton>
      </Header>
      
      <Section>
        <SectionTitle>What is RAG?</SectionTitle>
        <Paragraph>
          <strong>Retrieval-Augmented Generation (RAG)</strong> is an AI architecture that enhances language models 
          by combining them with a knowledge retrieval system. Instead of relying solely on the model's 
          pre-trained knowledge, RAG allows the model to access and use specific documents and information 
          to generate more accurate, up-to-date, and verifiable responses.
        </Paragraph>
        
        <Paragraph>
          Think of RAG as giving the AI the ability to "look up" information before answering 
          questions - similar to how a human might consult reference materials before providing an answer.
        </Paragraph>
        
                <Diagram>
                  <pre>
        {`            ┌──────────────┐     ┌─────────────┐     ┌─────────────────────┐
                    │  Your Query  │ ──> │  Retriever  │ ──> │ Relevant Information │
                    └──────────────┘     └─────────────┘     └──────────┬──────────┘
                                                                        │
                                                                        ▼
                                                            ┌─────────────────────┐
                                                            │ Language Generation │
                                                            └──────────┬──────────┘
                                                                        │
                                                                        ▼
                                                            ┌─────────────────────┐
                                                            │    Final Answer    │
                                                            └─────────────────────┘`}
                  </pre>
                </Diagram>
      </Section>
      
      <Section>
        <SectionTitle>How RAG Works in AI Tutor</SectionTitle>
        
        <Process>
          <Step>
            <h4><FiFileText /> Step 1: Document Ingestion</h4>
            <p>Documents (PDFs, web pages, etc.) are uploaded to the system and processed.</p>
          </Step>
          
          <Step>
            <h4><FiInfo /> Step 2: Document Chunking</h4>
            <p>Documents are split into smaller, meaningful pieces to enable precise information retrieval.</p>
          </Step>
          
          <Step>
            <h4><FiDatabase /> Step 3: Vector Embedding</h4>
            <p>Each chunk is converted into a numerical vector that captures its semantic meaning.</p>
          </Step>
          
          <Step>
            <h4><FiSearch /> Step 4: Similarity Search</h4>
            <p>When a question is asked, the system finds the most relevant chunks.</p>
          </Step>
          
          <Step>
            <h4><FiMessageSquare /> Step 5: Answer Generation</h4>
            <p>The AI model uses the retrieved information to generate an accurate, contextual answer.</p>
          </Step>
        </Process>
        
        <SubSection>
          <SubTitle>1. Document Ingestion & Processing</SubTitle>
          <Paragraph>
            When you upload files or provide URLs in AI Tutor, the system processes these documents to extract their content.
            Different processors handle various document types:
          </Paragraph>
          
          <List>
            <li><strong>PDF Processor:</strong> Extracts text, preserves page structure, and identifies headings</li>
            <li><strong>Web Page Processor:</strong> Parses HTML content, extracts relevant text, and discards navigation elements</li>
            <li><strong>Document Processor:</strong> Handles various text document formats</li>
            <li><strong>YouTube Processor:</strong> Extracts and processes transcripts from YouTube videos</li>
          </List>
        </SubSection>
        
        <SubSection>
          <SubTitle>2. Semantic Chunking</SubTitle>
          <Paragraph>
            The system divides documents into semantically meaningful chunks. Instead of arbitrary divisions, 
            our enhanced chunking system respects natural boundaries like paragraphs and sections. This preserves 
            context and ensures each chunk contains coherent information.
          </Paragraph>
          
          <ImagePlaceholder>
            [Illustration showing document chunking process]
          </ImagePlaceholder>
          
          <Paragraph>
            Each chunk typically contains 500-1000 tokens (roughly 375-750 words) with a small overlap 
            between adjacent chunks to maintain context continuity. The chunk size and overlap are carefully 
            balanced to maximize information density while enabling precise retrieval.
          </Paragraph>
        </SubSection>
        
        <SubSection>
          <SubTitle>3. Vector Embedding</SubTitle>
          <Paragraph>
            Each text chunk is converted into a high-dimensional vector (embedding) using a specialized neural network. 
            This vector numerically represents the semantic meaning of the text in a format that computers can efficiently process.
          </Paragraph>
          
          <Paragraph>
            AI Tutor uses the advanced <strong>BAAI/bge-large-en-v1.5</strong> embedding model, which creates 
            precise 1024-dimensional vectors that capture semantic relationships between texts with high fidelity. 
            These embeddings are normalized to optimize retrieval quality.
          </Paragraph>
          
          <InfoBox>
            <strong>Technical Note:</strong> Vector embeddings allow semantic similarity comparison through 
            mathematical operations. Two text chunks with similar meanings will have vectors that are close 
            together in the high-dimensional vector space, even if they use different words.
          </InfoBox>
        </SubSection>
        
        <SubSection>
          <SubTitle>4. Vector Storage & Retrieval</SubTitle>
          <Paragraph>
            The embeddings are stored in a FAISS (Facebook AI Similarity Search) vector database, which is 
            optimized for fast similarity searching even with millions of vectors.
          </Paragraph>
          
          <Paragraph>
            When you ask a question, your query is also converted to a vector embedding using the same model. 
            The system then finds the chunks whose vectors are closest to your query vector, indicating they 
            contain the most semantically relevant information.
          </Paragraph>
          
          <Diagram>
            <pre>
              Query: "What are the key benefits of RAG?"
                            │
                            ▼
              Query Vector: [0.12, 0.45, -0.21, ...]
                            │
                            ▼
              ┌───────────────────────────────────┐
              │ FAISS Vector Database Search      │
              │                                   │
              │ Find closest vectors to query     │
              │ by calculating similarity scores  │
              └───────────────────┬───────────────┘
                                  │
                                  ▼
              Returns most relevant text chunks
            </pre>
          </Diagram>
        </SubSection>
        
        <SubSection>
          <SubTitle>5. Answer Generation</SubTitle>
          <Paragraph>
            The retrieved text chunks are sent to a powerful language model (LLM) along with your original question. 
            The AI Tutor system uses a top-tier model configured with a carefully crafted system prompt that 
            guides the model to:
          </Paragraph>
          
          <List>
            <li>Analyze all provided chunks thoroughly</li>
            <li>Synthesize information from multiple sources</li>
            <li>Reference specific documents and sections</li>
            <li>Acknowledge contradictions or uncertainties</li>
            <li>Only use information from the provided chunks</li>
            <li>Clearly indicate when information is insufficient</li>
          </List>
          
          <Paragraph>
            This ensures the answer is accurate, helpful, and directly tied to the source documents you've provided.
          </Paragraph>
        </SubSection>
      </Section>
      
      <Section>
        <SectionTitle>Benefits of RAG</SectionTitle>
        
        <SubSection>
          <SubTitle>Factual Accuracy</SubTitle>
          <Paragraph>
            By retrieving information from your specific documents, RAG reduces "hallucinations" (made-up information) 
            that can occur with standard language models. The AI can only reference what's in your documents, 
            leading to more accurate and trustworthy responses.
          </Paragraph>
        </SubSection>
        
        <SubSection>
          <SubTitle>Knowledge Customization</SubTitle>
          <Paragraph>
            RAG allows the AI to access your specific documents, making it a personalized knowledge base 
            tailored to your needs. It can reference your internal documents, specialized content, or 
            latest information that may not be part of the model's training data.
          </Paragraph>
        </SubSection>
        
        <SubSection>
          <SubTitle>Source Attribution</SubTitle>
          <Paragraph>
            Unlike traditional AI, RAG can cite its sources - showing you exactly where the information came from. 
            This transparency builds trust and allows you to verify information directly.
          </Paragraph>
        </SubSection>
        
        <SubSection>
          <SubTitle>Up-to-Date Information</SubTitle>
          <Paragraph>
            By using your recently uploaded documents, RAG can access current information beyond what 
            the model was originally trained on, keeping responses current and relevant.
          </Paragraph>
        </SubSection>
        
        <SubSection>
          <SubTitle>Knowledge Expansion</SubTitle>
          <Paragraph>
            As you add more documents, the system's knowledge expands, making it increasingly capable 
            of answering a wider range of questions specific to your needs.
          </Paragraph>
        </SubSection>
      </Section>
      
      <Section>
        <SectionTitle>How to Get the Best Results</SectionTitle>
        
        <List>
          <li><strong>Upload diverse, high-quality documents</strong> - The quality of responses depends on the quality of your source materials</li>
          <li><strong>Ask specific questions</strong> - More specific queries help the retrieval system find the most relevant information</li>
          <li><strong>Upload multiple document types</strong> - PDFs, web pages, and other formats provide complementary information</li>
          <li><strong>Consider document structure</strong> - Well-structured documents with clear headings and sections often yield better results</li>
          <li><strong>Review the sources</strong> - Check the source snippets provided with answers to verify the information</li>
        </List>
      </Section>
      
      <BackButton to="/" style={{ marginBottom: '3rem' }}>
        <FiHome /> Return to AI Tutor
      </BackButton>
    </PageContainer>
  );
};

export default RAGExplanation;
