# Homework Assistant

## Overview

This is a full-stack web application that provides AI-powered homework assistance. The application allows users to submit text, images, PDFs, and documents, then processes them using various Large Language Model (LLM) providers to generate detailed solutions. The system features drag-and-drop file uploads, voice input capabilities, mathematical notation rendering, and PDF export functionality.

## System Architecture

The application follows a full-stack architecture with clear separation between client and server:

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Math Rendering**: MathJax for mathematical notation display

### Backend (Node.js + Express)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for API routes
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for file uploads with support for PDFs, images, and documents
- **OCR**: Tesseract.js for image text extraction
- **PDF Processing**: pdf2json for PDF text extraction

### Database Schema
- **Primary Entity**: `assignments` table storing:
  - Input text and file metadata
  - Processing results and LLM responses
  - Provider information and processing times
  - Creation timestamps

## Key Components

### File Processing Pipeline
1. **File Upload**: Drag-and-drop or file picker interface
2. **Text Extraction**: 
   - Images: OCR using Tesseract.js
   - PDFs: Text extraction using pdf2json
   - Documents: Direct text processing
3. **LLM Processing**: Integration with multiple AI providers
4. **Response Generation**: Formatted solutions with math notation

### LLM Integration
- **Anthropic Claude**: Primary AI provider for text processing
- **OpenAI GPT**: Alternative provider option
- **Azure OpenAI**: Enterprise-grade OpenAI integration
- **Provider Selection**: User-selectable AI model choice

### Voice Input System
- **Speech Recognition**: Browser-based Web Speech API
- **Azure Speech Services**: Enhanced speech-to-text capabilities
- **Real-time Transcription**: Live voice input with interim results

### Mathematical Notation
- **MathJax Integration**: Automatic rendering of mathematical expressions
- **LaTeX Support**: Full LaTeX mathematical notation support
- **Print Optimization**: Specialized formatting for PDF generation

## Data Flow

1. **Input Processing**:
   - User submits text or uploads files
   - Files are processed for text extraction
   - Content is validated and stored

2. **AI Processing**:
   - Extracted text is sent to selected LLM provider
   - AI generates detailed solution with step-by-step explanations
   - Response is stored with metadata

3. **Output Generation**:
   - Solutions are rendered with mathematical notation
   - Content is formatted for display and export
   - Users can edit, save, or export results

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (configured via DATABASE_URL)
- **LLM APIs**: Anthropic, OpenAI, Azure OpenAI (API keys required)
- **CDN Services**: MathJax, Google Fonts
- **Speech Services**: Azure Cognitive Services (optional)

### Development Dependencies
- **Build Tools**: Vite, ESBuild, TypeScript compiler
- **Linting**: ESLint with TypeScript support
- **CSS Processing**: PostCSS with Tailwind CSS

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React application to `dist/public`
2. **Backend Build**: ESBuild bundles server code to `dist/index.js`
3. **Database Migration**: Drizzle applies schema changes
4. **Static Assets**: Client assets served from server

### Environment Configuration
- **Development**: Local development with hot reloading
- **Production**: Optimized builds with environment-specific configurations
- **Database**: Automated provisioning via Replit PostgreSQL

### Hosting Requirements
- **Node.js Runtime**: Version 20+ required
- **PostgreSQL Database**: Persistent storage for assignments
- **External API Access**: Outbound connections for LLM providers
- **File Upload Support**: Temporary file storage for processing

## Changelog

- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.