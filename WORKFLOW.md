# Mediscan AI: Technical Architecture & Implementation Guide

## 1. Executive Summary & Design Philosophy

**Mediscan AI** is a clinical co-pilot designed to solve the "data entry bottleneck" in healthcare. The core promise is the **"3-Second Clinical Intelligence"**: a doctor should be able to scan a messy handwritten prescription or diverse lab report and receive structured, actionable clinical insights within seconds.

### **Why this architecture?**
Healthcare applications demand three things that are often at odds:
1.  **Extreme Speed**: Doctors cannot wait for loading spinners.
2.  **Reliability/Accuracy**: Clinical data must be parsed correctly.
3.  **Security/Privacy**: Patient data must be handled with care.

To achieve this, we chose a **Hybrid AI Architecture**:
-   **Specialized OCR (Google Document AI)**: For the "heavy lifting" of reading handwriting, checkboxes, and complex tables—tasks where generic LLMs often hallucinate.
-   **High-Speed Inference (Cerebras/Llama-3)**: To take that raw text and "reason" about it—structuring it into JSON and generating clinical summaries.
-   **Serverless-Compatible Backend**: An Express server detached from the frontend to handle heavy processing without blocking the UI.

---

## 2. Technology Stack & Decision Matrix

### **Frontend: React + Vite + TypeScript**
-   **Why Vite?**
    -   We needed immediate HMR (Hot Module Replacement) for rapid UI iteration.
    -   Legacy `create-react-app` was too slow. Vite uses native ES modules, making build times negligible.
-   **Why TypeScript?**
    -   Medical data is distinct and structured (Patients have IDs, Visits have timestamps). TypeScript ensures we don't accidentally treat a `blood_pressure` string as a number or miss a required `patient_id`.
-   **UI Library: shadcn/ui + Tailwind CSS**
    -   **Decision**: We avoided "heavy" component libraries like MUI.
    -   **Reason**: `shadcn/ui` gives us raw code ownership. We can customize the `Card` or `Button` component processing logic directly in our codebase (`src/components/ui`), which is crucial for creating bespoke medical interfaces.
-   **State Management: TanStack Query (React Query)**
    -   **Why?** Medical dashboards are "server-state" heavy. We don't need global client state (Redux) as much as we need "cached, mostly-fresh data from the server." React Query handles caching, re-fetching, and loading states out of the box.

### **Backend: Node.js + Express**
-   **Why Express instead of Next.js API Routes?**
    -   Next.js Serverless functions have strict timeout limits (often 10s on free tiers).
    -   Our OCR + LLM pipeline can take 5-15s for large PDFs.
    -   Express allows us to configure custom timeouts, handle `multipart/form-data` streams (via Multer) efficiently, and keep the processing logic "warm" if deployed on a container (e.g., AWS EC2/ECS) in the future.

### **Database: AWS DynamoDB**
-   **Why NoSQL?**
    -   Medical schemas are fluid. One patient visit might have a "Cardiology" object, another might have "Pediatrics".
    -   DynamoDB allows us to store arbitrary JSON documents while still allowing efficient queries on "Partition Keys" (e.g., `PatientID`).
-   **Why AWS?**
    -   Industry standard for HIPAA-compliant infrastructure.
    -   Scales to millions of reads/writes without manual sharding.

### **AI Pipeline: The "Hybrid" Approach**
-   **OCR: Google Document AI**
    -   **Reason**: It is currently the SOTA (State of the Art) for *handwriting recognition*. Generic vision models (GPT-4V) struggle with messy doctor handwriting.
-   **LLM: Cerebras (Llama 3.3)**
    -   **Reason**: Speed. Cerebras chips offer arguably the fastest inference on the market. We don't need "creative writing" (GPT-4); we need *fast, structured data extraction*. Llama 3 is sufficiently smart for this.

---

## 3. Detailed Architecture & File Responsibilities

### **Backend Structure**

#### **`server.js` - The Orchestrator**
This is the entry point. It does not just "serve" the app; it is the **Traffic Controller**.
-   **Middleware Chain**:
    1.  `cors()`: Allows our frontend to talk to the backend.
    2.  `express.json()`: Parses JSON bodies.
    3.  `multer()`: The critical piece. It intercepts `multipart/form-data` requests (files) and stores them in **RAM (MemoryStorage)**. We do *not* save files to disk to minimize security footprints.
-   **The `/process-document` Endpoint**:
    -   This is a monolithic function for a reason: it's a linear pipeline.
    -   **Flow**: `Buffer -> Google OCR -> Raw Text -> LLM Prompt -> JSON -> DynamoDB`.
    -   It manages the "transactional" nature of the operation. If the DB save fails, we log it and return a precise error.

#### **`services/dynamo.service.js` - The Data Access Layer (DAL)**
-   **Design Pattern**: We use the **Repository Pattern**.
-   **Why?** The rest of the app shouldn't know we are using DynamoDB.
-   **Key Methods**:
    -   `createVisit()`: Handles generating UUIDs and timestamps.
    -   `queryVisits()`: Wraps the complex AWS SDK `dmodb.send(new QueryCommand(...))` syntax into a clean function call.
    -   **Marshalling**: DynamoDB uses specific JSON formats (`{ S: "some string" }`). The AWS Document Client allows us to skip this manual mapping, which we configure here.

#### **`routes/*.js` - The Controllers**
-   **`clinical.routes.js`**: Handles "read" operations for clinical data (Get Visit, Get Patient History).
-   **`intake.routes.js`**: Handles logical grouping for patient admission (Triage, Queues).
-   **Why split?** To keep code readable. As the app grows, `clinical` will handle medical logic, and `intake` will handle administrative logic.

### **Frontend Structure (`src/`)**

#### **`pages/VoiceMode.tsx`**
-   **Implementation**: A dedicated page for the Audio-First workflow.
-   **Tech**: Uses the **Web Speech API (`window.SpeechRecognition`)**.
-   **Why Native API?** It's free, processes locally (privacy), and has zero latency. No need to stream audio to a costly server API like Whisper unless strictly necessary.

#### **`pages/Dashboard.tsx`**
-   **Data Loading Strategy**: Uses `useQuery` (React Query) to fetch `/api/stats` and `/api/visits`.
-   **Optimistic Updates**: When you delete a patient, the UI updates *instantly*, then syncs with the server.

---

## 4. Technical Workflows (Step-by-Step)

### **A. The "Scan to Dashboard" Journey**
1.  **Capture**: User takes a photo in `CameraOCR.tsx`.
2.  **Upload**: The image Blob is appended to a `FormData` object.
3.  **Transport**: POST request sent to `http://localhost:3000/process-document`.
4.  **Processing (Server)**:
    -   Server receives the `file.buffer`.
    -   **Step 4a (Google)**: Buffer sent to `documentai.googleapis.com`. Returns a proto object. We extract `document.text`.
    -   **Step 4b (Cerebras)**: Text is injected into a specific "System Prompt" designed to force JSON output (`{ symptoms: [], diagnosis: ... }`).
5.  **Persistence**:
    -   `createDocument()`: Logs the technical metadata (filename, processing time).
    -   `createVisit()`: Stores the *actual clinical data*.
6.  **Response**: Frontend receives `{ visitId: "..." }` and immediately redirects to `/visit/:id`.

### **B. The "Differential Diagnosis (DDX)" Logic**
1.  **Trigger**: Doctor enters "Chest pain, radiating to left arm".
2.  **Analysis**:
    -   Backend receives the specialized prompt.
    -   It does *not* query a database of diseases. Instead, it leverages the **Knowledge Base** of the LLM.
    -   It asks the LLM to "Act as a Senior Cardiologist" to generate probabilities.
3.  **Optimization**: Results are cached. If you ask for "Chest pain" twice, the second response is nearly instant (if we enable Redis caching layer, currently implemented in-memory).

---

## 5. Security & Compliance Measures

1.  **Data Minimization**: We process files in memory. The original PDF/Image exists in RAM only for the duration of the request (seconds) and is then garbage collected. Only the *extracted fields* are persisted.
2.  **Environment Isolation**: Credentials (`AWS_ACCESS_KEY`, `GOOGLE_CREDENTIALS`) are injected at runtime via process environment variables. They are never committed to code.
3.  **Access Control**: All API routes are prepped for JWT middleware validation (currently open for demo simplicity, but the `auth` middleware hooks act as placeholders in `clinical.routes.js`).

---

## 6. Future Scalability Roadmap

1.  **Queue System**: Replace the in-memory processing in `server.js` with a **Redis/BullMQ** job queue. This will allow us to handle 1000s of simultaneous uploads without crashing the main server thread.
2.  **Vector Database**: Implement **Pinecone/pgvector** to store "embeddings" of patient histories. This would allow "Semantic Search" (e.g., "Find all patients with similar cardiac profiles" rather than just "Find patient John Doe").
3.  **Edge Caching**: Move the frontend assets to a CDN and cache static API responses (like hospital configuration) at the Edge.
