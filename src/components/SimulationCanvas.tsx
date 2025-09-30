import { useEffect, useRef, useState } from "react";
import { Target, Users } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

interface SimulationCanvasProps {
  mapUrl: string | null;
  robotPosition: Position | null;
  onRobotPositionSet: (pos: Position) => void;
  survivors: Position[];
  onSurvivorAdd: (pos: Position) => void;
  onSurvivorRemove: (index: number) => void;
  simulationFrame: string | null;
  isSimulating: boolean;
  disabled?: boolean;
}

export const SimulationCanvas = ({
  mapUrl,
  robotPosition,
  onRobotPositionSet,
  survivors,
  onSurvivorAdd,
  onSurvivorRemove,
  simulationFrame,
  isSimulating,
  disabled
}: SimulationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'robot' | 'survivor'>('robot');

  useEffect(() => {
    if (mapUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setMapImage(img);
      img.src = mapUrl;
    }
  }, [mapUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isSimulating && simulationFrame) {
      // Display simulation frame
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = simulationFrame;
    } else if (mapImage) {
      // Display map with markers
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

      // Draw robot position
      if (robotPosition) {
        ctx.fillStyle = '#00d9ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(robotPosition.x, robotPosition.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Robot label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('R', robotPosition.x - 5, robotPosition.y + 5);
      }

      // Draw survivors
      survivors.forEach((survivor, index) => {
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(survivor.x, survivor.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Survivor label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('S', survivor.x - 4, survivor.y + 4);
      });
    }
  }, [mapImage, robotPosition, survivors, simulationFrame, isSimulating]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || isSimulating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (mode === 'robot' && !robotPosition) {
      onRobotPositionSet({ x, y });
      setMode('survivor');
    } else if (mode === 'survivor' && survivors.length < 15) {
      onSurvivorAdd({ x, y });
    }
  };

  const handleSurvivorClick = (index: number) => {
    if (!isSimulating) {
      onSurvivorRemove(index);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('robot')}
          disabled={!!robotPosition || disabled || isSimulating}
          className={`flex-1 p-2 rounded-md font-mono text-sm font-semibold transition-all ${
            mode === 'robot' && !robotPosition
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          SET ROBOT START
        </button>
        <button
          onClick={() => setMode('survivor')}
          disabled={!robotPosition || disabled || isSimulating || survivors.length >= 15}
          className={`flex-1 p-2 rounded-md font-mono text-sm font-semibold transition-all ${
            mode === 'survivor' && robotPosition
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          PLACE SURVIVORS
        </button>
      </div>

      <div className="relative border-2 border-border rounded-lg overflow-hidden bg-card">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          className={`w-full h-auto ${
            !disabled && !isSimulating && mapImage ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />
        {!mapUrl && !isSimulating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground font-mono">Select a map to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};
