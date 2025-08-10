# AI Tutor

An AI-powered tutoring system that uses Retrieval-Augmented Generation (RAG) to provide accurate answers based on your uploaded documents.

## Features

- **Document Ingestion**: Upload PDFs, Word documents, web pages, and YouTube transcripts.
- **Smart Retrieval**: Find the most relevant information from your documents.
- **AI Answers**: Get accurate answers with source citations.
- **Interactive UI**: Clean, responsive chat interface with source references.

## Architecture

- **Backend**: FastAPI + Python
- **Vector Store**: FAISS with SentenceTransformers
- **LLM Integration**: OpenRouter API (mistralai/mistral-7b-instruct:free)
- **Frontend**: React + Vite

## Setup

### Prerequisites

- Docker and Docker Compose
- OpenRouter API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Dharan10/ai-tutor.git
cd ai-tutor
```

2. Create a `.env` file based on the example:

```bash
cp .env.example .env
```

3. Edit the `.env` file and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
SITE_URL=http://localhost:5173
SITE_NAME=AI Tutor
```

4. Start the application with Docker Compose:

```bash
docker-compose up -d
```

5. Access the application at http://localhost:5173

## Usage

1. **Upload Documents**: Use the upload button to add PDFs or Word documents.
2. **Add Web Content**: Use the link button to add web pages or YouTube videos.
3. **Ask Questions**: Type your questions in the chat and get AI-powered answers.
4. **View Sources**: Click on source cards to see where the information came from.

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Testing

Run backend tests:

```bash
cd backend
pytest
```

## License

MIT

---

Built with ❤️ and AI
