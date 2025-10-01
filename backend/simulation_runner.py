import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import irsim
import os
import time
from io import BytesIO

class SimulationRunner:
    """
    Handles running the IR-SIM simulation using the ir-sim library
    """
    
    def __init__(self, config_path, map_path):
        self.config_path = config_path
        self.map_path = map_path
        self.paused = False
        self.stopped = False
        self.env = None
        
        # Load map image for background overlay
        if os.path.exists(map_path):
            self.map_image = Image.open(map_path)
        else:
            self.map_image = None
            print(f"Warning: Map not found at {map_path}")
        
        # Initialize ir-sim environment
        try:
            self.env = irsim.make(config_path)
            print(f"Initialized ir-sim environment from {config_path}")
        except Exception as e:
            print(f"Error initializing ir-sim: {e}")
            raise
    
    def run(self):
        """
        Run ir-sim simulation and yield frames
        
        Yields:
            dict: Frame data with matplotlib figure or status
        """
        if not self.env:
            yield {'status': 'error', 'message': 'Environment not initialized'}
            return
        
        step = 0
        max_steps = 3000  # Maximum simulation steps
        
        while step < max_steps and not self.stopped:
            if self.paused:
                time.sleep(0.1)
                continue
            
            try:
                # Step the ir-sim environment
                self.env.step()
                
                # Render current state with map overlay
                fig = self._render_with_map(step)
                
                yield {'frame': fig, 'status': 'running'}
                
                plt.close(fig)
                
                # Check if simulation is done
                if self.env.done():
                    print("Simulation completed: All robots reached their goals")
                    yield {'status': 'completed'}
                    break
                
                step += 1
                time.sleep(0.05)  # Control frame rate
                
            except Exception as e:
                print(f"Error during simulation step: {e}")
                yield {'status': 'error', 'message': str(e)}
                break
        
        if step >= max_steps:
            print("Simulation completed: Max steps reached")
            yield {'status': 'completed'}
    
    def _render_with_map(self, step):
        """Render ir-sim state with map overlay"""
        # Call ir-sim's render with time parameter
        self.env.render(0.05)
        
        # Get the current matplotlib figure created by ir-sim
        fig = plt.gcf()
        
        # If we have a map image, overlay it in the background
        if self.map_image and fig:
            ax = fig.gca()
            
            # Scale map to world coordinates (800x600 pixels = 8x6 meters)
            ax.imshow(self.map_image, extent=[0, 8, 0, 6], alpha=0.3, zorder=0)
            
            # Update title
            ax.set_title(
                f'Robot Simulation - Step {step}',
                color='#00d9ff',
                fontsize=14,
                fontweight='bold',
                fontfamily='monospace'
            )
        
        return fig
    
    def set_paused(self, paused):
        """Pause or resume simulation"""
        self.paused = paused
        print(f"Simulation {'paused' if paused else 'resumed'}")
    
    def stop(self):
        """Stop simulation"""
        self.stopped = True
        print("Simulation stopped")
    
    def cleanup(self):
        """Clean up resources"""
        if self.env:
            self.env.end()
        plt.close('all')
