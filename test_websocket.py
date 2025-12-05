import asyncio
import websockets
import base64
import json
import cv2
import numpy as np

async def test_websocket():
    uri = "ws://localhost:8000/ws/detect"

    # Create a dummy image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(img, "Test Image", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    _, buffer = cv2.imencode('.jpg', img)
    encoded_image = base64.b64encode(buffer).decode('utf-8')

    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")

            # Send the image
            await websocket.send(encoded_image)
            print("Sent image frame")

            # Wait for response
            response = await websocket.recv()
            data = json.loads(response)

            print("Received response:")
            if "detections" in data:
                print(f"Detections: {data['detections']}")
                # Check for our placeholder detection
                found = False
                for d in data['detections']:
                    if d['label'] == 'System Check':
                        found = True
                        break

                if found:
                    print("SUCCESS: Placeholder detection verified.")
                else:
                    print("FAILURE: Did not find placeholder detection.")
            elif "error" in data:
                print(f"Error from server: {data['error']}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
