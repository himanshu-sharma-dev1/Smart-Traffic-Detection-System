from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult
from celery_worker import process_image_task
import base64

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/detect", status_code=status.HTTP_202_ACCEPTED)
async def detect_image(file: UploadFile = File(...)):
    """
    Receives an image, dispatches it to a Celery worker for processing,
    and returns a task ID for polling.
    """
    contents = await file.read()

    # Dispatch the task to the Celery worker
    task = process_image_task.delay(contents)

    # Also include the original image for immediate display on the results page
    encoded_image = base64.b64encode(contents).decode('utf-8')

    return {"task_id": task.id, "image": encoded_image}


@app.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """
    Checks the status of a Celery task.
    """
    task_result = AsyncResult(task_id)
    return {"status": task_result.status}


@app.get("/tasks/{task_id}/result")
async def get_task_result(task_id: str):
    """
    Retrieves the result of a completed Celery task.
    """
    task_result = AsyncResult(task_id)
    if not task_result.ready():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not ready or not found.")

    if task_result.failed():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Task failed.")

    result = task_result.get()
    return {"detections": result.get("detections", [])}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
