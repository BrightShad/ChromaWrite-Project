# ChromaWrite

ChromaWrite is a web-based creative writing application that analyzes the emotional tone of your prose in real-time, dynamically shifting the application's color theme to match your narrative's emotional arc. It acts as an immersive writing companion, blending the art of writing with ambient visual feedback.

## Features

- **Real-Time Emotion Scoring**: Analyzing your writing locally every 20 words to detect the dominant emotional currents.
- **Dynamic Blended Backgrounds**: Blending color palettes seamlessly if multiple emotions are coexisting, giving immediate visual feedback.
- **Ambient Assistant**: An integrated assistant that notices shifts, coexisting currents, or stalls in the narrative flow and prompts you with questions like an extra companion.
- **Rich Illustration Scenes**: Accumulating "scene energy" as you write, allowing you to generate customized, high-quality landscape illustrations matching your story's current mood.
- **Story Archive & telemetry**: Autosaving every 3 seconds to database/localStorage, keeping record of previous stories, word count metrics, writing speed, and emotional shift tracking.
- **Beautiful Exports**: Exporting completed stories into beautifully styled PDF documents with landscape illustrations inline.

## Tech Stack

### Frontend
- **Framework**: Vite + React
- **Styling**: Vanilla CSS custom variables linked directly to the emotion engine + Tailwind CSS for layouts
- **Animation**: Framer Motion for transitions and components
- **State & Routing**: React Router DOM + React Query

### Backend
- **Framework**: FastAPI (Python)
- **Scoring Engine**: Local NLP keyword tokenizer & scorer with negation handling and 20-word / 40-word context verification
- **LLM Orchestration**: LangChain + ChatGroq for advanced features (writing continuations, custom emotion mapping, telemetry fingerprints)

## Setup & Running

Refer to [SETUP.md](file:///c:/Users/ishan/OneDrive/Desktop/ChromaWriteFinal-main/SETUP.md) for detailed installation and startup guidelines.
