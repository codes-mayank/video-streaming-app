from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import Base
from app.database import engine

from app.api.auth import router as auth_router


app = FastAPI(title='blog app')
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get('/test')
def test():
    return {'message': 'Name is Mayank'}

app.include_router(auth_router, prefix='/auth', tags=['Auth'])

@app.get('/')
def root():
    return {'message': 'Welcome to the blog site'}

