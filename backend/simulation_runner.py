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
                
                # Render current state with map overlay (returns image bytes)
                frame_bytes = self._render_with_map(step)
                
                yield {'frame': frame_bytes, 'status': 'running'}
                
                plt.close('all')  # Close all figures to prevent memory leaks
                
                # Check if simulation is done
                if self.env.done():
                    print("Simulation completed: All robots reached their goals")
                    yield {'status': 'completed'}
                    break
                
                step += 1
                time.sleep(0.05)  # Control frame rate
                
            except Exception as e:
                print(f"Error during simulation step: {e}")
                import traceback
                traceback.print_exc()
                yield {'status': 'error', 'message': str(e)}
                break
        
        if step >= max_steps:
            print("Simulation completed: Max steps reached")
            yield {'status': 'completed'}
    
    def _render_with_map(self, step):
        """Render ir-sim state with map overlay and return as image bytes"""
        # Call ir-sim's render function (renders to current figure)
        self.env.render(0.05)
        
        # Get the current figure that env.render() created
        fig = plt.gcf()
        ax = plt.gca()
        
        # If we have a map image, add it as background
        if self.map_image:
            # Add map as background layer (lowest zorder)
            ax.imshow(self.map_image, extent=[0, 8, 0, 6], alpha=0.3, zorder=0)
        
        # Customize the title and styling
        ax.set_title(
            f'Robot Simulation - Step {step}',
            color='#00d9ff',
            fontsize=14,
            fontweight='bold',
            fontfamily='monospace'
        )
        ax.set_xlabel('X (meters)', color='white')
        ax.set_ylabel('Y (meters)', color='white')
        ax.tick_params(colors='white')
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('white')
        ax.spines['left'].set_color('white')
        ax.spines['right'].set_color('white')
        fig.patch.set_facecolor('#1a1a2e')
        ax.set_facecolor('#0f0f1e')
        
        # Convert figure to bytes
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor=fig.get_facecolor())
        buf.seek(0)
        
        return buf.getvalue()
    
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
