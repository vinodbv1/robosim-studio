import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import yaml
import os
import time

class SimulationRunner:
    """
    Handles running the IR-SIM simulation
    
    Note: This is a simplified implementation for demonstration.
    Replace with actual ir-sim integration when library is available.
    """
    
    def __init__(self, config_path, map_path):
        self.config_path = config_path
        self.map_path = map_path
        self.paused = False
        self.stopped = False
        
        # Load configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Load map image
        if os.path.exists(map_path):
            self.map_image = Image.open(map_path)
        else:
            self.map_image = None
            print(f"Warning: Map not found at {map_path}")
        
        # Initialize robot states
        self.robot_states = []
        for robot in self.config['robots']:
            state = {
                'id': robot['id'],
                'x': robot['start_position']['x'],
                'y': robot['start_position']['y'],
                'theta': robot['start_position']['theta'],
                'goal_index': 0,
                'goals': robot['goals'],
                'color': robot['color'],
                'radius': robot['radius'],
                'max_speed': robot['max_speed']
            }
            self.robot_states.append(state)
        
        # Get obstacles (survivors)
        self.obstacles = self.config['world']['obstacles']
        
        print(f"Initialized simulation with {len(self.robot_states)} robots and {len(self.obstacles)} survivors")
    
    def run(self):
        """
        Run simulation and yield frames
        
        Yields:
            dict: Frame data with matplotlib figure or status
        """
        step = 0
        max_steps = self.config['simulation']['max_steps']
        goal_threshold = self.config['simulation']['goal_threshold']
        
        while step < max_steps and not self.stopped:
            if self.paused:
                time.sleep(0.1)
                continue
            
            # Update robot positions (simple navigation toward goals)
            all_completed = True
            for robot_state in self.robot_states:
                if robot_state['goal_index'] < len(robot_state['goals']):
                    all_completed = False
                    self._update_robot_position(robot_state, goal_threshold)
            
            # Render current state
            fig = self._render_state(step)
            
            yield {'frame': fig, 'status': 'running'}
            
            plt.close(fig)
            
            # Check if all robots completed their goals
            if all_completed:
                print("Simulation completed: All robots reached their goals")
                yield {'status': 'completed'}
                break
            
            step += 1
            time.sleep(0.05)  # Control simulation speed
        
        if step >= max_steps:
            print("Simulation completed: Max steps reached")
            yield {'status': 'completed'}
    
    def _update_robot_position(self, robot_state, goal_threshold):
        """Update robot position moving toward current goal"""
        if robot_state['goal_index'] >= len(robot_state['goals']):
            return  # All goals reached
        
        current_goal = robot_state['goals'][robot_state['goal_index']]
        
        # Calculate direction to goal
        dx = current_goal['x'] - robot_state['x']
        dy = current_goal['y'] - robot_state['y']
        distance = np.sqrt(dx**2 + dy**2)
        
        # Check if goal is reached
        if distance < goal_threshold:
            robot_state['goal_index'] += 1
            print(f"{robot_state['id']} reached goal {robot_state['goal_index']}/{len(robot_state['goals'])}")
            return
        
        # Move toward goal
        speed = min(robot_state['max_speed'] * 0.1, distance)  # Scaled movement
        robot_state['x'] += (dx / distance) * speed
        robot_state['y'] += (dy / distance) * speed
        robot_state['theta'] = np.arctan2(dy, dx)
    
    def _render_state(self, step):
        """Render current simulation state"""
        fig, ax = plt.subplots(figsize=(10, 7.5), facecolor='#1a1f2e')
        ax.set_facecolor('#1a1f2e')
        
        # Display map
        if self.map_image:
            ax.imshow(self.map_image, extent=[0, 800, 600, 0], alpha=0.7)
        
        # Draw obstacles (survivors)
        for i, obstacle in enumerate(self.obstacles):
            circle = plt.Circle(
                (obstacle['position']['x'], obstacle['position']['y']),
                obstacle['radius'],
                color='#ff4444',
                alpha=0.8,
                linewidth=2,
                edgecolor='white',
                label='Survivor' if i == 0 else ""
            )
            ax.add_patch(circle)
            ax.text(
                obstacle['position']['x'], 
                obstacle['position']['y'],
                'S',
                color='white',
                fontsize=8,
                fontweight='bold',
                ha='center',
                va='center'
            )
        
        # Draw robots
        for i, robot_state in enumerate(self.robot_states):
            # Robot body
            circle = plt.Circle(
                (robot_state['x'], robot_state['y']),
                robot_state['radius'],
                color=robot_state['color'],
                alpha=0.8,
                linewidth=3,
                edgecolor='white',
                label=f'Robot {i+1}' if i < 3 else ""
            )
            ax.add_patch(circle)
            
            # Robot orientation indicator
            arrow_length = robot_state['radius'] * 1.5
            dx = arrow_length * np.cos(robot_state['theta'])
            dy = arrow_length * np.sin(robot_state['theta'])
            ax.arrow(
                robot_state['x'], robot_state['y'],
                dx, dy,
                head_width=8, head_length=10,
                fc='white', ec='white',
                linewidth=2
            )
            
            # Draw path to current goal
            if robot_state['goal_index'] < len(robot_state['goals']):
                goal = robot_state['goals'][robot_state['goal_index']]
                ax.plot(
                    [robot_state['x'], goal['x']],
                    [robot_state['y'], goal['y']],
                    color=robot_state['color'],
                    linestyle='--',
                    alpha=0.4,
                    linewidth=1
                )
        
        # Configure plot
        ax.set_xlim(0, 800)
        ax.set_ylim(600, 0)  # Inverted Y axis to match image coordinates
        ax.set_aspect('equal')
        ax.set_title(
            f'Robot Simulation - Step {step}',
            color='#00d9ff',
            fontsize=14,
            fontweight='bold',
            fontfamily='monospace'
        )
        
        # Add legend
        ax.legend(
            loc='upper right',
            facecolor='#2a2f3e',
            edgecolor='#00d9ff',
            labelcolor='white',
            fontsize=8
        )
        
        # Style axes
        ax.tick_params(colors='#888888', labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor('#00d9ff')
            spine.set_linewidth(2)
        
        plt.tight_layout()
        
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
        plt.close('all')
