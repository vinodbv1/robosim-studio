# Flask Backend Setup for Robot Simulation

This document provides instructions for setting up the Python Flask backend for the robot simulation application.

## Prerequisites

- Python 3.8+
- pip
- virtualenv (recommended)

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install required packages:
```bash
pip install flask flask-cors matplotlib numpy pyyaml
pip install git+https://github.com/hanruihua/ir-sim.git
```

## Project Structure

```
backend/
├── app.py                 # Main Flask application
├── config_manager.py      # YAML configuration manager
├── simulation_runner.py   # IR-SIM simulation handler
├── maps/                  # Map images directory
│   ├── hm3d_1.png
│   ├── hm3d_2.png
│   ├── ...
│   └── cave.png
└── config/
    └── simulation_config.yaml  # Simulation configuration
```

## Backend API Endpoints

### 1. GET /api/get-map
Retrieves a map image by name.

**Query Parameters:**
- `map_name`: Name of the map file (e.g., "hm3d_1.png")

**Response:**
- Image file (PNG format)

### 2. POST /api/start-simulation
Starts the robot simulation with provided parameters.

**Request Body:**
```json
{
  "map_name": "hm3d_1.png",
  "robot_count": 3,
  "robot_position": {
    "x": 400,
    "y": 300
  },
  "survivors": [
    {"x": 100, "y": 150},
    {"x": 200, "y": 250},
    {"x": 300, "y": 350}
  ]
}
```

**Response:**
Server-Sent Events (SSE) stream with simulation frames:
```
data: {"frame": "base64_encoded_image_data"}
data: {"frame": "base64_encoded_image_data"}
...
data: {"status": "completed"}
```

### 3. POST /api/pause-simulation
Pauses or resumes the current simulation.

**Request Body:**
```json
{
  "paused": true
}
```

### 4. POST /api/stop-simulation
Stops the current simulation.

## Implementation Files

### app.py
```python
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import os
import json
import time
import base64
from io import BytesIO
from config_manager import ConfigManager
from simulation_runner import SimulationRunner

app = Flask(__name__)
CORS(app)

MAPS_DIR = os.path.join(os.path.dirname(__file__), 'maps')
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config', 'simulation_config.yaml')

config_manager = ConfigManager(CONFIG_FILE)
simulation_runner = None

@app.route('/api/get-map', methods=['GET'])
def get_map():
    map_name = request.args.get('map_name')
    if not map_name:
        return jsonify({'error': 'Map name required'}), 400
    
    map_path = os.path.join(MAPS_DIR, map_name)
    if not os.path.exists(map_path):
        return jsonify({'error': 'Map not found'}), 404
    
    return send_file(map_path, mimetype='image/png')

@app.route('/api/start-simulation', methods=['POST'])
def start_simulation():
    global simulation_runner
    
    data = request.json
    map_name = data.get('map_name')
    robot_count = data.get('robot_count', 1)
    robot_position = data.get('robot_position')
    survivors = data.get('survivors', [])
    
    # Update configuration
    config_manager.update_config(
        map_name=map_name,
        robot_count=robot_count,
        robot_position=robot_position,
        survivor_positions=survivors
    )
    
    # Initialize simulation runner
    map_path = os.path.join(MAPS_DIR, map_name)
    simulation_runner = SimulationRunner(CONFIG_FILE, map_path)
    
    def generate_frames():
        try:
            for frame_data in simulation_runner.run():
                if frame_data['status'] == 'completed':
                    yield f"data: {json.dumps({'status': 'completed'})}\n\n"
                    break
                else:
                    # Convert matplotlib figure to base64
                    buffer = BytesIO()
                    frame_data['frame'].savefig(buffer, format='png')
                    buffer.seek(0)
                    image_base64 = base64.b64encode(buffer.read()).decode()
                    
                    yield f"data: {json.dumps({'frame': image_base64})}\n\n"
                    time.sleep(0.05)  # Control frame rate
        except Exception as e:
            print(f"Error in simulation: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate_frames(), mimetype='text/event-stream')

@app.route('/api/pause-simulation', methods=['POST'])
def pause_simulation():
    global simulation_runner
    data = request.json
    paused = data.get('paused', True)
    
    if simulation_runner:
        simulation_runner.set_paused(paused)
        return jsonify({'status': 'paused' if paused else 'resumed'})
    
    return jsonify({'error': 'No active simulation'}), 400

@app.route('/api/stop-simulation', methods=['POST'])
def stop_simulation():
    global simulation_runner
    
    if simulation_runner:
        simulation_runner.stop()
        simulation_runner = None
        return jsonify({'status': 'stopped'})
    
    return jsonify({'error': 'No active simulation'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)
```

### config_manager.py
```python
import yaml
import os

class ConfigManager:
    """Manages YAML configuration for robot simulation"""
    
    def __init__(self, config_path):
        self.config_path = config_path
        self.ensure_config_exists()
    
    def ensure_config_exists(self):
        """Create default config if it doesn't exist"""
        if not os.path.exists(self.config_path):
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            default_config = {
                'world': {
                    'width': 800,
                    'height': 600,
                    'obstacles': []
                },
                'robots': []
            }
            self.save_config(default_config)
    
    def load_config(self):
        """Load configuration from YAML file"""
        with open(self.config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def save_config(self, config):
        """Save configuration to YAML file"""
        with open(self.config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
    
    def update_config(self, map_name, robot_count, robot_position, survivor_positions):
        """
        Update configuration with simulation parameters
        
        Args:
            map_name: Name of the map file
            robot_count: Number of robots
            robot_position: Dict with x, y coordinates for robot start
            survivor_positions: List of dicts with x, y coordinates for survivors
        """
        config = self.load_config()
        
        # Update world settings
        config['world'] = {
            'width': 800,
            'height': 600,
            'map': map_name
        }
        
        # Create robot configurations
        robots = []
        for i in range(robot_count):
            robot = {
                'id': f'robot_{i}',
                'start_position': {
                    'x': robot_position['x'],
                    'y': robot_position['y']
                },
                'goals': [
                    {'x': pos['x'], 'y': pos['y']} 
                    for pos in survivor_positions
                ],
                'max_speed': 1.0,
                'sensor_range': 50
            }
            robots.append(robot)
        
        config['robots'] = robots
        
        # Save updated config
        self.save_config(config)
        
        return config
```

### simulation_runner.py
```python
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
import time

# Note: This is a simplified example. You'll need to adapt based on ir-sim's actual API
# from ir_sim import World, Robot  # Import from actual ir-sim package

class SimulationRunner:
    """Handles running the IR-SIM simulation"""
    
    def __init__(self, config_path, map_path):
        self.config_path = config_path
        self.map_path = map_path
        self.paused = False
        self.stopped = False
        
        # Initialize ir-sim environment here
        # self.env = World(config_path)
        # self.env.load_map(map_path)
    
    def run(self):
        """
        Run simulation and yield frames
        
        Yields:
            dict: Frame data with matplotlib figure or status
        """
        step = 0
        max_steps = 1000
        
        while step < max_steps and not self.stopped:
            if self.paused:
                time.sleep(0.1)
                continue
            
            # Run simulation step
            # done = self.env.step()
            
            # Render current state
            # fig = self.env.render()
            
            # For demo purposes, create a simple matplotlib figure
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, f'Simulation Step: {step}', 
                   ha='center', va='center', fontsize=16)
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            plt.tight_layout()
            
            yield {'frame': fig, 'status': 'running'}
            
            plt.close(fig)
            
            # Check if simulation is complete
            # if done:
            #     yield {'status': 'completed'}
            #     break
            
            step += 1
            
            # Demo: Complete after 100 steps
            if step >= 100:
                yield {'status': 'completed'}
                break
    
    def set_paused(self, paused):
        """Pause or resume simulation"""
        self.paused = paused
    
    def stop(self):
        """Stop simulation"""
        self.stopped = True
```

## Running the Backend

1. Ensure all map images are in the `maps/` directory
2. Start the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

## Integration with Frontend

The React frontend expects the backend at `http://localhost:5000`. Make sure to:
1. Start the backend before testing the frontend
2. Ensure CORS is properly configured
3. Place all map images in the `backend/maps/` directory

## Notes

- The `simulation_runner.py` file contains placeholder code. You'll need to integrate the actual ir-sim library based on its API documentation.
- Map images should be in PNG format and placed in the `maps/` directory
- The simulation uses Server-Sent Events (SSE) for real-time frame streaming
- Adjust frame rate by modifying the `time.sleep()` value in `app.py`

## Troubleshooting

- **CORS errors**: Ensure `flask-cors` is installed and CORS is enabled
- **Map not loading**: Check that map files exist in `backend/maps/`
- **Simulation not starting**: Verify ir-sim is properly installed
- **Connection refused**: Ensure Flask backend is running on port 5000
