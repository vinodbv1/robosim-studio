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
            default_config = self._create_default_config()
            self.save_config(default_config)
            print(f"Created default config at {self.config_path}")
    
    def _create_default_config(self):
        """Create default configuration structure"""
        return {
            'world': {
                'width': 800,
                'height': 600,
                'map': None,
                'obstacles': []
            },
            'robots': [],
            'simulation': {
                'max_steps': 1000,
                'time_step': 0.1,
                'goal_threshold': 10.0
            }
        }
    
    def load_config(self):
        """Load configuration from YAML file"""
        with open(self.config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def save_config(self, config):
        """Save configuration to YAML file"""
        with open(self.config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
    
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
            'map': map_name,
            'obstacles': []  # Survivors will be added as obstacles
        }
        
        # Create robot configurations
        robots = []
        for i in range(robot_count):
            robot = {
                'id': f'robot_{i}',
                'type': 'diff_drive',  # Differential drive robot
                'start_position': {
                    'x': float(robot_position['x']),
                    'y': float(robot_position['y']),
                    'theta': 0.0  # Initial orientation
                },
                'goals': [
                    {
                        'x': float(pos['x']), 
                        'y': float(pos['y'])
                    } 
                    for pos in survivor_positions
                ],
                'max_speed': 50.0,  # pixels per second
                'max_angular_speed': 2.0,  # radians per second
                'sensor_range': 100.0,  # pixels
                'radius': 15.0,  # robot radius in pixels
                'color': self._get_robot_color(i)
            }
            robots.append(robot)
        
        config['robots'] = robots
        
        # Add survivors as obstacles
        config['world']['obstacles'] = [
            {
                'type': 'circle',
                'position': {'x': float(pos['x']), 'y': float(pos['y'])},
                'radius': 10.0,
                'label': f'survivor_{i}'
            }
            for i, pos in enumerate(survivor_positions)
        ]
        
        # Update simulation parameters
        config['simulation'] = {
            'max_steps': 1000,
            'time_step': 0.1,
            'goal_threshold': 15.0  # Distance threshold to consider goal reached
        }
        
        # Save updated config
        self.save_config(config)
        
        print(f"Configuration updated: {robot_count} robots, {len(survivor_positions)} survivors")
        
        return config
    
    def _get_robot_color(self, index):
        """Get color for robot based on index"""
        colors = [
            '#00d9ff',  # cyan
            '#00ff88',  # green
            '#ff6b00',  # orange
            '#ff00ff',  # magenta
            '#ffff00',  # yellow
            '#00ffff',  # cyan
            '#ff0088',  # pink
            '#88ff00',  # lime
            '#0088ff',  # blue
            '#ff8800'   # orange
        ]
        return colors[index % len(colors)]
    
    def add_robot_attribute(self, robot_id, attribute_name, attribute_value):
        """
        Add or update a custom attribute for a specific robot
        
        Args:
            robot_id: ID of the robot
            attribute_name: Name of the attribute
            attribute_value: Value of the attribute
        """
        config = self.load_config()
        
        for robot in config['robots']:
            if robot['id'] == robot_id:
                robot[attribute_name] = attribute_value
                break
        
        self.save_config(config)
    
    def add_obstacle_attribute(self, obstacle_index, attribute_name, attribute_value):
        """
        Add or update a custom attribute for a specific obstacle
        
        Args:
            obstacle_index: Index of the obstacle
            attribute_name: Name of the attribute
            attribute_value: Value of the attribute
        """
        config = self.load_config()
        
        if obstacle_index < len(config['world']['obstacles']):
            config['world']['obstacles'][obstacle_index][attribute_name] = attribute_value
            self.save_config(config)
