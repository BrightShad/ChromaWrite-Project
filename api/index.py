import os
import sys

# Add root folder to sys.path so Vercel can find main.py and the app/ directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
