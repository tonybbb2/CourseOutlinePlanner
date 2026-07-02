 # 📘 CourseOutlinePlanner

 **CourseOutlinePlanner** is a productivity tool that helps students convert course outlines into a semester schedule and sync it with Google Calendar.

 ## 🚀 Setup

 This repository has two parts:

 - `frontend/` — React + Vite app
 - `backend/` — FastAPI backend

 ### Prerequisites

 - Node.js 18+ and npm
 - Python 3.11+ (or a compatible 3.x version)
 - Google Cloud credentials for Calendar API access (optional for local testing, required for calendar sync)

 ---

 ## 🧩 Backend Setup

 1. Open a terminal in the `backend/` folder.
 2. Create a Python virtual environment.

 ```powershell
 cd backend
 python -m venv .venv
 .\.venv\Scripts\Activate.ps1
 ```

 3. Install dependencies.

 ```powershell
 pip install -r requirements.txt
 ```

 4. Create `backend/apikey.env` with your OpenAI key.

 ```text
 OPENAI_API_KEY=your_openai_api_key
 ```

 5. Verify Google credentials files.

 - `backend/credentials.json` should contain your OAuth client credentials.
 - `backend/token.json` is created automatically after the first Google sign-in.

 6. Start the backend server.

 ```powershell
 uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
 ```

 The backend should now be available at `http://127.0.0.1:8000`.

 ---

 ## 🧠 Frontend Setup

 1. Open a terminal in the `frontend/` folder.

 ```powershell
 cd frontend
 ```

 2. Install dependencies.

 ```powershell
 npm install
 ```

 3. Start the development server.

 ```powershell
 npm run dev
 ```

 The frontend should now be available at `http://127.0.0.1:5173`.

 ---

 ## 🔗 Recommended Local Workflow

 1. Run the backend first.
 2. Run the frontend second.
 3. Open the app in your browser and use the UI to connect Google Calendar.

 ---

 ## 🛠️ Notes

 - The backend loads environment variables from `backend/apikey.env`.
 - The backend allows CORS from `http://localhost:5173`, `http://127.0.0.1:5173`, and ports `3000`.
 - If you need to customize Google settings, update `backend/config.py` or add environment values to `apikey.env`.

 ---

 ## 📁 Project Structure

 - `frontend/` — React/Vite app
 - `backend/` — FastAPI API and Google/OpenAI integration
 - `backend/requirements.txt` — Python dependencies
 - `frontend/package.json` — Node dependencies and scripts

 ---

 ## 📝 Useful Commands

 Frontend:

 ```powershell
 npm run dev
 npm run build
 npm run preview
 ```

 Backend:

 ```powershell
 uvicorn backend.main:app --reload
 ```
