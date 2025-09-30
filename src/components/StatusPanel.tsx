import { Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface StatusPanelProps {
  status: 'idle' | 'loading' | 'ready' | 'simulating' | 'paused' | 'completed' | 'error';
  message?: string;
}

export const StatusPanel = ({ status, message }: StatusPanelProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: Clock,
          label: 'IDLE',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted'
        };
      case 'loading':
        return {
          icon: Activity,
          label: 'LOADING',
          color: 'text-info',
          bgColor: 'bg-info/20'
        };
      case 'ready':
        return {
          icon: CheckCircle,
          label: 'READY',
          color: 'text-success',
          bgColor: 'bg-success/20'
        };
      case 'simulating':
        return {
          icon: Activity,
          label: 'SIMULATING',
          color: 'text-primary',
          bgColor: 'bg-primary/20'
        };
      case 'paused':
        return {
          icon: AlertCircle,
          label: 'PAUSED',
          color: 'text-warning',
          bgColor: 'bg-warning/20'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'COMPLETED',
          color: 'text-success',
          bgColor: 'bg-success/20'
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'ERROR',
          color: 'text-destructive',
          bgColor: 'bg-destructive/20'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bgColor} border border-border`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${config.color} ${status === 'simulating' || status === 'loading' ? 'animate-pulse' : ''}`} />
        <div className="flex-1">
          <div className={`font-mono font-bold ${config.color}`}>{config.label}</div>
          {message && <div className="text-sm text-muted-foreground mt-1">{message}</div>}
        </div>
      </div>
    </div>
  );
};
