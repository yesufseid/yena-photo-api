from fastapi import FastAPI, UploadFile, File
from insightface.app import FaceAnalysis
from PIL import Image
import numpy as np
import io

app = FastAPI()

face_app = FaceAnalysis(name="buffalo_s")
face_app.prepare(ctx_id=-1)

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    contents = await file.read()

    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image = np.array(image)

    faces = face_app.get(image)

    result = []

    for face in faces:
        result.append({
            "embedding": face.embedding.tolist(),
            "bbox": face.bbox.tolist()
        })

    return {
        "faces": result
    }