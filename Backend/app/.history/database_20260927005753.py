import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declaration_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv()
