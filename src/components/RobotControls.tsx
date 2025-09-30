import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";

interface RobotControlsProps {
  robotCount: number;
  onRobotCountChange: (count: number) => void;
  survivorCount: number;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onStopSimulation: () => void;
  isSimulating: boolean;
  isPaused: boolean;
  hasRobotPosition: boolean;
  disabled?: boolean;
}

export const RobotControls = ({
  robotCount,
  onRobotCountChange,
  survivorCount,
  onStartSimulation,
  onPauseSimulation,
  onStopSimulation,
  isSimulating,
  isPaused,
  hasRobotPosition,
  disabled
}: RobotControlsProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-mono font-semibold text-foreground">
          NUMBER OF ROBOTS
        </label>
        <Select 
          value={robotCount.toString()} 
          onValueChange={(val) => onRobotCountChange(parseInt(val))}
          disabled={disabled || isSimulating}
        >
          <SelectTrigger className="w-full bg-card border-border hover:border-primary/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} Robot{num > 1 ? 's' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-sm font-mono text-muted-foreground">Survivors Placed:</span>
          <span className="text-sm font-mono font-bold text-primary">{survivorCount} / 15</span>
        </div>
      </div>

      <div className="flex gap-2">
        {!isSimulating ? (
          <Button 
            onClick={onStartSimulation}
            disabled={!hasRobotPosition || disabled}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold"
          >
            <Play className="w-4 h-4 mr-2" />
            START SIMULATION
          </Button>
        ) : (
          <>
            <Button 
              onClick={onPauseSimulation}
              variant="secondary"
              className="flex-1 font-mono font-bold"
            >
              {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {isPaused ? 'RESUME' : 'PAUSE'}
            </Button>
            <Button 
              onClick={onStopSimulation}
              variant="destructive"
              className="flex-1 font-mono font-bold"
            >
              <Square className="w-4 h-4 mr-2" />
              STOP
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
