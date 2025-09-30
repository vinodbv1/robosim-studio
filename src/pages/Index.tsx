import { useState } from "react";
import { MapSelector } from "@/components/MapSelector";
import { RobotControls } from "@/components/RobotControls";
import { SimulationCanvas } from "@/components/SimulationCanvas";
import { StatusPanel } from "@/components/StatusPanel";
import { useToast } from "@/hooks/use-toast";
import { Bot } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

const API_BASE_URL = "http://localhost:5000"; // Backend Flask server

const Index = () => {
  const { toast } = useToast();
  const [selectedMap, setSelectedMap] = useState<string>("");
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [robotCount, setRobotCount] = useState<number>(1);
  const [robotPosition, setRobotPosition] = useState<Position | null>(null);
  const [survivors, setSurvivors] = useState<Position[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'simulating' | 'paused' | 'completed' | 'error'>('idle');
  const [simulationFrame, setSimulationFrame] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const handleMapSelect = async (mapName: string) => {
    setSelectedMap(mapName);
    setStatus('loading');
    setRobotPosition(null);
    setSurvivors([]);
    setSimulationFrame(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/get-map?map_name=${mapName}`);
      if (!response.ok) throw new Error('Failed to load map');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setMapUrl(url);
      setStatus('ready');
      
      toast({
        title: "Map Loaded",
        description: `${mapName} is ready for simulation setup`,
      });
    } catch (error) {
      console.error('Error loading map:', error);
      setStatus('error');
      toast({
        title: "Error",
        description: "Failed to load map. Ensure backend is running.",
        variant: "destructive"
      });
    }
  };

  const handleStartSimulation = async () => {
    if (!robotPosition) {
      toast({
        title: "Error",
        description: "Please set robot starting position",
        variant: "destructive"
      });
      return;
    }

    setStatus('simulating');
    setIsPaused(false);

    const payload = {
      map_name: selectedMap,
      robot_count: robotCount,
      robot_position: robotPosition,
      survivors: survivors
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/start-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to start simulation');

      // Start streaming frames
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.frame) {
              setSimulationFrame(`data:image/png;base64,${data.frame}`);
            } else if (data.status === 'completed') {
              setStatus('completed');
              toast({
                title: "Simulation Complete",
                description: "All robots have reached their destinations"
              });
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during simulation:', error);
      setStatus('error');
      toast({
        title: "Simulation Error",
        description: "Connection to backend failed. Ensure Flask server is running.",
        variant: "destructive"
      });
    }
  };

  const handlePauseSimulation = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/pause-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !isPaused })
      });
      setIsPaused(!isPaused);
      setStatus(isPaused ? 'simulating' : 'paused');
    } catch (error) {
      console.error('Error pausing simulation:', error);
    }
  };

  const handleStopSimulation = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/stop-simulation`, { method: 'POST' });
      setStatus('ready');
      setSimulationFrame(null);
      setIsPaused(false);
      
      toast({
        title: "Simulation Stopped",
        description: "Simulation has been terminated"
      });
    } catch (error) {
      console.error('Error stopping simulation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-mono font-bold text-foreground">
              ROBOT SIMULATION CONTROL
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            IR-SIM Multi-Robot Navigation System
          </p>
        </div>

        {/* Status Panel */}
        <div className="mb-6">
          <StatusPanel status={status} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-lg font-mono font-bold text-foreground mb-4 border-b border-border pb-2">
                  CONFIGURATION
                </h2>
                <MapSelector
                  selectedMap={selectedMap}
                  onMapSelect={handleMapSelect}
                  disabled={status === 'simulating'}
                />
              </div>

              <div className="border-t border-border pt-6">
                <RobotControls
                  robotCount={robotCount}
                  onRobotCountChange={setRobotCount}
                  survivorCount={survivors.length}
                  onStartSimulation={handleStartSimulation}
                  onPauseSimulation={handlePauseSimulation}
                  onStopSimulation={handleStopSimulation}
                  isSimulating={status === 'simulating' || status === 'paused'}
                  isPaused={isPaused}
                  hasRobotPosition={!!robotPosition}
                  disabled={status === 'idle' || status === 'loading'}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <h3 className="text-sm font-mono font-bold text-foreground mb-2">
                INSTRUCTIONS
              </h3>
              <ol className="text-xs font-mono text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Select a map from the dropdown</li>
                <li>Click on canvas to set robot start position</li>
                <li>Select number of robots</li>
                <li>Click to place survivors (max 15)</li>
                <li>Click START SIMULATION to begin</li>
              </ol>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-mono font-bold text-foreground mb-4 border-b border-border pb-2">
                SIMULATION VIEWPORT
              </h2>
              <SimulationCanvas
                mapUrl={mapUrl}
                robotPosition={robotPosition}
                onRobotPositionSet={setRobotPosition}
                survivors={survivors}
                onSurvivorAdd={(pos) => setSurvivors([...survivors, pos])}
                onSurvivorRemove={(index) => setSurvivors(survivors.filter((_, i) => i !== index))}
                simulationFrame={simulationFrame}
                isSimulating={status === 'simulating' || status === 'paused'}
                disabled={status === 'idle' || status === 'loading'}
              />
            </div>
          </div>
        </div>

        {/* Backend Notice */}
        {status === 'error' && (
          <div className="mt-6 p-4 bg-destructive/20 border border-destructive rounded-lg">
            <p className="text-sm font-mono text-destructive-foreground">
              <strong>Backend Connection Error:</strong> Ensure Flask backend is running at {API_BASE_URL}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
