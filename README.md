# Smart Traffic Detection System 🚦

## Project Overview

The Smart Traffic Detection System is an innovative web application designed to enhance road safety and traffic efficiency through AI-powered traffic sign recognition. Leveraging Google Cloud Vision AI, the system accurately identifies various traffic signs from live webcam feeds or uploaded images, presenting the results in a visually appealing and interactive user interface.

This project demonstrates a modern full-stack architecture, combining a FastAPI backend for AI integration and a React frontend for a rich user experience.

## Key Features

✨ **AI-Powered Traffic Sign Detection:** Utilizes Google Cloud Vision AI for highly accurate and broad traffic sign recognition.
📸 **Webcam & Image Upload:** Supports real-time detection from your webcam or allows users to upload images from their device.
🖼️ **Dynamic Bounding Boxes:** Bounding boxes and labels are drawn dynamically on the frontend using HTML Canvas, providing a flexible and interactive display of detection results.
🚀 **Interactive & Visually Appealing UI:**
    *   **Multi-Page Navigation:** A sleek, multi-page React frontend with dedicated sections for Home, Features, Detection, About Us, and Contact.
    *   **Animated Transitions:** Smooth, "slides-like" page transitions with subtle background color changes for a premium feel.
    *   **Dynamic Background:** A subtle, animated gradient background across the application.
    *   **Hero Section Animations:** Engaging text and button animations on the homepage.
    *   **Interactive Elements:** Custom loading states, button ripple effects, and animated detection results with confidence visualizers.
    *   **High-Quality Imagery:** Designed to showcase high-quality landscape, electric vehicle, and traffic sign images (user-provided).
📊 **Dedicated Results Page:** Automatically redirects to a separate page to display detailed detection results after processing.

## Technologies Used

### Backend (Python FastAPI)
*   **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python 3.7+.
*   **Google Cloud Vision AI:** Cloud-based machine learning service for image analysis.
*   **Uvicorn:** An ASGI server for running FastAPI applications.
*   **NumPy & OpenCV (`cv2`):** For image processing tasks (decoding, encoding).

### Frontend (React)
*   **React.js:** A JavaScript library for building user interfaces.
*   **React Bootstrap:** The most popular frontend framework rebuilt for React.
*   **React Router DOM:** For declarative routing in React applications.
*   **React Transition Group:** For managing component transition states.
*   **Axios:** Promise-based HTTP client for the browser and Node.js.
*   **React Toastify:** For easy and customizable toast notifications.
*   **HTML Canvas API:** For dynamic drawing of bounding boxes.

## Setup and Installation

Follow these steps to get the project up and running on your local machine.

### Prerequisites

*   **Python 3.8+:** [Download Python](https://www.python.org/downloads/)
*   **Node.js & npm (or Yarn)::** [Download Node.js](https://nodejs.org/en/download/)
*   **Google Cloud Project & Credentials:**
    1.  Create a Google Cloud Project: [Google Cloud Console](https://console.cloud.google.com/)
    2.  Enable the "Cloud Vision API" within your project.
    3.  Create a Service Account Key:
        *   Go to `IAM & Admin` > `Service Accounts`.
        *   Create a new service account.
        *   Grant it the `Cloud Vision API User` role.
        *   Create a new JSON key and download it. **Keep this file secure!**
    4.  Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the **absolute path** of this JSON key file. This environment variable must be set in the terminal session where you run the backend server.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
cd YOUR_REPOSITORY_NAME # Replace with your actual repository name
```

### 2. Backend Setup

Navigate to the project root directory and install the Python dependencies.

```bash
pip install -r requirements.txt
```

### 3. Frontend Setup

Navigate into the `frontend` directory and install the Node.js dependencies.

```bash
cd frontend
npm install
```

### 4. Running the Application

You will need two separate terminal windows to run the backend and frontend concurrently.

#### Terminal 1: Start the Backend Server

1.  **Navigate to the project root directory.**
2.  **Set your Google Cloud credentials environment variable.**
3.  **Start the FastAPI backend server:**
    ```bash
    python3 run.py
    ```
    *The backend server will typically run on `http://0.0.0.0:8000`.*

#### Terminal 2: Start the Frontend Development Server

1.  **Open a new terminal window.**
2.  **Navigate to the `frontend` directory.**
3.  **Start the React development server:**
    ```bash
    npm start
    ```
    *The frontend application will typically open in your browser at `http://localhost:3000`.*

## Usage

1.  Open your web browser and navigate to `http://localhost:3000`.
2.  Explore the visually appealing homepage and other sections.
3.  Go to the "Detection" page.
4.  You can either:
    *   Click "Start Camera" to activate your webcam, then "Capture from Webcam" to process a live frame.
    *   Click "Upload Image" to select an image file from your computer for detection.
5.  After processing, you will be automatically redirected to the "Results" page, where the detected traffic signs and their bounding boxes will be displayed on the image.

## Future Improvements (Ideas)

*   **Persistent Detection History:** Implement a backend database to store and retrieve past detection results for users.
*   **Asynchronous Backend Processing:** Use a task queue (e.g., Celery) to handle image processing in the background, improving API responsiveness.
*   **Advanced UI/UX:** Explore libraries for true 3D rendering of signs/emojis or more complex interactive elements.
*   **Comprehensive Testing:** Add unit, integration, and end-to-end tests for both frontend and backend.
*   **Containerization & CI/CD:** Dockerize the application and set up automated build and deployment pipelines.

## License

MIT License

Copyright (c) 2025 Himanshu Sharma

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contact

Himanshu Sharma
