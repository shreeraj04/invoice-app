# Invoice App

A simple invoice management application with a Node.js backend and a static HTML/JS frontend.

## Features
- Create and manage invoices
- Send invoices via email
- SQLite database for storage

## Project Structure
```
backend/      # Node.js server, database, and API
frontend/     # Static HTML, CSS, and JS for UI
```

## Prerequisites
- Node.js (v16+ recommended)
- npm

## Setup Instructions

### 1. Clone the repository
```
git clone <your-repo-url>
cd invoice-app
```

### 2. Backend Setup
```
cd backend
npm install
```

- Create a `.env` file in the `backend/` directory with the following (do NOT commit this file):
```
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password_or_app_password
SENDER_NAME=Your Name
```

- Start the backend server:
```
npm start
```

### 3. Frontend Setup
Just open `frontend/index.html` in your browser.

## Notes
- Do NOT commit `.env` or any sensitive information.
- The sender's name and email credentials are loaded from environment variables.
- If you see any hardcoded personal details (like names), replace them with environment variables.

## License
MIT
